/* engine/field/wind.js: the wind at any point and time. Logic only: no screen, no game names.
   windAt(s,x,y,t,alt) -> {from (degrees the wind blows from), kn, lee, pass, breeze}
     s   world state: the weather systems (s.wx.ev, s.wx.cover) and any squall (s.squall) passing over
     x,y position in nautical miles on the game's flat chart; t time in hours
     alt optional height above the surface in metres (a ship leaves it out = at the water)
   The game describes its world through FIELD hooks:
     FIELD.localHour(s,t)  local solar hour (any range; it is wrapped to 0..24)
     FIELD.land()          {I:[land masses {c:{x,y},r,hf (height factor ~ peak/1000 m),h (peak m),name}], P:[passages from passage()]}
     FIELD.hold()          held values from a test menu ({wind:{dir,kn}, sea:{wind,swell,swDir}, wx:{cover,rain}}), or {} for none
   Knobs: WINDK (land and thermal effects, 1 = realistic) and WIND_BASE (the prevailing wind). */
const FIELD={localHour:(s,t)=>t,land:()=>({I:[],P:[]}),hold:()=>({}),day:()=>({overcast:false,cl:.3})};
const WINDK={block:1,venturi:1,shadow:1,shadowLen:1,seaBreeze:1,landBreeze:1,thermal:1,diurnal:1};
// prevailing wind: mean direction and strength, the speed above which gales are eased (cap, capK), the lightest air, and
// the height profile for a craft above the surface (Hellmann exponent shear over a reference height zRef metres)
const WIND_BASE={from:82,kn:15,cap:24,capK:.3,min:1.5,zRef:10,shear:.11};
// a passage between two land masses A and B (centres c, radii r, height factors hf) of gap less than ~45 nm
function passage(A,B,others){const dx=B.c.x-A.c.x,dy=B.c.y-A.c.y,d=Math.hypot(dx,dy),gap=d-A.r-B.r;
  if(gap<3||gap>45)return null;
  for(const C of others||[]){if(C===A||C===B)continue;const u=((C.c.x-A.c.x)*dx+(C.c.y-A.c.y)*dy)/(d*d);if(u>0&&u<1&&Math.abs((C.c.x-A.c.x)*dy-(C.c.y-A.c.y)*dx)/d<C.r+2)return null;}
  return{A,B,ux:dx/d,uy:dy/d,d,gap,hf:Math.min(1.2,(A.hf+B.hf)/2+.2),nar:clamp((50-gap)/40,0,1)};}
// where a point lies in a passage: k is 1 mid-channel, falling to 0 at the ends and the sides
function passK(P,x,y){const wx=x-P.A.c.x,wy=y-P.A.c.y,al=wx*P.ux+wy*P.uy,lat=Math.abs(wx*P.uy-wy*P.ux),tt=(al-P.A.r)/P.gap;
  if(tt<-.15||tt>1.15)return 0;return Math.sin(PI*clamp(tt*.8+.1,0,1))*clamp(1-lat/(P.gap*.5+6),0,1);}
// how much hotter the land is than the sea: from mid-morning to a peak mid-afternoon (sea breeze), and cooler at night to a low before dawn (land breeze); cloud cuts both
function landHeat(s,lh){const c=s.wx&&s.wx.cover!=null?s.wx.cover:.3,u=((lh-21+24)%24)/10;
  return{sea:(lh>8.5&&lh<18.5?Math.sin(PI*(lh-8.5)/10):0)*(1-.6*c),land:(u<1?Math.sin(PI*Math.pow(u,1.8)):0)*(1-.5*c)};}
function windAt(s,x,y,t,alt){
  const sn=Math.sin,B=WIND_BASE,HOLD=FIELD.hold()||{};
  let from=B.from+14*sn(t/9+x/120)+8*sn(t/3.7+y/80+1.3);
  let kn=B.kn+3.5*sn(t/11+y/150)+2.5*sn(t/4.3+x/90+2);
  // over the open sea the trade is a little fresher in the early afternoon, when the day's stirring brings the stronger wind aloft down to the water, and easiest before dawn
  const lh=((FIELD.localHour(s,t)%24)+24)%24;kn+=WINDK.diurnal*(-1.1*Math.cos(2*PI*(lh-14)/24)-.3);
  const q=s.squall;
  if(q&&t>=q.t0&&t<=q.t0+q.dur){const ph=sn(PI*(t-q.t0)/q.dur);kn+=q.boost*ph;from+=q.shift*ph;}
  // weather systems passing over: trade surges and lulls, tropical waves, cold fronts
  if(s.wx)for(const e of s.wx.ev){const u=(t-e.t0)/e.dur;if(u<0||u>1)continue;const b=sn(PI*u);
    if(e.type==="surge"){kn+=e.a*b;from+=e.sh*b;}
    else if(e.type==="lull"){kn-=e.a*b;from+=e.sh*b;}
    else if(e.type==="wave"){kn+=e.a*Math.pow(b,1.4);from+=-28*sn(2*PI*u);}
    else if(e.type==="front"){kn+=e.a*Math.pow(b,.8);from+=u<.45?-25*sn(PI*u/.45):30*sn(PI*(u-.45)/.55);}}
  if(HOLD.wind){from=HOLD.wind.dir;kn=HOLD.wind.kn;} // a held base wind: the land still bends it
  // the land: the wind piles up and splits on the windward coast, quickens round the points and through the passages, falls light and fickle in a long shadow
  // behind the high land, and the sun drives a sea breeze onto every coast by day and a land breeze off it at night; afternoon heat over the hills adds gusts.
  // Above the surface (alt) the land's blocking and shadow fade out as the craft climbs toward the height of the peaks.
  let lee=null,pass=null,gm=1+.15*WINDK.thermal*Math.max(0,Math.cos(2*PI*(lh-4)/24)); // open-sea showers and gusts are worst before dawn
  const L=FIELD.land(),H=landHeat(s,lh),tw=(from+180)*D2R,dx=sn(tw),dy=Math.cos(tw),px=dy,py=-dx;let f=1,turn=0,bx=0,by=0,wob=0;
  for(const I of L.I){const rx=x-I.c.x,ry=y-I.c.y,d=Math.hypot(rx,ry),hf=I.hf,mh=Math.min(1,hf),Ls=(10+30*hf)*WINDK.shadowLen;
    if(d>I.r*1.3+Ls+12)continue;
    const a=rx*dx+ry*dy,l=rx*px+ry*py,side=Math.sign(l||1),ak=alt>0?clamp(1-alt/(I.h||hf*1000),0,1):1;
    if(a<0){let k=clamp(1-Math.abs(l)/(I.r*1.2+1),0,1)*clamp(1-Math.max(0,-a-I.r)/(3+6*hf),0,1);if(alt>0)k*=ak;
      if(k>0){f*=1-.2*mh*k*WINDK.block;turn+=side*22*mh*k*WINDK.block;}}
    if(a>0&&a<I.r+Ls){const wid=I.r*1.3+2+a*.12;let k=1-clamp(Math.abs(l)/wid,0,1);if(alt>0)k*=ak;
      if(k>0){const fr=clamp((a-I.r*.5)/(Ls+I.r*.5),0,1),dep=clamp(.78*Math.min(1,hf+.15)*WINDK.shadow,0,.95)*k*Math.pow(1-fr,1.3);
        f*=1-dep;turn+=-side*14*k*(1-fr);wob+=dep;gm+=1.3*WINDK.thermal*k*(1-fr)*H.sea*mh;if(dep>.22)lee=I.name;}}
    if(a>-I.r*.6&&a<I.r+10){const sd=Math.abs(l)/(I.r+4);if(sd>.9&&sd<2.2)f*=1+.22*Math.min(1,hf+.3)*WINDK.venturi*sn(PI*clamp((sd-.9)/1.3,0,1));}
    const e=d-I.r*.9,ns=d>.01?1/d:0;
    if(e<I.r+14){const sb=WINDK.seaBreeze*H.sea*(3+3*Math.min(1,I.r/8))*(.7+.3*mh),reach=4+I.r*.9,lb=WINDK.landBreeze*H.land*(1.2+1.6*mh),lr=2+I.r*.3;
      const g=-sb*clamp(1-e/reach,0,1)+lb*clamp(1-e/lr,0,1);bx+=g*rx*ns;by+=g*ry*ns;gm+=.5*WINDK.thermal*H.sea*mh*clamp(1-e/(I.r+8),0,1);}}
  for(const P of L.P){const k=passK(P,x,y);if(!k)continue;const cr=Math.abs(dx*P.uy-dy*P.ux),g=k*P.nar*cr;if(g<.02)continue;
    f*=1+.22*WINDK.venturi*g*P.hf;const sg=Math.sign(dx*P.uy-dy*P.ux),nx=P.uy*sg,ny=-P.ux*sg,ang=Math.atan2(dx*ny-dy*nx,dx*nx+dy*ny)*R2D;turn+=-ang*.5*g*Math.min(1,WINDK.venturi);
    if(g>.35)pass=`${P.A.name} and ${P.B.name}`;}
  kn*=f;from+=turn+wob*35*sn(t*4.7+x/3+y/5);
  // gusts and flicker of direction, stronger in fresher wind, under the hills on a hot afternoon and in the small hours at sea
  kn*=1+.07*gm*(sn(t*47+x/18)+sn(t*31+y/14+1))*Math.min(1,kn/15);from+=1.8*gm*sn(t*53+x/25);
  let breeze=null;
  if(bx||by){const t2=(from+180)*D2R,vx=kn*sn(t2)+bx,vy=kn*Math.cos(t2)+by;kn=Math.hypot(vx,vy);from=Math.atan2(vx,vy)/D2R+180;if(Math.hypot(bx,by)>2)breeze=H.sea>H.land?"sea breeze":"land breeze";}
  if(alt>0)kn*=Math.pow(Math.max(alt,B.zRef)/B.zRef,B.shear); // stronger wind aloft, out of the surface drag
  if(kn>B.cap&&!HOLD.wind)kn=B.cap+(kn-B.cap)*B.capK; // the worst of it is eased: strong gales are rare in these trades
  return{from:norm(from),kn:Math.max(B.min,kn),lee,pass,breeze};
}
