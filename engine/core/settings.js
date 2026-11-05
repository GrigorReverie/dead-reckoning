/* engine/core/settings.js: player options and questions the simulation asks the game.
   The engine asks optOn("id") instead of reading a checkbox or the page. The game decides how
   to answer: OPT.def(id,fn) for one named question, OPT.use(fn) for everything else. */
const OPT=(()=>{const D=new Map();let fb=()=>false;
  return{def(id,fn){D.set(id,fn);},use(fn){fb=fn;},get(id){const f=D.get(id);return f?f(id):fb(id);}};})();
const optOn=id=>OPT.get(id);
