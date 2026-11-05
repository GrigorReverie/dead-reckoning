/* engine/weather/weather.js: weather systems, sea state, cloud, rain, squalls and the barometer. Logic only.
   genWx(s,x,y)     draws the schedule of systems for the next ~400 h into s.wx (uses rng) and starts the sea from the wind at x,y
   wxStep(s,dt,w)   advances s.wx by dt hours given the wind w where the player is: wind-sea, swell, rain, lightning, cloud
   squallStep(s)    starts and ends squalls on the schedule s.nextSquall (s.squall is read by windAt)
   pressureAt(s,t)  barometer in hPa: daily tide in the air plus a fall ahead of each system
   It reads FIELD.localHour, FIELD.hold() and FIELD.day(s) ({overcast, cl}: the day's base cloud) from field/wind.js.
   Events (the game words them): EV.emit("wx", kind, e) with kind
     "wave1" "wave2" "wave3" / "front1" "front2" "front3"  a system is near (glass falls), arrives, passes
     "surge" "lull"   the trade freshens or dies away;   "squallNear"  a squall is about 18 minutes off
     "shift"          the wind has moved 14 degrees or more since the last note: e = {dd (+ veered, - backed), from}
   Knobs: WXK. */
const WXK={swellDir:70,swellAmp:.25,frontSwellDir:335,shiftNote:14};
function genWx(s,x,y){
  const ev=[],T=s.t;
  for(let k=T+1.5+rng()*3;k<T+400;k+=3+rng()*5){const lull=rng()<.4;ev.push({type:lull?"lull":"surge",t0:k,dur:2.5+rng()*4,a:lull?5+rng()*3:3+rng()*2.5,sh:(rng()<.5?-1:1)*(4+rng()*5),lead:1.2,depth:lull?-.8:0});}
  for(let k=T+6+rng()*8;k<T+400;k+=14+rng()*10)ev.push({type:"wave",t0:k,dur:6+rng()*4,a:4+rng()*2.5,lead:5,depth:3.5});
  for(let k=T+11+rng()*10;k<T+400;k+=30+rng()*20)ev.push({type:"front",t0:k,dur:20+rng()*10,a:5+rng()*3,lead:9,depth:8,swell:1.6+rng()*1.4});
  s.wx={ev,sea:{dir:WIND_BASE.from,amp:.3,swF:WXK.swellDir,swA:WXK.swellAmp},rain:0,flash:0,bolt:.5,H:1,last:null,note:{}};
  const w=windAt(s,x,y,T);s.wx.sea.dir=w.from;s.wx.sea.amp=.05+.0035*Math.pow(w.kn,1.6);s.wx.last=w.from;
}
function pressureAt(s,t){const lh=FIELD.localHour(s,t);let p=1015+1.1*Math.cos(2*PI*(lh-10)/12);
  for(const e of s.wx.ev){if(!e.depth)continue;const L=e.lead,v=(t-(e.t0-L))/(L+e.dur*1.3);if(v>0&&v<1)p-=e.depth*Math.pow(Math.sin(PI*v),2);}
  const q=s.squall;if(q){const v=(s.t-(q.t0-1.5))/(1.5+q.dur+.5);if(v>0&&v<1)p-=1.5*Math.pow(Math.sin(PI*v),2);}return p;}
function squallStep(s){
  if(!s.squall&&s.t>s.nextSquall-.3&&!s.squallWarned){s.squallWarned=true;EV.emit("wx","squallNear");}
  if(!s.squall&&s.t>=s.nextSquall){s.squall={t0:s.t,dur:.4+rng()*.5,boost:10+rng()*7,shift:(rng()<.5?-1:1)*(10+rng()*20)};}
  if(s.squall&&s.t>s.squall.t0+s.squall.dur){s.squall=null;s.squallWarned=false;s.nextSquall=s.t+5+rng()*8;}}
function wxStep(s,dt,w){const X=s.wx,t=s.t;if(!X)return;const HOLD=FIELD.hold()||{};
  // seas build and die slowly, and the wind-sea lags a shifting wind: the two can cross
  const tgt=.004467*Math.pow(w.kn,1.6);X.sea.amp+=(tgt-X.sea.amp)*(1-Math.exp(-dt/1.4));X.sea.dir=norm(X.sea.dir+angDiff(X.sea.dir,w.from)*(1-Math.exp(-dt/2.2)));
  // swell: a steady ground swell from the prevailing quarter, with a long swell from behind each front ahead of and after it
  let fx=WXK.swellAmp*Math.sin(WXK.swellDir*D2R),fy=WXK.swellAmp*Math.cos(WXK.swellDir*D2R);
  for(const e of X.ev){if(e.type!=="front")continue;const tc=e.t0+.3*e.dur,wd=e.dur*.7,h=e.swell*Math.exp(-Math.pow((t-tc)/wd,2))*.24;if(h>.003){fx+=h*Math.sin(WXK.frontSwellDir*D2R);fy+=h*Math.cos(WXK.frontSwellDir*D2R);}}
  X.sea.swA=Math.hypot(fx,fy);X.sea.swF=norm(Math.atan2(fx,fy)/D2R);
  if(HOLD.sea){X.sea.amp=HOLD.sea.wind/3.75;X.sea.swA=HOLD.sea.swell/3.6;if(HOLD.sea.swDir!=null)X.sea.swF=HOLD.sea.swDir;}
  const Hw=3.75*X.sea.amp,Hs=3.6*X.sea.swA;X.H=Math.hypot(Hw,Hs);
  // rain from systems and squalls
  let rain=0;for(const e of X.ev){const u=(t-e.t0)/e.dur;if(u<0||u>1)continue;
    if(e.type==="wave")rain=Math.max(rain,.8*Math.pow(Math.sin(PI*u),2)*(.65+.35*Math.sin(t*9)));
    else if(e.type==="front"&&u>.25&&u<.75)rain=Math.max(rain,.6*Math.sin(PI*(u-.25)/.5));}
  X.rain=HOLD.wx?HOLD.wx.rain:rain;rain=X.rain;const sqv=s.squall&&t>=s.squall.t0&&t<=s.squall.t0+s.squall.dur?Math.sin(PI*(t-s.squall.t0)/s.squall.dur):0;
  if(Math.max(rain,sqv)>.5&&rng()<dt*3600*.012*(Math.max(rain,sqv)-.4)){X.flash=1;X.bolt=.15+rng()*.7;}
  // cloud cover: clear skies on a fine day, fair-weather cumulus, and a pall of dark cloud ahead of and during rain
  { const info=FIELD.day(s);let c=info.overcast?.8:info.cl;
    for(const e of X.ev){if(e.type==="wave"||e.type==="front"){const v=(t-(e.t0-e.lead))/(e.lead+e.dur*1.15);if(v>0&&v<1)c+=.8*Math.pow(Math.sin(PI*v),.5);}
      else if(e.type==="lull"||e.type==="surge"){const u=(t-e.t0)/e.dur;if(u>0&&u<1)c+=(e.type==="lull"?.15:-.1)*Math.sin(PI*u);}}
    const q=s.squall;if(q){const v=(t-(q.t0-.7))/(.7+q.dur+.3);if(v>0&&v<1)c+=.85*Math.pow(Math.sin(PI*v),.6);}
    if(HOLD.wx)c=HOLD.wx.cover;c=clamp(Math.max(c,X.rain*1.05),0,1);if(X.cover==null)X.cover=c;X.cover+=(c-X.cover)*(1-Math.exp(-dt/.4));
    X.dark=clamp((X.cover-.5)/.45*1.1+X.rain*.6,0,1); }
  // warnings: the glass first, then the weather itself
  for(const e of X.ev){const u=(t-e.t0)/e.dur;
    if(e.type==="wave"||e.type==="front"){
      if(!e.w1&&t>=e.t0-e.lead*.7&&u<1){e.w1=1;EV.emit("wx",e.type+"1",e);}
      if(!e.w2&&u>=0&&u<1){e.w2=1;EV.emit("wx",e.type+"2",e);}
      if(!e.w3&&u>=(e.type==="front"?.6:.55)&&u<1){e.w3=1;EV.emit("wx",e.type+"3",e);}}
    else if(!e.w2&&u>=0&&u<1){e.w2=1;EV.emit("wx",e.type,e);}}
  // a note whenever the wind has moved a good way round
  if(X.last==null)X.last=w.from;const dd=angDiff(X.last,w.from);
  if(Math.abs(dd)>=WXK.shiftNote){EV.emit("wx","shift",{dd,from:w.from});X.last=w.from;}}
