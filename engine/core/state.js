/* engine/core/state.js: the live game state and the sim clock.
   S is the whole game (null before a voyage starts); speedMult is game seconds per real second;
   paused stops the clock. MAXSTEP is the longest single simulation step (one game second, in hours). */
let S=null, speedMult=1, paused=false;
const MAXSTEP=1/3600;
/* clockStr(hours,secs): "hh:mm" (or "hh:mm:ss") for a time of day in hours, wrapped to 0..24 */
function clockStr(h0,secs){const lh=((h0%24)+24)%24;const h=Math.floor(lh),m=Math.floor((lh-h)*60),sc=Math.floor(((lh-h)*60-m)*60);return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}${secs?":"+String(sc).padStart(2,"0"):""}`;}
