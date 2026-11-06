/* engine/voyage/shortrun.js: a scripted first voyage ("The Short Run"): one clear job, a deadline, a paced run of beats
   (calm, glass falls, a squall and a choice, haze that hides the land, relief) and a verdict at the end. Logic only.
   Beats are placed by progress along the leg (not by clock time) so they land the same at any game speed.
   State on `s`: s.sr = {on, stage, t0, deadline, total, choice, hints, rig0, hull0, purse0, peakStrain, squallHit, hazeOn}
   Uses: s.t, s.ship, s.v.to, s.mode ("trial" = Casual, true position shown; "lost" = Captain), s.nextSquall, s.squall, s.strain,
   s.cargo, s.purse, s.crew, s.docked, s.done.
   The game describes its world through SRG hooks: pos(k) -> {x,y} of a place, cargoUnits(g, tons) -> barrels etc,
   goodCost(g) -> unit cost in purse units, shillings -> purse units per pound.
   Events (the game words and draws them): EV.emit("sr", kind, ...)
     "hint", id          a Casual-only nudge: "steer" "log" "wind" "fix" "land"
     "glass"             the glass is falling; a squall is coming
     "decide"            the choice is due: the game shows the card and calls srChoose(s,"reef"|"press")
     "chose", choice     the choice was made
     "squallPast"        the squall has gone through
     "haze", on          low visibility begins (true) or lifts (false)
   Knobs: SRK. */
const SRG={};
const SRK={good:"flour",tons:6,reward:60,earlyBonus:20,earlyHours:3,lateCutPerHour:6,minReward:20,
  deadlineHours:29,glassAt:.25,hazeAt:.5,hazeEnd:.8,squallLead:.55,casualSquall:.75,hazeNm:1.2};
const SR_HINTS={steer:"Weigh anchor, then set your heading to the red mark on the compass: Castries lies west-northwest.",
  log:"Heave the log now and then: speed and heading are how you know where you are.",
  wind:"Keep the wind behind you. The arrow shows where it blows from.",
  fix:"The land is hidden. Reckon your position from the log and your course, then plot a fix.",
  land:"Land ahead. Look for the peaks and take a bearing."};
function srStart(s){
  const a=SRG.pos(s.v.from),b=SRG.pos(s.v.to);
  s.sr={on:true,stage:0,t0:s.t,deadline:s.t+SRK.deadlineHours,total:Math.hypot(a.x-b.x,a.y-b.y),choice:null,hints:{},
    rig0:s.ship.rig,hull0:s.hull,purse0:s.purse,peakStrain:0,squallHit:false,hazeOn:false,dist0:s.distance||0};
  s.nextSquall=s.t+1e6; // the one squall is ours, placed by the script
  s.cargo=s.cargo||{};const n=SRG.cargoUnits(SRK.good,SRK.tons);
  s.cargo[SRK.good]={n,cost:n*SRG.goodCost(SRK.good)};
  return s.sr;
}
function srProgress(s){const r=s.sr,b=SRG.pos(s.v.to);if(!r||!r.total)return 0;return clamp(1-Math.hypot(b.x-s.ship.x,b.y-s.ship.y)/r.total,0,1);}
function srHint(s,id){const r=s.sr;if(r.hints[id]||s.mode!=="trial")return;r.hints[id]=1;EV.emit("sr","hint",id,SR_HINTS[id]);}
function srStep(s){
  const r=s.sr;if(!r||!r.on||s.done)return;
  const p=srProgress(s);
  if(!s.docked)srHint(s,"steer");
  if(p>.06)srHint(s,"wind");
  if(p>.1)srHint(s,"log");
  if(r.stage===0&&p>=SRK.glassAt){r.stage=1;s.nextSquall=s.t+SRK.squallLead;s.squallWarned=false;EV.emit("sr","glass");}
  else if(r.stage===1&&s.t>=s.nextSquall-.3){r.stage=2;EV.emit("sr","decide");}
  else if(r.stage===3){
    if(s.squall){if(!r.squallHit){r.squallHit=true;if(s.mode==="trial")s.squall.boost*=SRK.casualSquall;}r.peakStrain=Math.max(r.peakStrain,s.strain||0);}
    else if(r.squallHit){r.stage=4;s.nextSquall=s.t+1e6;EV.emit("sr","squallPast");}
  }
  else if(r.stage===4&&p>=SRK.hazeAt){r.stage=5;r.hazeOn=true;EV.emit("sr","haze",true);srHint(s,"fix");}
  else if(r.stage===5&&p>=SRK.hazeEnd){r.stage=6;r.hazeOn=false;EV.emit("sr","haze",false);srHint(s,"land");}
}
function srChoose(s,c){const r=s.sr;if(!r||r.stage!==2)return;r.choice=c;r.stage=3;EV.emit("sr","chose",c);}
function srMood(s){const v=(s.crew||[]).filter(m=>typeof m.mo==="number").map(m=>m.mo);if(!v.length)return"steady";const a=v.reduce((x,y)=>x+y,0)/v.length;return a>.66?"high":a>.4?"steady":"low";}
/* Called once on arrival: pays the freight, takes the cargo off and returns the verdict {grade,text,causes[],rows[[label,value]],late,reward,minutes} */
function srSettle(s){
  const r=s.sr;if(!r)return null;r.on=false;
  const hrs=s.t-r.t0,late=s.t-r.deadline,earlyH=-late;
  let reward=SRK.reward;
  if(earlyH>=SRK.earlyHours)reward+=SRK.earlyBonus;else if(late>0)reward=Math.max(SRK.minReward,reward-Math.ceil(late)*SRK.lateCutPerHour);
  const held=s.cargo&&s.cargo[SRK.good],cost=held?held.cost:0;
  if(held)delete s.cargo[SRK.good];
  s.purse+=reward*SRG.shillings;
  const rigLoss=Math.max(0,Math.round((r.rig0-s.ship.rig)*100)),hullLoss=Math.max(0,Math.round(((r.hull0||1)-s.hull)*100));
  const grade=earlyH>=SRK.earlyHours?"Smartly done":late<=0?"A fair passage":late<3?"A little late":"Late: Mr Haskell frowns";
  const causes=[];
  if(r.choice==="reef")causes.push(rigLoss<=2?"You shortened sail before the squall: slower, but the rigging came through whole.":`You shortened sail before the squall, yet the rigging lost ${rigLoss}%.`);
  else if(r.choice==="press")causes.push(rigLoss>2?`You pressed on into the squall and the rigging lost ${rigLoss}%: that is what the groaning topmasts were about.`:"You pressed on into the squall and got away with it, this time.");
  else causes.push("The squall never found you.");
  if(r.hazeOn||r.stage>=5)causes.push(s.mode==="lost"?"The haze hid the land; your landfall depended on your reckoning.":"The haze hid the land for a while, but the chart showed your true position.");
  if(late>0)causes.push(`You were ${late<1?Math.round(late*60)+" minutes":late.toFixed(1)+" hours"} past the tide, so the freight was cut.`);
  const rows=[["Time at sea",`${Math.floor(hrs)} h ${Math.round((hrs%1)*60)} min`],["Freight paid",`£${reward}`],["Cargo cost",`£${Math.round(cost/SRG.shillings)}`],["Rigging lost",`${rigLoss}%`],["Hull damage",`${hullLoss}%`],["Crew spirits",srMood(s)],["Mode",s.mode==="lost"?"Captain (reckoning only)":"Casual (true position shown)"]];
  return{grade,text:"Mr Haskell counts the barrels and the minutes.",causes,rows,late,reward,minutes:Math.round(hrs*60)};
}
