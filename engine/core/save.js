/* engine/core/save.js: turning game state into text and back. Sets and non-finite numbers
   survive the round trip. savePack shrinks a big state: when the text is longer than `limit`,
   arrays named in `thin` keep about that many evenly spaced points (and the last one), and
   arrays named in `tail` keep only their last N entries. Where the text is stored (device,
   account, cloud) is up to each game. */
const saveRep=(k,v)=>v instanceof Set?{__set:[...v]}:(typeof v==="number"&&!isFinite(v)?{__num:String(v)}:v);
const saveEncode=o=>JSON.stringify(o,saveRep);
const saveDecode=j=>JSON.parse(j,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)?(v.__set!==undefined?new Set(v.__set):(v.__num!==undefined?Number(v.__num):v)):v);
function savePack(o0,{limit=200000,thin={},tail={}}={}){let j=saveEncode(o0);if(j.length>limit){const o=saveDecode(j);
  for(const k in thin){const n=thin[k],a=o[k];if(Array.isArray(a)&&a.length>n)o[k]=a.filter((_,i)=>i%Math.ceil(a.length/n)===0||i===a.length-1);}
  for(const k in tail){const n=tail[k];if(o[k]&&o[k].length>n)o[k]=o[k].slice(-n);}
  j=JSON.stringify(o,saveRep);}return j;}
