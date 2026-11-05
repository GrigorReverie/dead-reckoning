/* engine/core/events.js: the event bus. Simulation code never touches the screen: it emits
   events and each game's UI subscribes. Handlers run synchronously, in the order they were
   added, so emitting is exactly like calling the UI directly (same order, same timing).
   EV.on(type,fn) -> returns an off() function; EV.off(type,fn); EV.once(type,fn); EV.emit(type,...args)
   say(msg,opts) is the engine's notice call: it emits "say" (opts: pause, slow, log, toast). */
const EV=(()=>{const H=new Map();
  const on=(t,fn)=>{let a=H.get(t);if(!a){a=[];H.set(t,a);}a.push(fn);return()=>off(t,fn);};
  const off=(t,fn)=>{const a=H.get(t);if(!a)return;const i=a.indexOf(fn);if(i>=0)a.splice(i,1);};
  const once=(t,fn)=>{const w=(...x)=>{off(t,w);return fn(...x);};return on(t,w);};
  const emit=(t,...x)=>{const a=H.get(t);if(!a||!a.length)return;for(const fn of a.slice())fn(...x);};
  const has=t=>!!(H.get(t)&&H.get(t).length);
  return{on,off,once,emit,has};})();
function say(msg,opts){EV.emit("say",msg,opts||{});}
