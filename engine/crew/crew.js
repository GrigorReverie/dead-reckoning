/* engine/crew/crew.js: the crew: roster, skill, morale and health, watches and fatigue, rations, hiring and paying off,
   discipline and crisis moments. Logic only: the functions change `s.crew` and `s.stores` and emit events for the screen.
   State used on `s`: crew [{n,r,w,b,f,mode,ov,mo,sk,hp,scv,fev,sus,tr,sick,why,med,fr,rv,cow,maim}], stores {bis,meat,fish,beer,lime,rum,med},
   ration, t, wx, squall, crisis, purse, hired, eff, fat, helmN, helmF and a few timers (noFresh, rumT, leaveT, strikeUntil, mutH, crNext).
   The game describes its world and data through the CREWG hooks, set next to its roster data:
     localHours(s,t), dayIndex(s), atPort(s) -> {k,name}|null, modalOpen(), skipping(), money(sh), maxCrew(), minCrew(), effN(),
     role(r) -> {r,s,day}, dutyRate {role:rate}, berths [{q,...}], berthOwner(id), watchNames [4], names {first[16],last[20]}.
   Events: "crewRemoved" (man, index), "crewHired" (man), "crewBill" (the watch bill changed), "crisis" (card), "say" notices. */
const CREWG={};
const WB=[0,4,8,12,16,18,20,24]; // watch boundaries: four-hour watches, the two dog watches (16-18, 18-20) are two hours each

/* ---- the roster: a game gives named hands, seamen, berth order and doctors ---- */
function crewMake(sp){const C=[];sp.named.forEach(([n,r,w])=>C.push({n,r,w}));sp.seamen.forEach((n,i)=>C.push({n,r:"Seaman",w:i%3}));
  const bs=sp.berthOrder;C.forEach((m,i)=>{m.b=bs[i];m.f=.05+Math.random()*.2;m.mode=undefined;m.ov=null;});
  for(const d of sp.doctors)C.push({n:d.n,r:d.r,w:3,b:d.b,f:.1,mode:undefined,ov:null,med:d.med,sk:d.sk});return C;}

/* ---- watches ---- */
function watchInfo(s){const lh=((CREWG.localHours(s,s.t)%24)+24)%24;let i=0;while(i<6&&lh>=WB[i+1])i++;return{lh,i,w:(CREWG.dayIndex(s)*7+i)%3,left:WB[i+1]-lh,key:CREWG.dayIndex(s)*7+i};}
function isDuty(m,wi,all){if(m.sick)return false;if(S&&S.strikeUntil>S.t&&m.r!=="Captain"&&m.r!=="Mate"&&m.r!=="Bosun")return false;if(m.ov==="on")return true;if(m.ov==="off"||m.w===4)return false;if(all)return true;if(m.w===3)return wi.lh>=6&&wi.lh<18;return m.w===wi.w;}
const effOfMan=m=>(1-.55*Math.pow(m.f,1.5))*(m.sk==null?1:(.75+.5*m.sk)*(.8+.3*m.mo)*(m.scv>.3?1-.4*(m.scv-.3):1))*(m.maim?.75:1); // fatigue, skill, spirits and scurvy
/* ---- crew life: morale, skill and health ---- */
const SKILL0={Captain:.7,Mate:.6,Bosun:.65,Carpenter:.5,Cook:.5,"Cabin boy":.15};
const TRAITS={steady:"steady",drinker:"fond of the bottle",troublemaker:"a troublemaker",leader:"a born leader",timid:"timid aloft",hardy:"hardy"};
function pickTrait(r){if(r==='Captain'||r==='Mate')return'steady';if(r==='Bosun')return'leader';const x=Math.random();return x<.3?'steady':x<.45?'drinker':x<.58?'troublemaker':x<.68?'leader':x<.83?'timid':'hardy';}
function crewX(s){const C=s.crew,T=s.stores;if(!C)return;
  for(const m of C)if(m.tr===undefined)m.tr=pickTrait(m.r);
  if(!s.relDone&&C.length>10){s.relDone=true;const pool=C.filter(m=>m.r!=='Captain'&&m.r!=='Mate').sort(()=>Math.random()-.5);for(let i=0;i+1<pool.length&&i<10;i+=2){const a=pool[i],b=pool[i+1];if(i<6){a.fr=b.n;b.fr=a.n;}else{a.rv=b.n;b.rv=a.n;}}}
if(T.lime==null)T.lime=0;if(T.rum==null)T.rum=20;if(T.med==null)T.med=40;if(s.noFresh==null)s.noFresh=0;
  for(const m of C)if(m.mo==null){m.mo=.7;m.sk=SKILL0[m.r]??.25+Math.random()*.5;m.hp=1;m.scv=0;m.sus=.75+Math.random()*.5;m.sick=false;m.why="";}}
function issueRum(){if(!S||!S.crew)return;crewX(S);const T=S.stores,need=S.crew.length*.06;
  if(S.t-(S.rumT??-99)<8){say("The hands have had their tot already; the purser will not serve another so soon.",{log:false});return;}
  if(T.rum<need){say("There is not enough rum in the spirit room.",{log:false});return;}
  T.rum-=need;S.rumT=S.t;for(const m of S.crew)m.mo=Math.min(1,m.mo+(m.tr==="drinker"?.25:.12));say("The purser serves out a tot of rum to every hand. Spirits lift on deck.",{});EV.emit("crewBill");}
function medTeam(s){const ok=m=>m&&!m.sick&&m.hp>.5&&m.scv<.6&&!(m.fev>.3),sg=s.crew.find(m=>m.r==="Surgeon"&&ok(m)),mt=s.crew.find(m=>m.r==="Surgeon's mate"&&ok(m));
  return{sg,mt,q:clamp((sg?sg.med||.5:0)+(mt?(mt.med||.3)*.6:0),0,1.2),cap:(sg?4:0)+(mt?2:0)};}
function crewLife(s,dt,w,wi){const C=s.crew;if(!C.some(m=>m.r==="Surgeon")){const mt=C.find(m=>m.r==="Surgeon's mate");if(mt){mt.r="Surgeon";say(`${mt.n} takes the surgeon's place and the care of the sick.`,{});}}
  const T=s.stores,n=C.length,pt=CREWG.atPort(s),anch=s.ship.anch.mode==="holding",ashore=!!(pt&&anch);
  // fresh food: a daily issue of limes, or a stay in port
  if(ashore)s.noFresh=0;else if(T.lime>0){T.lime=Math.max(0,T.lime-n*.1*dt/24);s.noFresh=Math.max(0,s.noFresh-dt*3);if(T.lime<=0)say("The last of the limes is gone. There is no more juice against the scurvy.",{});}else s.noFresh+=dt;
  const trShip=clamp(.025*C.filter(m=>m.tr==='leader').length,0,.05)-clamp(.025*C.filter(m=>m.tr==='troublemaker'&&!(m.cow>s.t)).length,0,.075);
  const out_=[],prot=ashore||T.lime>0,nSick=C.filter(m=>m.sick).length,rough=clamp((w.kn-20)/12,0,1)+(s.squall?.4:0);let avg=0,best=null;
  const med=medTeam(s);let np=0;for(const m of C)if(m.sick||m.fev>0)np++;if(np&&med.q>0&&T.med>0)T.med=Math.max(0,T.med-np*dt*.02);
  if(np&&!med.q&&!s.noMedSaid){s.noMedSaid=true;say("There is no one aboard fit to tend the sick.",{});}else if(med.q>0)s.noMedSaid=false;
  for(const m of C){
    const eff=med.q*(T.med>0?1:.5)*Math.min(1,(med.cap||4)/Math.max(1,np)),ill=m.sick||m.fev>0;
    if(ashore&&!(m.fev>0)&&Math.random()<dt*.0012){m.fev=.35;say(`${m.n} comes down with a fever caught ashore.`,{});}
    if(m.fev>0){m.fev=Math.max(0,m.fev+dt*(.003-.0075*eff));if(m.fev>=1){if(Math.random()<.75){out_.push(m);m.fev=1;}else m.fev=.5;}}
    if(m.hp<.3&&!m.surgSeen){m.surgSeen=true;(s.medQueue=s.medQueue||[]).push(m.n);}else if(m.hp>.6)m.surgSeen=false;
    if(m.hp<.2&&!eff&&Math.random()<dt*.004)out_.push(m);
    if(ill&&eff>0)m.hp=Math.min(1,m.hp+dt*.02*eff);
    if(m.scv>0&&prot&&eff>0)m.scv=Math.max(0,m.scv-dt*.004*eff);
    if(prot)m.scv=Math.max(0,m.scv-dt*.006*(ashore?2:1));else if(s.noFresh>900)m.scv=Math.min(1,m.scv+dt*.0016*m.sus*(m.tr==="hardy"?.75:1)*(1+.6*m.f));
    if(m.scv>.3&&!m.scvSaid){m.scvSaid=true;say(`${m.n} has the first signs of scurvy: swollen gums and old wounds opening. Fresh food or limes would cure it.`,{});}else if(m.scv<.1)m.scvSaid=false;
    if(m.mode==="duty"){m.sk+=dt*.0012*(1-m.sk);
      if(rough>0&&m.r!=="Cook"&&m.r!=="Captain"&&Math.random()<dt*.0025*rough*(1.4-m.sk)*(m.tr==="timid"?.5:m.tr==="hardy"?.6:1)){const sev=Math.random()<.15;m.hp-=sev?.7:.25+Math.random()*.35;say(sev?`${m.n} falls from the yard and is horribly crushed on the deck.`:`${m.n} is hurt in a fall in the working of the ship.`,{});}
      if(m.r==="Seaman"||m.r==="Bosun"){if(!best||m.sk>best.sk)best=m;}}
    if(m.rv&&m.mode==="duty"&&m.n<m.rv){const o=C.find(x=>x.n===m.rv);if(o&&o.mode==="duty"&&Math.random()<dt*.012){m.hp-=.12;o.hp-=.12;m.mo=Math.max(0,m.mo-.1);o.mo=Math.max(0,o.mo-.1);say(`${m.n} and ${o.n} come to blows over an old grudge before the watch can part them.`,{});}}
    m.hp=Math.min(1,m.hp+dt*(m.sick?.012:.004));
    const was=m.sick;m.sick=was?!(m.hp>.8&&m.scv<.45&&!(m.fev>.1)):(m.hp<.5||m.scv>=.6||m.fev>.3);
    if(m.sick){m.why=m.fev>.3?"Fever":m.scv>=.6?"Scurvy":"Hurt";m.mode="sleep";}
    if(m.sick&&!was)say(m.fev>.3?`${m.n} is burning with fever and is carried to the sick berth.`:m.scv>=.6?`${m.n} is too weak with scurvy to stand a watch and is carried to the sick berth.`:`${m.n} is badly hurt and is carried to the sick berth.`,{});
    if(!m.sick&&was)say(`${m.n} is on his feet again and back on the watch bill.`,{});
    // spirits drift toward what the ship gives them
    const so=m.fr&&C.find(o=>o.n===m.fr&&o.w===m.w),ro=m.rv&&C.find(o=>o.n===m.rv&&o.w===m.w);
    const mt=clamp(.62+(m.tr==="steady"?.05:m.tr==="leader"?.04:m.tr==="troublemaker"&&!(m.cow>s.t)?-.04:0)+(m.tr==="drinker"&&T.rum<n*.06?-.06:0)+trShip+(so?.04:0)-(ro?.06:0)+(s.ration<1?-.14:.04)-(s.hungry?.3:0)-(m.mode==="duty"?.25*Math.max(0,m.f-.55):0)-(s.pumping?.07:0)-.03*Math.min(3,nSick)-(s.squall||w.kn>=30?.06:0)+(ashore?.18:0)-(!prot&&s.noFresh>600?.08:0),0,1);
    m.mo+=(mt-m.mo)*(1-Math.exp(-dt/6));avg+=m.mo;}
  { const out=out_.map(m=>[m,"died"]);for(const m of C){if(out_.includes(m))continue;if(m.scv>=.98&&m.sick&&Math.random()<dt*.004)out.push([m,"died"]);else if(ashore&&m.mo<.25&&m.r!=="Captain"&&Math.random()<dt*.01)out.push([m,"ran"]);}
    for(const[m,k]of out){if(C.length<=CREWG.minCrew()&&k==="ran")continue;removeHand(m);say(k==="died"?`${m.n} dies ${m.fev>=1?"of the fever":m.hp<.3?"of his injuries":"of the scurvy"} and is committed to the sea.`:`${m.n} has deserted in the night, sick of the ship.`,{});} }
  avg/=n;if(avg<.3&&!s.sullenSaid){s.sullenSaid=true;say("The hands are sullen. Mutterings in the forecastle: better food, rest or a tot of rum would mend it.",{});}else if(avg>.45)s.sullenSaid=false;
  s.helmN=best?best.n:null;s.helmF=best?clamp(1.3-.6*best.sk,.7,1.3):1.2;
  crisisStep(s,dt,w,rough,avg);}
/* ---- hiring and port life ---- */
function hireList(s){const pt=CREWG.atPort(s);if(!pt)return[];const d=CREWG.dayIndex(s);let h=0;for(const c of pt.k+d)h=(h*31+c.charCodeAt(0))>>>0;
  const r=()=>{h=(h*1664525+1013904223)>>>0;return h/4294967296;},out=[];
  for(let i=0;i<4;i++){const sk=.2+r()*.6,n=CREWG.names.first[Math.floor(r()*16)]+" "+CREWG.names.last[Math.floor(r()*20)];const tx=r();out.push({id:pt.k+"|"+d+"|"+i,n,sk,tr:['steady','steady','drinker','troublemaker','leader','timid','hardy'][Math.floor(tx*7)],cost:Math.round(15+60*sk)});}
  { const x1=r(),x2=r(),x3=r(),x4=r(),hasS=s.crew.some(m=>m.r==="Surgeon"),hasM=s.crew.some(m=>m.r==="Surgeon's mate");
    if(x1<.55&&(!hasS||!hasM)){const role=hasS?"Surgeon's mate":"Surgeon",med=role==="Surgeon"?.5+x2*.4:.25+x2*.4;out.push({id:pt.k+"|"+d+"|doc",n:(role==="Surgeon"?"Dr. ":"")+CREWG.names.first[Math.floor(x3*16)]+" "+CREWG.names.last[Math.floor(x4*20)],sk:.3,med,role,tr:'steady',cost:Math.round(role==="Surgeon"?120+120*med:50+90*med)});} }
  return out.filter(c=>!(s.hired||[]).includes(c.id));}
function removeHand(m){const C=S.crew,i=C.indexOf(m);if(i<0||m.r==="Captain")return;C.splice(i,1);EV.emit("crewRemoved",m,i);}
function hireHand(id){if(!S||!S.crew)return;const c=hireList(S).find(x=>x.id===id);if(!c)return;
  if(S.crew.length>=CREWG.maxCrew()){say("There is no room in the ship for another hand.",{log:false});return;}
  if(S.purse<c.cost){say("The purse is too light to pay his advance.",{log:false});return;}
  const cnt=[0,0,0];S.crew.forEach(m=>{if(m.r==="Seaman"&&m.w<3)cnt[m.w]++;});
  const m={n:c.n,r:c.role||"Seaman",med:c.med,w:c.role?3:cnt.indexOf(Math.min(...cnt)),f:.1,mode:undefined,ov:null,mo:.65,sk:c.sk,tr:c.tr,hp:1,scv:0,sus:.75+Math.random()*.5,sick:false,why:""};
  m.b=CREWG.berths.findIndex((b,bi)=>CREWG.berthOwner(bi)<0);if(m.b<0)m.b=null;
  S.purse-=c.cost;(S.hired=S.hired||[]).push(id);S.crew.push(m);
  say(`${c.n} signs on as ${c.role?(c.role==="Surgeon"?"the ship's surgeon":"surgeon's mate"):(c.sk>.55?"an able":"an ordinary")+" seaman"} for an advance of ${CREWG.money(c.cost)}.`,{});EV.emit("crewHired",m);EV.emit("crewBill");}
function payOff(m){if(!S)return;if(!CREWG.atPort(S)){say("You can only pay a man off in port.",{log:false});return;}if(m.r==="Captain")return;if(S.crew.length<=CREWG.minCrew()){say("You cannot sail her with fewer hands.",{log:false});return;}
  removeHand(m);for(const o of S.crew)o.mo=Math.max(0,o.mo-.02);say(`${m.n} is paid off and goes ashore.`,{});EV.emit("crewBill");}
function shoreLeave(){if(!S||!S.crew)return;const pt=CREWG.atPort(S);if(!pt){say("Shore leave is only given in port.",{log:false});return;}
  if(S.t-(S.leaveT??-99)<24){say("The hands have only just been ashore.",{log:false});return;}
  S.leaveT=S.t;const gone=[];for(const m of S.crew.slice()){if(m.r==="Captain"||m.sick)continue;if(S.crew.length-gone.length>CREWG.minCrew()&&Math.random()<.02+(1-m.mo)*.15)gone.push(m);else m.mo=Math.min(1,m.mo+.2);}
  for(const m of gone)removeHand(m);
  say(gone.length?`The hands go ashore at ${pt.name}. ${gone.length===1?gone[0].n+" does":gone.length+" men do"} not come back.`:`The hands go ashore at ${pt.name} and all return by the evening tide, the happier for it.`,{});EV.emit("crewBill");}
/* ---- discipline and crisis moments ---- */
function punish(m){if(!S||m.r==="Captain")return;m.mo=Math.max(0,m.mo-.3);m.hp=Math.max(.3,m.hp-.12);m.cow=S.t+72;
  for(const o of S.crew)if(o!==m)o.mo=Math.max(0,o.mo-(m.tr==="leader"?.08:.04));
  say(`${m.n} is seized up and flogged at the gangway. The ${m.tr==="troublemaker"?"forecastle falls quiet":"hands watch in silence"}.`,{});EV.emit("crewBill");}
const rnd=a=>a[Math.floor(Math.random()*a.length)];
function crisisKind(k,arg){const C=S.crew,sea=S.wx?clamp((S.wx.H-2)/4,0,1):0,duty=C.filter(m=>m.mode==="duty"),mate=C.find(m=>m.r==="Mate"),bos=C.find(m=>m.r==="Bosun"),avgSk=duty.length?duty.reduce((a,m)=>a+m.sk,0)/duty.length:.4;
  if(k==="surgery"){const m=C.find(x=>x.n===arg);if(!m||m.hp>=.3)return null;const md=medTeam(S),cut=md.sg?md.sg.med||.5:(md.mt&&(md.mt.med||0)>=.5?md.mt.med*.8:0),q=md.q,opts=[];
    if(cut>0)opts.push({label:`Amputate (${md.sg?"the surgeon":"the surgeon's mate"} operates)`,sub:"Cuts away the ruined limb. It will probably save him, but he will be maimed for good.",fn:()=>{S.stores.med=Math.max(0,S.stores.med-4);if(Math.random()<clamp(.45+.45*cut,.3,.92)){m.hp=.45;m.maim=true;return `${m.n} lives through the surgeon's saw. He will be a cripple, but he is alive.`;}removeHand(m);return `${m.n} dies under the knife.`;}});
    opts.push({label:"Dress the wound and nurse him",sub:q>0?"The surgeon's care gives him a fair chance without the knife.":"No one aboard has the skill; it is down to his strength and luck.",fn:()=>{if(Math.random()<clamp(.35+.4*q,.3,.8)){m.hp=.42;return `${m.n} turns the corner and the wound slowly heals.`;}removeHand(m);return `${m.n}'s wound turns bad and he dies in the night.`;}});
    return{title:`${m.n} is crushed`,text:`${m.n} lies where he fell with a limb mangled, barely conscious. ${q>0?"The surgeon says it must be decided now.":"There is no surgeon fit to see him."}`,opts};}
  if(k==="mob"){const pool=duty.filter(m=>m.r==="Seaman"||m.r==="Bosun"||m.r==="Mate");if(!pool.length)return null;const m=rnd(pool),kn=S.ship.v;
    return{title:"Man overboard!",text:`${m.n} has been thrown from the rigging into the sea. The ship is making ${kn.toFixed(0)} knots in a ${sea>.6?"rough":sea>.3?"lumpy":"moderate"} sea and he is already astern, shouting.`,opts:[
      {label:"Heave to and lower the boat",sub:"The best chance, but it takes the ship off her course and risks the boat's crew.",fn:()=>{const ch=clamp(.85-.35*sea-.01*kn+.2*(avgSk-.5),.15,.95);
        if(Math.random()<ch){m.hp=Math.max(.35,m.hp-.2);for(const o of C)o.mo=Math.min(1,o.mo+.08);return `The boat pulls ${m.n} out of the sea, half drowned. The hands cheer him aboard.`;}
        removeHand(m);for(const o of C)o.mo=Math.max(0,o.mo-.12);return `The boat searches the swell but ${m.n} is gone. The hands are very quiet.`;}},
      {label:"Throw a grating and stand on",sub:"Keeps the ship's way, but there is little hope for him and the hands will not forget it.",fn:()=>{for(const o of C)o.mo=Math.max(0,o.mo-.12);if(Math.random()<.12*(1-sea)){m.hp=Math.max(.35,m.hp-.25);return `${m.n} clings to the grating and is later hauled aboard by a lucky drift of the ship.`;}removeHand(m);return `${m.n} goes astern and is lost. The hands mutter at the captain's hard choice.`;}}]};}
  if(k==="fire"){const ck=C.find(m=>m.r==="Cook");const T=S.stores;
    return{title:"Fire in the galley!",text:"Smoke rolls up the hatch and flame shows round the galley hearth, close to the powder and the stores.",opts:[
      {label:"All hands, form a bucket chain",sub:"Fast and sure if the hands are fit, but wets the stores.",fn:()=>{const ch=clamp(.55+.35*Math.min(1.2,S.eff)+(duty.length-6)*.01,.3,.95);T.bis*=.97;if(ck)ck.hp=Math.max(.3,ck.hp-.15);
        if(Math.random()<ch)return "The bucket chain drowns the fire quickly. A little biscuit is spoiled but the ship is safe.";S.hull=Math.max(.2,S.hull-.1);T.bis*=.85;T.meat*=.92;return "The fire takes hold of the galley before it is beaten out. Planking is scorched and stores are lost.";}},
      {label:"Close the hatches and smother it",sub:"Saves the stores if it works; if not the fire gets away below.",fn:()=>{if(Math.random()<.55){S.hull=Math.max(.2,S.hull-.02);return "With the hatches battened the fire starves and dies. Nothing is lost but a smoky hour.";}
        S.hull=Math.max(.2,S.hull-.2);T.bis*=.75;T.meat*=.85;for(let i=0;i<2&&duty.length;i++)rnd(duty).hp=Math.max(.25,0.4);return "The fire gets away below before the hatches are opened again. The hull is badly scorched and two hands are burned.";}}]};}
  if(k==="mutiny"){const T=S.stores,leaders=C.filter(m=>m.tr==="leader").length,trouble=C.filter(m=>m.tr==="troublemaker"&&!(m.cow>S.t)),ring=trouble.length?trouble.reduce((a,b)=>a.mo<b.mo?a:b):C.filter(m=>m.r==="Seaman").reduce((a,b)=>a&&a.mo<b.mo?a:b,null),off=((mate?mate.sk:.5)+(bos?bos.sk:.5))/2;
    return{title:"The hands are gathering",text:`The forecastle has had enough. ${ring?ring.n+" is speaking for the hands, ":""}the men stand in the waist and want to be heard. Rations, rest or a tot of rum would ease it.`,opts:[
      {label:"Hear their grievances",sub:`Costs some rum and full rations. ${leaders?"A steady hand among them helps.":"They have no steady voice to settle them."}`,fn:()=>{if(T.rum>=n_(C)*.15)T.rum-=n_(C)*.15;S.ration=1;const ok=Math.random()<clamp(.7+(leaders?.15:0)-.1*trouble.length,.3,.95);
        if(ok){for(const o of C)o.mo=Math.min(1,o.mo+.25);return "The captain hears them out, promises full rations and a tot, and the hands go back to their stations.";}
        S.strikeUntil=S.t+12;for(const o of C)o.mo=Math.min(1,o.mo+.1);return "They take the rum but will not turn to. The hands refuse duty for half a day.";}},
      {label:"Stand firm and iron the ringleader",sub:"Depends on the mate and bosun being respected.",fn:()=>{if(Math.random()<clamp(.3+.5*off+(leaders?.1:0),.2,.9)){if(ring)punish(ring);for(const o of C)if(o!==ring)o.mo=Math.max(0,o.mo-.04);return `The officers seize ${ring?ring.n:"the ringleader"} and the rest give way, sullen but quiet.`;}
        S.strikeUntil=S.t+12;for(const o of C)o.mo=Math.max(0,o.mo-.1);return "The attempt to take the ringleader fails and the hands refuse duty for half a day.";}},
      {label:"Promise a double tot and shore leave",sub:"Cheap, but only half of them will believe it.",fn:()=>{if(Math.random()<.6){for(const o of C)o.mo=Math.min(1,o.mo+.15);return "The promise is cheered and the watch goes back to work.";}S.strikeUntil=S.t+8;return "They do not believe it. The hands refuse duty for the rest of the watch.";}}]};}
  return null;}
const n_=C=>C.length;
function crisisStep(s,dt,w,rough,avg){
  if(s.crisis&&!optOn("crisisOpen"))s.crisis=null;
  if(s.strikeUntil&&s.t>=s.strikeUntil){s.strikeUntil=null;say("The strike is over; the hands turn to again.",{});}
  s.mutH=avg<.28?(s.mutH||0)+dt:Math.max(0,(s.mutH||0)-dt*2);
  if(!s.crisis&&!CREWG.modalOpen()&&!s.done&&s.medQueue&&s.medQueue.length){const c=crisisKind("surgery",s.medQueue.shift());if(c){EV.emit("crisis",c);return;}}
  if(s.crisis||CREWG.modalOpen()||s.done||s.t<(s.crNext??0)||s.strikeUntil)return;
  const C=s.crew;let k=null;
  if(s.mutH>10)k="mutiny";
  else if(rough>.25&&Math.random()<dt*.0010*rough)k="mob";
  else if(C.some(m=>m.r==="Cook"&&m.mode==="duty")&&Math.random()<dt*.0004)k="fire";
  if(!k)return;const c=crisisKind(k);if(c){s.mutH=0;EV.emit("crisis",c);}}
/* ---- the mate spreads the hands evenly between the three watches (officers first, then the bosun, then the men) ---- */
function crewRota(C){const OFF=["Lieutenant","Master","Mate","Midshipman","Coxswain"],MEN=["Seaman","Marine","Soldier"],keep=C.filter(m=>m.w<3||MEN.includes(m.r)||OFF.includes(m.r)||m.r==="Bosun");let i=0;
  for(const m of[...keep.filter(m=>OFF.includes(m.r)),...keep.filter(m=>m.r==="Bosun"),...keep.filter(m=>MEN.includes(m.r))]){m.w=i%3;i++;}}
function crewBosunWatch(C){const bos=C.find(m=>m.r==="Bosun");if(bos)bos.w=1;}
/* ---- the crew each step: watches, fatigue, rations ---- */
function crewStep(s,dt,w){const C=s.crew;if(!C)return;crewX(s);const sh=s.ship,wi=watchInfo(s);
  if(s.wkey!==wi.key){if(s.wkey!==undefined){for(const m of C)m.ov=null;if(!CREWG.skipping())say(`${["Eight bells","Eight bells","Eight bells","Eight bells","Four bells","Eight bells","Eight bells"][wi.i]}. The ${CREWG.watchNames[wi.w].toLowerCase()} has the deck.`,{});}s.wkey=wi.key;}
  s.allHands=!!s.callAll||w.kn>=30||!!s.squall;
  { const T=s.stores,n=C.length,r=s.ration;T.bis=Math.max(0,T.bis-n*r*dt/24);{const need=n*r*dt/24,ff=Math.min(T.fish,need);T.fish-=ff;T.meat=Math.max(0,T.meat-(need-ff));}T.beer=Math.max(0,T.beer-n*r*dt/24);
    const low=Math.min(T.bis,T.meat+T.fish,T.beer)<=0;s.hungry=low;
    for(const k of["bis","meat","beer"])if((k==='meat'?T.meat+T.fish:T[k])<n*r*5&&!s["warn"+k]){s["warn"+k]=true;say(`The purser reports only five days of ${{bis:"biscuit",meat:"salt meat",beer:"beer"}[k]} left.`,{});}
    if(low&&!s.starveSaid){s.starveSaid=true;say("A cask is empty. The hands are on short commons and grumbling.",{});} }
  const load=1+.45*clamp((w.kn-18)/14,0,1)+(sh.q.length?.25:0),sea=s.wx?clamp((s.wx.H-2)/4,0,1):0;let sum=0,fs=0,nd=0;
  for(const m of C){const duty=isDuty(m,wi,s.allHands);
    if(m.mode===undefined)m.mode=duty?"duty":m.f>.12?"sleep":"rest";
    if(duty){m.mode="duty";const RL=CREWG.role(m.r);m.f=Math.min(1,m.f+(CREWG.dutyRate[m.r]??RL.r)*load*(s.hungry?1.3:1)*dt);nd++;fs+=m.f;if(RL.s)sum+=RL.s*effOfMan(m);}
    else{if(m.mode==="duty")m.mode=m.f>.12?"sleep":"rest";
      if(m.mode==="sleep"){const q=(m.b==null?(m.q??.45):CREWG.berths[m.b].q)*(1-.25*sea)*(s.hungry?.6:1)*(s.ration<1?.92:1);m.f=Math.max(0,m.f-.12*q*dt);if(m.f<.03)m.mode="rest";}
      else m.f=Math.max(0,m.f-.02*dt);}}
  crewLife(s,dt,w,wi);
  s.eff=clamp(sum/(CREWG.effN()||6),.3,1.25);s.fat=nd?fs/nd:0;s.nDuty=nd;
  if(s.fat>.55&&!s.tiredSaid){s.tiredSaid=true;say("The hands are worn out. Work aloft is slow and the helm wanders. Let some of them sleep.",{});}else if(s.fat<.35)s.tiredSaid=false;}
const crewEff=()=>(S&&S.eff)||1;
