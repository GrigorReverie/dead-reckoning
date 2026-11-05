/* engine/nav/nav.js: dead reckoning, log readings, noon sight, bearings, cross-bearing fix, mark position.
   Logic only: the functions change the navigation state `s` and emit events for anything the player should be told.
   State used on `s`: est {x,y,sx,sy} (the reckoned position and its error), estSpeed, estTrack [{x,y}], lastLog {v,t,by},
   heaves, bearings [{lm,brg,t,time}], latLines, fixes, sights, lastFixT, t0, t, marks, mkIdx, noon {observing,readings,lastRead,doneDay}.
   Positions are plane miles (x east, y north); bearings are degrees. Uses the game's helpers norm, angDiff, D2R, R2D, gauss.
   Events: "navBearing" (b), "navNoon" (info), "navFix" (info), "navMark" (info), "refresh" (force). */
const MARK_SPEED_FRESH=5/60; // the log counts if it was hove within the last 5 game minutes

/* reckoning: ordered course + logged speed only; the error grows with time and speed. Call before s.t advances. */
function navReckon(s,ordered,dt){
  s.est.x+=s.estSpeed*Math.sin(ordered*D2R)*dt;s.est.y+=s.estSpeed*Math.cos(ordered*D2R)*dt;
  const g=(.06*s.estSpeed+.45)*dt;s.est.sx+=g;s.est.sy+=g;
}
/* extend the reckoned track once the estimate has moved far enough */
function navTrail(s){const le=s.estTrack[s.estTrack.length-1];if(Math.hypot(le.x-s.est.x,le.y-s.est.y)>.8)s.estTrack.push({x:s.est.x,y:s.est.y});}
/* a log reading (knots) becomes the speed the reckoning uses */
function navLogReading(s,knots,by){s.estSpeed=knots;s.lastLog={v:knots,t:s.t,by:by||"you"};s.heaves++;}

/* take a bearing on a landmark {x,y}; spread*typeK is the noise in degrees (one standard deviation) */
function navBearing(s,from,lm,spread,typeK){
  const tb=norm(Math.atan2(lm.x-from.x,lm.y-from.y)*R2D);const brg=norm(tb+gauss()*spread*typeK);
  const b={lm,brg,t:s.t,time:null};s.bearings.push(b);
  EV.emit("navBearing",b);
  return b;
}

/* two bearings on different landmarks, 25 to 155 degrees apart and taken within 45 minutes, cross at a fix */
function navCrossFix(s){
  const b=s.bearings;if(b.length<2)return null;
  for(let i=b.length-1;i>0;i--)for(let j=i-1;j>=0;j--){
    const a=b[i],c=b[j];if(a.t-c.t>.75)break;if(a.lm===c.lm)continue;
    const cut=Math.abs(angDiff(a.brg,c.brg));if(cut<25||cut>155)continue;
    // line from landmark back toward ship: P = L + s*d, d = dir(brg+180)
    const d1={x:Math.sin((a.brg+180)*D2R),y:Math.cos((a.brg+180)*D2R)},d2={x:Math.sin((c.brg+180)*D2R),y:Math.cos((c.brg+180)*D2R)};
    const den=d1.x*d2.y-d1.y*d2.x;if(Math.abs(den)<1e-6)continue;
    const dx=c.lm.x-a.lm.x,dy=c.lm.y-a.lm.y;const s1=(dx*d2.y-dy*d2.x)/den;
    if(s1<0)continue;
    return{x:a.lm.x+s1*d1.x,y:a.lm.y+s1*d1.y,a,c};
  }
  return null;
}
/* put the reckoning on the cross fix f (from navCrossFix) */
function navPlotFix(s,f){
  const hrs=s.t-(s.lastFixT===undefined?s.t0:s.lastFixT),mx=f.x-s.est.x,my=f.y-s.est.y,mm=Math.hypot(mx,my);s.lastFixT=s.t;
  s.est.x=f.x;s.est.y=f.y;s.est.sx=s.est.sy=1.2;s.estTrack.push({x:f.x,y:f.y});s.fixes++;s.bearings=s.bearings.filter(b=>b.t>s.t-.75&&b!==f.a&&b!==f.c);
  EV.emit("navFix",{x:f.x,y:f.y,hrs,mx,my,mm});
  EV.emit("refresh",true);
}

/* noon sight: the sun's greatest altitude gives latitude. o = {decl (sun declination, deg), lat0 (latitude of y=0),
   trueLat (the ship's real latitude, for the report), day, time, lost (reckoning-only mode)} */
function navNoonSight(s,o){
  const n=s.noon;if(!n.observing||n.readings.length<3)return;
  n.observing=false;n.doneDay=o.day;s.sights++;
  const max=Math.max(...n.readings);
  const lat=90-max+o.decl; // sun to the south of the ship
  const last=n.readings.slice(-6);const stillRising=last.length>3&&last[last.length-1]>last[0]+.02;
  const y=(lat-o.lat0)*60;
  s.latLines.push({y,lat,time:o.time});
  if(o.lost){s.est.y=y;s.est.sy=1.5;}
  else{s.est.y=y;}
  s.estTrack.push({x:s.est.x,y:s.est.y});
  EV.emit("navNoon",{max,lat,stillRising,trueLat:o.trueLat});
  EV.emit("refresh");
}

/* mark position: every bearing taken plus the speed from the last 5 minutes, solved by least squares.
   Returns false when there is nothing to mark from. o = {time} */
function navMarkPosition(s,o){
  if(!s.marks){const e=s.estTrack[0]||s.est;s.marks=[{x:e.x,y:e.y,t:s.t0,q:"Start",r:0}];s.mkIdx=0;}
  const B=s.bearings;if(!B.length){EV.emit("navMark",null);return false;}
  const fresh=!!(s.lastLog&&s.t-s.lastLog.t<=MARK_SPEED_FRESH);
  // each bearing is a line the ship lies on; the speed-fed reckoning is a weak pull toward where it thinks she is (stronger when the log is fresh)
  const wp=fresh?1/2.25:1/36;let a=wp,b=0,c=wp,e=wp*s.est.x,f=wp*s.est.y;
  for(const q of B){const r=q.brg*D2R,nx=Math.cos(r),ny=-Math.sin(r),d=nx*q.lm.x+ny*q.lm.y,sg=Math.max(.4,Math.hypot(q.lm.x-s.est.x,q.lm.y-s.est.y)*.02),w=1/(sg*sg);
    a+=w*nx*nx;b+=w*nx*ny;c+=w*ny*ny;e+=w*nx*d;f+=w*ny*d;}
  const det=a*c-b*b,x=(c*e-b*f)/det,y=(a*f-b*e)/det,sx=Math.max(.15,Math.sqrt(c/det)),sy=Math.max(.15,Math.sqrt(a/det));
  // quality: how well the lines cross (best near 90 degrees) and whether the speed is fresh
  let sn=0,lines=0;const lms=[...new Set(B.map(q=>q.lm))];
  for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++)if(B[i].lm!==B[j].lm)sn=Math.max(sn,Math.abs(Math.sin(angDiff(B[i].brg,B[j].brg)*D2R)));
  lines=lms.length>=2&&sn>.25?1:0;
  const score=(lines?2+2*sn:0)+(fresh?1:0),tier=score<1?"Poor":score<2?"Fair":score<3.5?"Good":score<4.8?"Very good":"Excellent";
  // the path since the last mark is bent to end on the new dot, so a good fix repairs the drift of the earlier leg
  const i0=Math.min(s.mkIdx||0,s.estTrack.length-1),leg=s.estTrack.slice(i0);leg.push({x:s.est.x,y:s.est.y});
  const ox=x-s.est.x,oy=y-s.est.y;let tot=0;const cum=[0];for(let i=1;i<leg.length;i++){tot+=Math.hypot(leg[i].x-leg[i-1].x,leg[i].y-leg[i-1].y);cum.push(tot);}
  const bent=leg.map((p,i)=>{const k=tot>0?cum[i]/tot:(i?1:0);return{x:p.x+ox*k,y:p.y+oy*k};});
  s.estTrack=s.estTrack.slice(0,i0).concat(bent);s.mkIdx=s.estTrack.length-1;
  const off=Math.hypot(ox,oy),dir=norm(Math.atan2(ox,oy)*R2D);
  s.est.x=x;s.est.y=y;s.est.sx=sx;s.est.sy=sy;s.lastFixT=s.t;if(lines)s.fixes++;
  s.marks.push({x,y,t:s.t,q:tier,r:Math.max(sx,sy),time:o.time,n:B.length,speed:fresh});
  const nb=B.length;s.bearings=[];
  EV.emit("navMark",{x,y,sx,sy,tier,fresh,lines,nb,off,dir});
  return true;
}
