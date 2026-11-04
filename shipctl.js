/* =====================================================================
   Dead Reckoning · SHIP CONTROLS MODULE  (shipctl.js)
   ---------------------------------------------------------------------
   Its own part of the game: owns how the Ship controls area looks.
   - draws the compass dial, the glass (barometer) and the sail bars
   - holds the look settings for the whole Ship controls sheet
     (compass box, readouts, helm buttons, sheet colours)
   - adds the extra elements made in the Ship Controls Editor
   The game logic (steering, sail handling, the weather) stays in index.html;
   this file only reads it. Loaded before the main game script.

   Look settings, lowest to highest:
     SC_DEFAULTS (the game's own look, below)
     DR_SHIPCTL_PUBLISHED (baked in by "PUSH SHIP CONTROLS {...}" from the editor)
     live settings sent by the Ship Controls Editor while it shows the game
   A value of null or "" always means "use the game's own look".
   ===================================================================== */

/* PUBLISHED SHIP CONTROLS LOOK: replaced by the push script. null = game default. */
const DR_SHIPCTL_PUBLISHED={"v":1,"c":{"vs":{"ctl":44},"sty":{"box":{"ord":-2},"ctl":{"ord":-1},"oars":{"ord":1},"logb":{"ord":2},"riggrp":{"ord":0}},"sWordFont":"'IM Fell English SC',Georgia,serif","sNumFont":"system-ui,sans-serif","gTubeW":20,"gFluidA":0.84,"gWordFont":"'IM Fell English SC',Georgia,serif","gNumFont":"system-ui,sans-serif","cRimW":3,"cPoints":8,"gStyle":"bar"}};

window.DRSC=(function(){
  const DEFAULTS={
    /* ---- compass card ---- */
    cStyle:"plain",          // plain | rose (an eight-point star under the card)
    cCard:"#f7edc9", cRim:"#2e2519", cRimW:2.5, cTicks:"#2e2519",
    cPoints:4,               // 4 = N E S W, 8 adds NE SE SW NW
    cNorth:"#a8452c", cLetters:"#2e2519", cLetterFont:"'IM Fell English SC',Georgia,serif", cLetterSize:34,
    cRoseA:"#2e2519", cRoseB:"#e9d5a0",
    cShowNogo:true, cNogo:"rgba(168,69,44,.16)",
    cShowRing:true, cRing:"#2e2519", cBraceFill:"rgba(217,130,43,.14)", cBraceArrow:"#d9822b",
    cShowOpt:true, cOpt:"rgba(106,95,80,.9)",
    cHead:"#2e2519", cOrdered:"#a8452c",
    cShowShip:true, cShipScale:.62, cHull:"#e9d5a0", cDeck:"#f5e9c3", cQdeck:"#d8c28a", cSail:"rgba(239,233,218,.95)", cSpar:"#2e2519",
    cShowWind:true, cWind:"#b2452c", cShowCurrent:true, cCurrent:"#1b3f6b", cShowKey:true,
    /* ---- the glass ---- */
    gStyle:"tube",           // tube (mercury tube with bulb) | bar (flat bar)
    gTitle:"THE GLASS", gShowTitle:true, gShowValue:true, gShowZones:true, gShowScale:true, gShowTrend:true,
    gInk:"", gSoft:"", gFluid:"", gFluidA:.82, gFall:"", gTubeW:14,
    gNumFont:"'IBM Plex Mono',monospace", gWordFont:"'IM Fell English',Georgia,serif",
    /* ---- the sail bars ---- */
    sStyle:"tube",           // tube | bar | blocks (five stacked blocks)
    sTitle:"SAILS", sShowTitle:true, sShowValue:true, sShowNames:true, sShowScale:true, sShowTarget:true,
    sInk:"", sSoft:"", sFill:"", sFillA:.82, sTarget:"", sTubeW:14,
    sNumFont:"'IBM Plex Mono',monospace", sWordFont:"'IM Fell English',Georgia,serif",
    /* ---- the compass box (glass, compass, sail bars in a row) ---- */
    bOrder:"glass,compass,sails", bShowGlass:true, bShowCompass:true, bShowSails:true, bShowFoot:true, bShowScope:true,
    fBtn:44, fIcon:28, fGap:12, fAlign:"evenly",   // the icon row under the compass: button size, icon size, gap (px), spread (evenly | centre | start)
    bDial:null, bGlassW:null, bSailsW:null, bBarsH:null, bGap:null,
    bBg:"", bBorder:"", bBorderW:null, bRadius:null, bPad:null, bShadow:null,
    /* ---- the helm sheet (Ship controls panel) ---- */
    hBg:"", hInk:"", hReadSize:null, hBtnBg:"", hBtnInk:"", hBtnBorder:"", hBtnRadius:null,
    hShowCourse:true, hShowWind:true, hShowAnchor:true, hShowHelmBtns:true, hShowRig:true, hShowLogRow:true,
    /* ---- extra elements added in the editor ---- */
    vs:{},                   // how much of the view each page leaves, percent: {ctl,ship,stores,book}
    sty:{},                  // per-part styling: {partKey:{hide,bg,ink,bd,bw,rad,w,h,fs,font,bold,ital,ls,ta,op,ord}}
    pos:{},                  // moved/resized parts: {partKey:{x,y,s,r}}  (px, scale %, degrees)
    extras:[]                // [{id,type:"readout"|"label"|"divider",field,text,at:"top"|"bottom"|"end",size,color,bold,align}]
  };
  const st={def:DEFAULTS,pub:null,live:null,rev:0,c:null};
  const clone=o=>JSON.parse(JSON.stringify(o));
  function merge(){const c=clone(DEFAULTS);for(const src of[st.pub,st.live])if(src&&typeof src==="object")for(const k in src){if(!(k in DEFAULTS))continue;const v=src[k];if(v===null||v===undefined)continue;c[k]=k==="extras"?(Array.isArray(v)?v.slice(0,40):[]):(k==="pos"||k==="sty"||k==="vs")?(v&&typeof v==="object"?v:{}):v;}
    st.c=c;st.rev++;return c;}
  try{st.pub=DR_SHIPCTL_PUBLISHED&&(DR_SHIPCTL_PUBLISHED.c||DR_SHIPCTL_PUBLISHED);}catch(e){}
  merge();

  /* ---------- CSS for the compass box and the helm sheet ---------- */
  /* parts the editor can move and resize: key, label, group, selector */
  const PARTS=[
    ["box","Whole gauge box","Gauges","#compassBox"],["dial","Compass","Gauges","#compassBox #dial"],["baro","Glass","Gauges","#compassBox #baro"],["sails","Sail bars","Gauges","#compassBox #sailSteps5"],
    ["fold","Fold compass button","Gauges","#compassBox #cbBtn"],["scope","Telescope button","Gauges","#compassBox #cbScope"],["foot","Button row under gauges","Gauges",".compassbox .cbfoot"],["heave2","Heave log button (gauges)","Gauges","#bHeave2"],
    ["course","Course and speed line","Text",".dock-all .dockctl .cspd"],["wind","Wind line","Text","#windSpd"],["current","Current line","Text","#curTxt"],["anchor","Anchor / docked line","Text","#anchTxt"],["rig","Yards and rigging line","Text","#rigTxt"],["yards","Yards status line","Text",".dock-all .dockctl .setrows"],
    ["xtop","Added elements above gauges","Text",".sc-x-top"],["xbot","Added elements below gauges","Text",".sc-x-bot"],["xend","Added elements at panel end","Text",".sc-x-end"],
    ["cL5","Port 5° button","Buttons","#cL5"],["cR5","Starboard 5° button","Buttons","#cR5"],["drop","Anchor button","Buttons","#bDrop"],["fish","Fish button","Buttons","#bFish"],
    ["sDn","Shorten sail button","Buttons","#sDn"],["sUp","Make sail button","Buttons","#sUp"],["sAll","Pick all sails","Buttons","#sailAll"],["sNone","Clear sails","Buttons","#sailNone"],
    ["brL","Yards left button","Buttons","#brL"],["brR","Yards right button","Buttons","#brR"],["heave","Heave the log button","Buttons","#bHeave"],["helmbtns","Helm button row","Buttons",".dock-all .helmbtns"],
    ["oars","Oars section","Page groups","#oarSec"],["logb","Log book section","Page groups",".dock-all .sub.subl>.oarsec:not(#oarSec)"],["riggrp","Rigging and log row","Page groups",".dock-all .sub.subt"],
    ["hdg","Heading slider","Buttons","#dockHdg"],["sheet","Whole helm panel","Panel",".dock-all .dockbody"],["ctl","Helm readout block","Panel",".dock-all .dockctl"]
  ];
  const partSel=Object.fromEntries(PARTS.map(p=>[p[0],p[3]]));
  const VS_PAGES=["ctl","ship","stores","book"];
  function viewShare(pg){const v=st.c&&st.c.vs&&st.c.vs[pg];return isFinite(+v)&&+v>=10&&+v<=90?+v/100:null;}
  const has=v=>v!==null&&v!==undefined&&v!=="";
  const num=v=>has(v)&&isFinite(+v);
  const safe=v=>String(v).replace(/[^#a-zA-Z0-9(),.%\s'-]/g,"");
  function css(){const c=st.c,o=[],I="!important",B="html body ";
    const show=(on,sel)=>{if(on===false)o.push(sel.split(",").map(s=>B+s).join(",")+`{display:none${I}}`);};
    // order of the three gauges
    const ord=String(c.bOrder||"").split(",").map(s=>s.trim());const idOf={glass:"#baro",compass:"#dial",sails:"#sailSteps5"};
    ord.forEach((k,i)=>{if(idOf[k])o.push(`${B}.cbrow>${idOf[k]}{order:${i+1}}`);});
    show(c.bShowGlass,"#compassBox #baro");show(c.bShowCompass,"#compassBox #dial");show(c.bShowSails,"#compassBox #sailSteps5");
    show(c.bShowFoot,"#compassBox .cbfoot");show(c.bShowScope,"#compassBox .cbscope");
    if(num(c.bDial))o.push(`${B}.compassbox #dial{width:${+c.bDial}px${I};height:${+c.bDial}px${I}}`);
    if(num(c.bGlassW))o.push(`${B}#baro{width:${+c.bGlassW}px${I}}`);
    if(num(c.bSailsW))o.push(`${B}#sailSteps5{width:${+c.bSailsW}px${I}}`);
    if(num(c.bBarsH))o.push(`${B}#baro,${B}#sailSteps5{height:${+c.bBarsH}px${I}}`);
    {const jc=c.fAlign==="start"?"flex-start":c.fAlign==="centre"?"center":"space-evenly";
      o.push(`${B}.compassbox .cbfoot:not(:has(#logbox:not([hidden]))){justify-content:${jc}${I};flex-wrap:nowrap${I};padding-left:4px${I};padding-right:4px${I};gap:${num(c.fGap)?+c.fGap:12}px${I};column-gap:${num(c.fGap)?+c.fGap:12}px${I};align-items:center${I};width:100%${I};box-sizing:border-box${I}}`);
      if(num(c.fBtn))o.push(`${B}.compassbox .cbfoot:not(:has(#logbox:not([hidden]))) .btn.ico,${B}.compassbox .cbfoot:not(:has(#logbox:not([hidden]))) .anchwrap .btn.ico{width:${+c.fBtn}px${I};height:${+c.fBtn}px${I};flex:none${I}}`);
      if(num(c.fIcon))o.push(`${B}.compassbox .cbfoot .btn.ico svg{width:${+c.fIcon}px${I};height:${+c.fIcon}px${I}}${B}.compassbox .cbfoot .btn.ico img{width:${+c.fIcon}px${I};height:${+c.fIcon}px${I}}`);}
    if(num(c.bGap))o.push(`${B}.cbrow{gap:${+c.bGap}px${I};column-gap:${+c.bGap}px${I}}`);
    const L=":root:not([data-theme=dark]) body ";
    {const r=[];if(has(c.bBg))r.push(`background:${safe(c.bBg)}${I}`);if(has(c.bBorder)||num(c.bBorderW))r.push(`border:${num(c.bBorderW)?+c.bBorderW:1}px solid ${has(c.bBorder)?safe(c.bBorder):"var(--ink)"}${I}`);
      if(num(c.bRadius))r.push(`border-radius:${+c.bRadius}px${I}`);if(num(c.bPad))r.push(`padding:${+c.bPad}px${I}`);
      if(c.bShadow===true)r.push(`box-shadow:0 4px 14px rgba(20,14,10,.3)${I}`);if(c.bShadow===false)r.push(`box-shadow:none${I}`);
      if(r.length)o.push(`${L}.compassbox:not(.collapsed){${r.join(";")}}`);}
    // helm sheet
    if(has(c.hBg))o.push(`${L}.side .dock-all .dockbody{background:${safe(c.hBg)}${I};border-radius:4px}`);
    if(has(c.hInk))o.push(`${L}.dock-all .dockbody,${L}.dock-all .dockbody .muted{color:${safe(c.hInk)}${I}}`);
    if(num(c.hReadSize))o.push(`${B}.dock-all .dockctl .mono,${B}.dock-all .dockctl .setrows{font-size:${+c.hReadSize}px${I}}`);
    {const r=[];if(has(c.hBtnBg))r.push(`background:${safe(c.hBtnBg)}${I}`);if(has(c.hBtnInk))r.push(`color:${safe(c.hBtnInk)}${I}`);if(has(c.hBtnBorder))r.push(`border-color:${safe(c.hBtnBorder)}${I}`);
      if(r.length)o.push(`${L}.dock-all .btn:not(.primary):not([aria-pressed=true]){${r.join(";")}}`);
      if(num(c.hBtnRadius))o.push(`${B}.dock-all .btn{border-radius:${+c.hBtnRadius}px${I}}`);}
    show(c.hShowCourse,".dock-all .dockctl .cspd");show(c.hShowWind,".dock-all .dockctl .winf");show(c.hShowAnchor,".dock-all #anchTxt");
    show(c.hShowHelmBtns,".dock-all .helmbtns");show(c.hShowRig,".dock-all .sub.subt .meter,.dock-all #strainTxt,.dock-all #hullTxt");
    show(c.hShowLogRow,".dock-all .row:has(#bHeave)");
    // the Ship controls panel follows its own view split (the game fixes its top padding at 250px otherwise)
    if(viewShare("ctl"))o.push(`html body .side .dock-all:not(.collapsed){padding-top:calc(var(--vh,280px) - 30px)${I}}`);
    // moved and resized parts (CSS translate/scale/rotate, so they stack on whatever the game already does)
    {const P=c.pos||{};for(const k in P){const sel=partSel[k],q=P[k];if(!sel||!q)continue;const r=[];
      const X=+q.x||0,Y=+q.y||0;if(X||Y)r.push(`translate:${X}px ${Y}px${I}`);
      if(num(q.s)&&+q.s!==100)r.push(`scale:${Math.max(.2,Math.min(4,+q.s/100))}${I}`);
      if(num(q.r)&&+q.r)r.push(`rotate:${+q.r}deg${I}`);
      if(r.length)o.push(`${B}${sel}{${r.join(";")};transform-origin:50% 50%${I}}`);}}
    // per-part styling: hide, colours, border, corners, size, text
    {const Y=c.sty||{};for(const k in Y){const sel=partSel[k],q=Y[k];if(!sel||!q)continue;const r=[];
      if(q.hide)r.push(`display:none${I}`);
      if(has(q.bg))r.push(`background:${safe(q.bg)}${I}`);if(has(q.ink))r.push(`color:${safe(q.ink)}${I}`);
      if(has(q.bd)||num(q.bw))r.push(`border:${num(q.bw)?+q.bw:1}px solid ${has(q.bd)?safe(q.bd):"currentColor"}${I}`);
      if(num(q.rad))r.push(`border-radius:${+q.rad}px${I}`);
      if(num(q.w)&&+q.w>0)r.push(`width:${+q.w}px${I};min-width:0${I}`);if(num(q.h)&&+q.h>0)r.push(`height:${+q.h}px${I};min-height:0${I}`);
      if(num(q.fs)&&+q.fs>0)r.push(`font-size:${+q.fs}px${I}`);if(has(q.font))r.push(`font-family:${safe(q.font)}${I}`);
      if(q.bold===true)r.push(`font-weight:700${I}`);if(q.bold===false)r.push(`font-weight:400${I}`);if(q.ital)r.push(`font-style:italic${I}`);
      if(num(q.ls))r.push(`letter-spacing:${+q.ls}px${I}`);if(q.ta==="left"||q.ta==="center"||q.ta==="right")r.push(`text-align:${q.ta}${I}`);
      if(num(q.mt))r.push(`margin-top:${+q.mt}px${I}`);if(num(q.mb))r.push(`margin-bottom:${+q.mb}px${I}`);if(num(q.op)&&+q.op<1)r.push(`opacity:${+q.op}${I}`);if(num(q.ord)&&+q.ord)r.push(`order:${+q.ord}${I}`);
      if(r.length)o.push(`${B}${sel}{${r.join(";")}}`);}}
    // extras
    o.push(`.sc-x{display:flex;flex-wrap:wrap;gap:4px 10px;justify-content:center;align-items:baseline;width:100%;font-family:var(--f-data,'IBM Plex Mono',monospace);font-size:11px;line-height:1.3;color:var(--ink)}.sc-x:empty{display:none}.sc-x .sc-i{white-space:nowrap}.sc-x .sc-i i{font-style:normal;opacity:.7;margin-right:4px}.sc-x .sc-d{flex-basis:100%;height:0;border-top:1px dotted var(--rule,#b9a882);margin:2px 0}.sc-x .sc-full{flex-basis:100%}`);
    return o.join("\n");}

  /* ---------- extra elements ---------- */
  const FIELDS={
    heading:{label:"Heading",get:()=>{const S=st.G&&st.G.S;return S&&S.ship?String(((Math.round(S.ship.heading)%360)+360)%360).padStart(3,"0")+"°":"—";}},
    course:{label:"Course",id:"ordTxt"}, speed:{label:"Speed",id:"spdTxt"}, wind:{label:"",id:"windSpd"}, current:{label:"",id:"curTxt"},
    glass:{label:"Glass",id:"glassTxt"}, sea:{label:"Sea",id:"seaTxt"}, time:{label:"",id:"clock"}, sails:{label:"Sails",id:"posail"},
    rigging:{label:"Rigging",id:"rigTxt"}, anchor:{label:"",id:"anchTxt"}
  };
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  let built="",tick=0;
  function hosts(){const box=document.getElementById("compassBox");if(!box)return null;
    const mk=(cls,where)=>{let e=document.querySelector("."+cls);if(!e){e=document.createElement("div");e.className="sc-x "+cls;where(e);}return e;};
    const row=box.querySelector(".cbrow");
    return{top:mk("sc-x-top",e=>row?box.insertBefore(e,row):box.prepend(e)),
      bottom:mk("sc-x-bot",e=>row&&row.nextSibling?box.insertBefore(e,row.nextSibling):box.append(e)),
      end:mk("sc-x-end",e=>{const db=box.closest(".dockbody")||document.querySelector(".dock-all .dockbody");(db||box).append(e);})};}
  function textOf(it){if(it.type==="label")return esc(it.text||"");const f=FIELDS[it.field];if(!f)return"";
    let v=f.get?f.get():(document.getElementById(f.id)||{}).textContent||"—";v=String(v).replace(/\s+/g," ").trim();
    const lab=it.text!=null&&it.text!==""?it.text:f.label;return(lab?`<i>${esc(lab)}</i>`:"")+esc(v);}
  function renderExtras(){const h=hosts();if(!h)return;const xs=st.c.extras||[],sig=st.rev+"";
    if(built!==sig){built=sig;for(const k in h)h[k].innerHTML="";
      xs.forEach((it,i)=>{const at=h[it.at]?it.at:"bottom",el=document.createElement("span");
        if(it.type==="divider"){el.className="sc-d";}else{el.className="sc-i"+(it.full?" sc-full":"");el.dataset.i=i;
          const s=[];if(num(it.size))s.push(`font-size:${+it.size}px`);if(has(it.color))s.push(`color:${safe(it.color)}`);if(it.bold)s.push("font-weight:600");if(it.align)s.push(`text-align:${it.align==="left"?"left":it.align==="right"?"right":"center"}`);
          if(it.font)s.push(`font-family:${safe(it.font)}`);el.style.cssText=s.join(";");}
        h[at].append(el);});}
    document.querySelectorAll(".sc-x .sc-i").forEach(el=>{const it=xs[+el.dataset.i];if(it)el.innerHTML=textOf(it);});}

  /* ---------- apply ---------- */
  function apply(){let s=document.getElementById("drShipCtlCss");if(!s){s=document.createElement("style");s.id="drShipCtlCss";(document.head||document.documentElement).append(s);}
    s.textContent=css();
    try{if(window.__dtFit)window.__dtFit();}catch(e){}
    if(document.readyState!=="loading")renderExtras();}
  function start(){apply();renderExtras();setInterval(()=>{if((st.c.extras||[]).length)renderExtras();},500);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();

  /* ---------- the Ship Controls Editor talks to the game through postMessage ---------- */
  const inFrame=window.parent&&window.parent!==window;
  window.addEventListener("message",e=>{if(!inFrame||e.source!==window.parent)return;const d=e.data;if(!d||typeof d!=="object")return;
    if(d.drShipCtl&&typeof d.drShipCtl==="object"){st.live=d.drShipCtl;merge();apply();}
    if(d.drShipCtlHello)hello();
    if(typeof d.drShipCtlOpen==="string"){const ids={ctl:"ctlIcon",ship:"tbShip",stores:"tbStores",book:"tbBook"},b=document.getElementById(ids[d.drShipCtlOpen]);
      const dk=document.querySelector(".dock-all"),pressed=d.drShipCtlOpen==="ctl"?!(dk&&dk.classList.contains("collapsed")):b&&b.getAttribute("aria-pressed")==="true";if(b&&!pressed)b.click();}
    const SEL=Object.assign({compass:"#dial",glass:"#baro",sails:"#sailSteps5",box:"#compassBox",sheet:".dock-all .dockbody",extras:".sc-x:not(:empty)"},partSel);
    if(d.drShipCtlRect){const key=typeof d.drShipCtlRect==="string"?d.drShipCtlRect:"sheet";
      const e=document.querySelector(SEL[key]||SEL.sheet)||document.getElementById("compassBox")||document.querySelector(SEL.sheet),r=e&&e.getBoundingClientRect();
      try{window.parent.postMessage({drShipCtlRectR:r&&r.width?{key,x:r.left,y:r.top,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight}:null,drShipCtlRectKey:key},"*");}catch(err){}}
    if(typeof d.drShipCtlFlash==="string"){
      document.querySelectorAll(SEL[d.drShipCtlFlash]||"#none").forEach(el=>{el.style.outline="3px solid #d9822b";el.style.outlineOffset="2px";clearTimeout(el._scf);el._scf=setTimeout(()=>{el.style.outline="";el.style.outlineOffset="";},900);});}
  });
  function hello(){try{window.parent.postMessage({drShipCtlReady:1,defaults:DEFAULTS,published:st.pub,fields:Object.keys(FIELDS),parts:PARTS.map(p=>[p[0],p[1],p[2]])},"*");}catch(e){}}
  // ?scdemo=1 starts a free voyage straight away with the Ship controls open, for the editor
  if(inFrame&&/[?&]scdemo=1/.test(location.search)){
    window.addEventListener("load",()=>setTimeout(()=>{try{
      const G=st.G;if(G&&!G.S&&G.startVoyage){const k=Object.keys(G.PORTS)[0];
        G.startVoyage({id:"free",tag:"Free sailing",title:"Ship controls editor",from:k,to:null,mode:"trial",hdg:280,free:true,desc:""});}
      setTimeout(()=>{const d=document.querySelector(".dock-all");if(d&&d.classList.contains("collapsed")){const b=document.getElementById("ctlIcon");b&&b.click();}
        const cb=document.getElementById("compassBox");if(cb&&cb.classList.contains("collapsed")){const t=document.getElementById("cbBtn");t&&t.click();}hello();},400);
    }catch(err){console.warn("scdemo",err);hello();}},300));}
  else if(inFrame)window.addEventListener("load",hello);

  return{get c(){return st.c},viewShare,set _G(g){st.G=g},get _G(){return st.G},get rev(){return st.rev},DEFAULTS,FIELDS,
    set(p){st.live=Object.assign({},st.live||{},p||{});merge();apply();},reset(){st.live=null;merge();apply();},
    export(){const d={};for(const k in st.c)if(JSON.stringify(st.c[k])!==JSON.stringify(DEFAULTS[k]))d[k]=st.c[k];return d;}};
})();

/* =====================================================================
   Drawing: the glass, the sail bars and the compass dial.
   (Moved here from index.html.) The game's main script runs inside its own
   closure, so it hands this module a set of live getters, G, once at start:
     var SCX=DRShipCtlDraw({get S(){return S}, ...});
   Each draw reads what it needs from G at draw time.
   ===================================================================== */
window.DRShipCtlDraw=function(G){
DRSC._G=G;
let baroKey="";
function scInk(v,cv,fb){if(v&&!G.DARK)return v;return getComputedStyle(document.documentElement).getPropertyValue(cv).trim()||fb;}
function scTube(x,T,B,TX,TW,style,ink){x.strokeStyle=ink;x.lineWidth=1.6;
  if(style==="bar"){x.strokeRect(TX,T,TW,B-T);return;}
  x.beginPath();x.moveTo(TX,T);x.lineTo(TX,B);x.moveTo(TX+TW,T);x.lineTo(TX+TW,B);x.stroke();x.beginPath();x.arc(TX+TW/2,T,TW/2,Math.PI,2*Math.PI);x.stroke();}
function scArrow(x,up,fast,flat,ax,ay){if(flat){x.fillRect(ax-8,ay-1.5,16,3);return;}for(let k=0;k<(fast?2:1);k++){const yy=ay+(up?-k*7:k*7);x.beginPath();if(up){x.moveTo(ax-8,yy+4);x.lineTo(ax+8,yy+4);x.lineTo(ax,yy-6);}else{x.moveTo(ax-8,yy-4);x.lineTo(ax+8,yy-4);x.lineTo(ax,yy+6);}x.closePath();x.fill();}}
function drawBaro(){const {$,S,DARK,SHIP,NOGO,BMAX,SAILS,PORTS,glassInfo,GL_HI,GL_LO,GL_Z,invEff,effOf,planOf,clamp,windAt,optBrace,angDiff,dialShip,beaufort,currentAt,dl,dg,PI,D2R}=G;const c=$("baro");if(!c||!S)return;const K=DRSC.c,g=glassInfo(S),key=g.inHg.toFixed(2)+g.tr+DARK+(c.clientWidth|0)+"|"+DRSC.rev;if(key===baroKey)return;baroKey=key;
  const x=c.getContext("2d"),ink=scInk(K.gInk,"--ink","#2e2519"),soft=scInk(K.gSoft,"--ink-soft","#7b6a55"),och=scInk(K.gFall,"--ochre","#b2452c"),fl=scInk(K.gFluid,"--ink",ink);
  const W=120,H=500,T=62,B=462,Y=v=>T+(GL_HI-Math.min(GL_HI,Math.max(GL_LO,v)))/(GL_HI-GL_LO)*(B-T),TW=Math.max(6,Math.min(30,+K.gTubeW||14)),TX=65-TW/2,bar=K.gStyle==="bar";x.clearRect(0,0,W,H);x.lineCap="round";
  if(K.gShowTitle){x.fillStyle=soft;x.font="600 12px "+K.gNumFont;x.textAlign="center";x.fillText(K.gTitle||"",60,14);}
  if(K.gShowValue){x.fillStyle=ink;x.font="600 20px "+K.gNumFont;x.textAlign="center";x.fillText(g.inHg.toFixed(2),48,40);}
  if(K.gShowTrend){x.fillStyle=g.fall?och:ink;scArrow(x,g.d>0,Math.abs(g.d)>1,!(Math.abs(g.d)>.4),100,32);}
  // zone words and hairline boundaries
  if(K.gShowZones)for(const z of GL_Z){const yc=(Y(z[0])+Y(z[1]))/2,on=z[2]===g.zone;x.font=(on?"600 ":"")+"italic 15px "+K.gWordFont;x.textAlign="right";x.fillStyle=on?ink:soft;x.globalAlpha=on?1:.75;x.fillText(z[2],TX-8,yc+5);x.globalAlpha=1;
    if(z[1]<GL_HI){x.strokeStyle=soft;x.lineWidth=.8;x.globalAlpha=.6;x.beginPath();x.moveTo(6,Y(z[1]));x.lineTo(TX-2,Y(z[1]));x.stroke();x.globalAlpha=1;}}
  // the tube and the quicksilver
  scTube(x,T,B,TX,TW,K.gStyle,ink);
  const fa=isFinite(+K.gFluidA)?+K.gFluidA:.82;
  if(!bar){const by=B+14;x.beginPath();x.arc(TX+TW/2,by,13,0,2*Math.PI);x.fillStyle=fl;x.globalAlpha=fa;x.fill();x.globalAlpha=1;x.strokeStyle=ink;x.stroke();}
  x.fillStyle=fl;x.globalAlpha=fa;x.fillRect(TX+3,Y(g.inHg),TW-6,(bar?B:B+14)-Y(g.inHg));x.globalAlpha=1;
  x.fillStyle="rgba(255,255,255,.35)";x.fillRect(TX+4,Y(g.inHg)+2,2,B-Y(g.inHg));
  // pointer at the level
  x.fillStyle=g.fall?och:ink;x.beginPath();x.moveTo(TX-3,Y(g.inHg));x.lineTo(TX-12,Y(g.inHg)-5);x.lineTo(TX-12,Y(g.inHg)+5);x.closePath();x.fill();
  // scale: a tick every 0.1, a figure every half inch
  if(K.gShowScale){x.strokeStyle=ink;x.fillStyle=soft;x.font="12px "+K.gNumFont;x.textAlign="left";
    for(let v=Math.ceil(GL_LO*10)/10;v<=GL_HI+.001;v+=.1){const big=Math.abs(v*2-Math.round(v*2))<.01,yy=Y(v);x.lineWidth=big?1.2:.7;x.beginPath();x.moveTo(TX+TW+2,yy);x.lineTo(TX+TW+(big?10:6),yy);x.stroke();if(big)x.fillText(v.toFixed(1),TX+TW+13,yy+4);}}
}
let sailgKey="";
function drawSailGauge(sh){const {$,S,DARK,SHIP,NOGO,BMAX,SAILS,PORTS,glassInfo,GL_HI,GL_LO,GL_Z,invEff,effOf,planOf,clamp,windAt,optBrace,angDiff,dialShip,beaufort,currentAt,dl,dg,PI,D2R}=G;const c=$("sailSteps5");if(!c||c.hidden)return;const K=DRSC.c;
  const top=Math.max(1,invEff(effOf(planOf(SAILS.length-1)))),lv=clamp(sh.sailSet/top,0,1),tg=clamp(invEff(effOf(planOf(sh.sail)))/top,0,1),mv=Math.abs(lv-tg)>.015,up=tg>lv,
    key=lv.toFixed(3)+"|"+tg.toFixed(2)+"|"+DARK+"|"+SHIP.id+(c.clientWidth|0)+"|"+DRSC.rev;if(key===sailgKey)return;sailgKey=key;
  const x=c.getContext("2d"),ink=scInk(K.sInk,"--ink","#2e2519"),soft=scInk(K.sSoft,"--ink-soft","#7b6a55"),br=scInk(K.sTarget,"--brass","#b8862a"),fl=scInk(K.sFill,"--ink",ink),fa=isFinite(+K.sFillA)?+K.sFillA:.82;
  const W=120,H=500,T=62,B=462,Y=v=>B-v*(B-T),TW=Math.max(6,Math.min(30,+K.sTubeW||14)),TX=65-TW/2,NM=["Bare","Reefed",SHIP.fa?"Reefed":"Courses","Plain","Full"];x.clearRect(0,0,W,H);x.lineCap="round";
  if(K.sShowTitle){x.fillStyle=soft;x.font="600 12px "+K.sNumFont;x.textAlign="center";x.fillText(K.sTitle||"",60,14);}
  if(K.sShowValue){x.fillStyle=ink;x.font="600 20px "+K.sNumFont;x.textAlign="center";x.fillText(Math.round(lv*100)+"%",48,40);}
  if(mv){x.fillStyle=ink;scArrow(x,up,false,false,100,32);}
  const cur=Math.min(4,Math.floor(lv*5));
  if(K.sShowNames)for(let k=0;k<5;k++){const y0=Y(k/5),y1=Y((k+1)/5),yc=(y0+y1)/2,on=k===cur;x.font=(on?"600 ":"")+"italic 15px "+K.sWordFont;x.textAlign="right";x.fillStyle=on?ink:soft;x.globalAlpha=on?1:.75;x.fillText(NM[k],TX-8,yc+5);x.globalAlpha=1;
    if(k<4){x.strokeStyle=soft;x.lineWidth=.8;x.globalAlpha=.6;x.beginPath();x.moveTo(6,y1);x.lineTo(TX-2,y1);x.stroke();x.globalAlpha=1;}}
  if(K.sStyle==="blocks"){ // five stacked blocks, lit up to the sail set
    for(let k=0;k<5;k++){const y0=Y(k/5),y1=Y((k+1)/5),f=clamp(lv*5-k,0,1);x.strokeStyle=ink;x.lineWidth=1.4;x.strokeRect(TX,y1+3,TW,y0-y1-6);
      if(f>0){x.fillStyle=fl;x.globalAlpha=fa;x.fillRect(TX+2,y0-3-(y0-y1-6)*f+0,TW-4,(y0-y1-6)*f-2);x.globalAlpha=1;}}}
  else{scTube(x,T,B,TX,TW,K.sStyle,ink);
    if(K.sStyle!=="bar"){x.beginPath();x.moveTo(TX,B);x.lineTo(TX+TW,B);x.stroke();}
    if(lv>.005){x.fillStyle=fl;x.globalAlpha=fa;x.fillRect(TX+3,Y(lv),TW-6,B-Y(lv));x.globalAlpha=1;x.fillStyle="rgba(255,255,255,.35)";x.fillRect(TX+4,Y(lv)+2,2,B-Y(lv));}}
  x.fillStyle=ink;x.beginPath();x.moveTo(TX-3,Y(lv));x.lineTo(TX-12,Y(lv)-5);x.lineTo(TX-12,Y(lv)+5);x.closePath();x.fill();
  // the stage ordered: a brass marker on the scale side
  if(K.sShowTarget){x.fillStyle=br;x.beginPath();x.moveTo(TX+TW+3,Y(tg));x.lineTo(TX+TW+13,Y(tg)-5);x.lineTo(TX+TW+13,Y(tg)+5);x.closePath();x.fill();}
  if(K.sShowScale){x.strokeStyle=ink;x.fillStyle=soft;x.font="12px "+K.sNumFont;x.textAlign="left";
    for(let k=0;k<=4;k++){const yy=Y(k/4);x.lineWidth=1.2;x.beginPath();x.moveTo(TX+TW+2,yy);x.lineTo(TX+TW+8,yy);x.stroke();x.fillText(k*25+"",TX+TW+16,yy+4);}}
}
function drawDial(){const {$,S,DARK,SHIP,NOGO,BMAX,SAILS,PORTS,glassInfo,GL_HI,GL_LO,GL_Z,invEff,effOf,planOf,clamp,windAt,optBrace,angDiff,dialShip,beaufort,currentAt,dl,dg,PI,D2R}=G;
  const g=dg,W=dl.width,R=W/2-30,K=DRSC.c;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,W);g.translate(W/2,W/2);
  if(!S)return;const sh=S.ship,w=windAt(S,sh.x,sh.y,S.t);
  // card
  g.fillStyle=K.cCard;g.beginPath();g.arc(0,0,R,0,2*PI);g.fill();
  if(K.cStyle==="rose"){ // an eight-point compass rose under the card marks
    const star=(n,r1,r2,rot,a,b)=>{for(let i=0;i<n;i++){const t=rot+i*2*PI/n,l=t-PI/n,rr=t+PI/n;
      g.beginPath();g.moveTo(0,0);g.lineTo(Math.sin(t)*r1,-Math.cos(t)*r1);g.lineTo(Math.sin(l)*r2,-Math.cos(l)*r2);g.closePath();g.fillStyle=a;g.fill();
      g.beginPath();g.moveTo(0,0);g.lineTo(Math.sin(t)*r1,-Math.cos(t)*r1);g.lineTo(Math.sin(rr)*r2,-Math.cos(rr)*r2);g.closePath();g.fillStyle=b;g.fill();}};
    g.save();g.globalAlpha=.55;star(4,R*.42,R*.12,PI/4,K.cRoseA,K.cRoseB);star(4,R*.78,R*.15,0,K.cRoseA,K.cRoseB);g.restore();}
  const wf=w.from*D2R-PI/2;if(K.cShowNogo){g.fillStyle=K.cNogo;g.beginPath();g.moveTo(0,0);g.arc(0,0,R,wf-NOGO*D2R,wf+NOGO*D2R);g.closePath();g.fill();}
  g.strokeStyle=K.cRim;g.lineWidth=+K.cRimW||2.5;g.beginPath();g.arc(0,0,R,0,2*PI);g.stroke();
  g.strokeStyle=K.cTicks;for(let i=0;i<32;i++){const a=i*11.25*D2R-PI/2,l=i%8===0?26:i%4===0?18:10;g.lineWidth=i%8===0?3:1.4;g.beginPath();g.moveTo(Math.cos(a)*R,Math.sin(a)*R);g.lineTo(Math.cos(a)*(R-l),Math.sin(a)*(R-l));g.stroke();}
  const LS=+K.cLetterSize||34;g.font=LS+"px "+K.cLetterFont;g.textAlign="center";g.textBaseline="middle";
  [["N",0],["E",90],["S",180],["W",270]].forEach(([t,d])=>{const a=d*D2R-PI/2;g.fillStyle=t==="N"?K.cNorth:K.cLetters;g.fillText(t,Math.cos(a)*(R-48),Math.sin(a)*(R-48));});
  if(+K.cPoints===8){g.font=Math.round(LS*.5)+"px "+K.cLetterFont;[["NE",45],["SE",135],["SW",225],["NW",315]].forEach(([t,d])=>{const a=d*D2R-PI/2;g.fillStyle=K.cLetters;g.fillText(t,Math.cos(a)*(R-44),Math.sin(a)*(R-44));});}
  // inner ring: where the sails face, in the ship's frame (0 is dead ahead, 50 degrees each way); one orange arrow
  { const r0=R*.5,r1=R*.62,pt=(deg,r)=>[Math.sin(deg*D2R)*r,-Math.cos(deg*D2R)*r],optF=-optBrace(angDiff(sh.heading,w.from)),face=-sh.brace;
    g.save();g.rotate(sh.heading*D2R);
    if(K.cShowRing){g.strokeStyle=K.cRing;g.lineWidth=1.6;g.beginPath();g.arc(0,0,r0,0,2*PI);g.stroke();g.beginPath();g.arc(0,0,r1,0,2*PI);g.stroke();
    const BX=BMAX;for(const c of[0,180]){g.fillStyle=K.cBraceFill;g.beginPath();g.arc(0,0,r1,(c-BX-90)*D2R,(c+BX-90)*D2R);g.arc(0,0,r0,(c+BX-90)*D2R,(c-BX-90)*D2R,true);g.closePath();g.fill();
      g.strokeStyle=K.cRing;g.lineWidth=1.4;const KX=Math.floor(BX/10);for(let k=-KX;k<=KX;k++){const m=pt(c+k*10,r1),n=pt(c+k*10,r1-(k%5===0?14:7));g.beginPath();g.moveTo(m[0],m[1]);g.lineTo(n[0],n[1]);g.stroke();}
      if(K.cShowOpt){g.setLineDash([4,3]);g.strokeStyle=K.cOpt;g.lineWidth=2.2;{const m=pt(c+optF,r0-3),n=pt(c+optF,r1+3);g.beginPath();g.moveTo(m[0],m[1]);g.lineTo(n[0],n[1]);g.stroke();}g.setLineDash([]);}}
    g.fillStyle=K.cBraceArrow;
    const tri=(deg,al)=>{g.save();g.globalAlpha=al;g.beginPath();const t=pt(deg,r1+3),l=pt(deg-6,r1-14),rr=pt(deg+6,r1-14);g.moveTo(t[0],t[1]);g.lineTo(l[0],l[1]);g.lineTo(rr[0],rr[1]);g.closePath();g.fill();g.restore();};
    if(Math.abs(sh.braceCmd-sh.brace)>.5)tri(-sh.braceCmd,.45);
    tri(face,1);}
    g.lineCap="butt";g.restore();
    // heading mark on the outer card
    g.save();g.rotate(sh.heading*D2R);g.strokeStyle=K.cHead;g.lineWidth=4;g.beginPath();g.moveTo(0,-R+16);g.lineTo(0,-R-8);g.stroke();g.restore(); }
  // ordered course marker on the rim
  g.save();g.rotate(sh.ordered*D2R);g.fillStyle=K.cOrdered;g.beginPath();g.moveTo(0,-R-3);g.lineTo(11,-R-20);g.lineTo(-11,-R-20);g.closePath();g.fill();g.restore();
  // ship, drawn top-down in its own frame (bow up)
  if(K.cShowShip){
  const SS=Math.max(.2,Math.min(1.2,+K.cShipScale||.62));
  g.save();g.rotate(sh.heading*D2R);const Rs=164;g.scale(SS,SS);
  const DM=dialShip(Rs),L=DM.L,B=DM.B; // hull length and beam in px
  g.strokeStyle=K.cSpar;g.lineWidth=2;
  g.lineWidth=3;if(DM.bs){g.beginPath();g.moveTo(0,-L*.5-DM.bs);g.lineTo(0,-L*.5);g.stroke();}g.lineWidth=2; // bowsprit
  g.beginPath();g.moveTo(0,-L*.5);g.bezierCurveTo(B*.62,-L*.36,B*.55,L*.2,B*.42,L*.48);g.lineTo(-B*.42,L*.48);g.bezierCurveTo(-B*.55,L*.2,-B*.62,-L*.36,0,-L*.5);g.closePath();
  g.fillStyle=K.cHull;g.fill();g.stroke();
  g.beginPath();g.moveTo(0,-L*.42);g.bezierCurveTo(B*.46,-L*.3,B*.42,L*.18,B*.32,L*.42);g.lineTo(-B*.32,L*.42);g.bezierCurveTo(-B*.42,L*.18,-B*.46,-L*.3,0,-L*.42);g.closePath();
  g.fillStyle=K.cDeck;g.fill();
  g.strokeStyle="rgba(46,37,25,.25)";g.lineWidth=1;for(let y=-L*.3;y<L*.42;y+=12){g.beginPath();g.moveTo(-B*.4,y);g.lineTo(B*.4,y);g.stroke();}
  if(DM.qd)g.fillStyle=K.cQdeck,g.fillRect(-B*.3,L*DM.qd,B*.6,L*(.4-DM.qd)); // quarterdeck
  // yards and sails; fore-and-aft sails swing on their booms (or lateen yards) to leeward, the same plane a yard braced as far would make
  const trimCol=S.trim>.93?"#3f7a4a":S.trim>.75?"#b8862a":"#a8452c";
  const rel=angDiff(sh.heading,w.from);
  const sl=sh.sailSet,cs=Math.cos((rel+sh.brace)*D2R),nowT=performance.now(),kd=1-Math.exp(-Math.min((nowT-(drawDial._t||nowT))/1000,.1)*1.6);drawDial._t=nowT;drawDial._b=(drawDial._b||1)+((Math.sign(cs||1))-(drawDial._b||1))*kd;
  const belly=sl<.05?0:drawDial._b*(10+sl*5)*Math.min(1,.25+Math.abs(cs)); // sail fills away from the wind
  for(const mt of DM.masts){const my=mt.my,half=mt.half;
    if(half){ // a yard and its square sail
    g.save();g.translate(0,my);g.rotate(-sh.brace*D2R);
    if(sl>.05){g.beginPath();g.moveTo(-half,0);g.quadraticCurveTo(0,belly*2,half,0);g.closePath();g.fillStyle=S.aback?"rgba(168,69,44,.55)":K.cSail;g.fill();g.strokeStyle=trimCol;g.lineWidth=5;g.stroke();}
    g.strokeStyle=K.cSpar;g.lineWidth=7;g.lineCap="round";g.beginPath();g.moveTo(-half,0);g.lineTo(half,0);g.stroke();
    g.restore();}
    if(mt.boom){const sb=Math.abs(sh.brace)>1?Math.sign(sh.brace):(rel>=0?1:-1),phi=sb*(90-Math.abs(sh.brace))*D2R,fb=-sb*Math.min(1,Math.abs(belly)/12)*(10+sl*6)*(S.aback?-1:1);
      g.save();g.translate(0,my);g.rotate(phi);
      if(sl>.05){g.beginPath();g.moveTo(0,-mt.fwd);g.quadraticCurveTo(fb*2,(mt.boom-mt.fwd)/2,0,mt.boom);g.closePath();g.fillStyle=S.aback?"rgba(168,69,44,.55)":K.cSail;g.fill();g.strokeStyle=trimCol;g.lineWidth=5;g.stroke();}
      g.strokeStyle=K.cSpar;g.lineWidth=6;g.lineCap="round";g.beginPath();g.moveTo(0,-mt.fwd);g.lineTo(0,mt.boom);g.stroke();g.restore();}
    g.fillStyle=K.cSpar;g.beginPath();g.arc(0,my,8,0,2*PI);g.fill(); // mast
  }
  g.restore();}
  // wind and current as the chart draws them: an arrow downwind with a feather per two Beaufort, and a teal arrow the way the water sets
  { const arrow=(ang,r,L,lw,col,barbs)=>{const ux=Math.sin(ang),uy=-Math.cos(ang),px=ux*r,py=uy*r,ax=px-ux*L/2,ay=py-uy*L/2,bx=px+ux*L/2,by=py+uy*L/2;
      g.strokeStyle=col;g.fillStyle=col;g.lineWidth=lw;g.lineCap="round";g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
      g.beginPath();g.moveTo(bx,by);g.lineTo(bx-ux*14-uy*7,by-uy*14+ux*7);g.lineTo(bx-ux*14+uy*7,by-uy*14-ux*7);g.closePath();g.fill();
      g.lineWidth=lw*.8;for(let k=0;k<barbs;k++){const q=L/2-k*7,fx=px-ux*q,fy=py-uy*q;g.beginPath();g.moveTo(fx,fy);g.lineTo(fx+uy*12,fy-ux*12);g.stroke();}};
    g.save();if(K.cShowWind)arrow((w.from+180)*D2R,R*.84,60,3.5,K.cWind,Math.floor(beaufort(w.kn)/2));
    const cu=currentAt(sh.x,sh.y);if(K.cShowCurrent&&cu&&cu.drift>.02)arrow(cu.set*D2R,-R*.8,56,3,K.cCurrent,0);g.restore(); }
  // a tiny key
  if(K.cShowKey){g.font="bold 15px 'IBM Plex Mono',monospace";g.textAlign="left";g.textBaseline="middle";
  if(K.cShowWind){g.fillStyle=K.cWind;g.fillText("→ wind",-W/2+8,W/2-26);}if(K.cShowCurrent){g.fillStyle=K.cCurrent;g.fillText("→ current",-W/2+8,W/2-8);}}
}
return{drawBaro,drawSailGauge,drawDial,resetKeys(){baroKey="";sailgKey="";}};
};
