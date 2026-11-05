/* engine/tutorial/tutorial.js: a guided lesson runner. Logic only: the game gives it a lesson, it tracks which step the
   player is on and says (by event) when the step changes, when the player seems stuck and when the lesson ends.
   The words, the pictures and the highlight on the screen belong to each game.

   A lesson is {id, stuckMs, steps:[step...]}. A step is
     {id, title, text:(s)=>string, hint:(s)=>string, target:[css selectors] or (s)=>[selectors], ready:(s,f)=>bool, done:(s,f)=>bool, enter:(s,f)=>void}
   done(s,f) is true when the player has done what the step asks. ready(s,f), if given, says when the step
   may be finished by the player pressing "Got it" (tutAck sets f.ack, which a done() can read).
   State on s: tut {id, i, f:{...step flags}, at (ms when this step began), stuck, done, skipped}.
   It is plain numbers and flags, so it saves and loads with the rest of the state.
   Events (EV): "tutStep" (info), "tutStuck" (info), "tutDone" ({skipped}). info = tutInfo(s,lesson). */

/* what the screen needs to draw the current step */
function tutInfo(s,lesson){
  const t=s.tut;if(!t||t.done)return null;
  const st=lesson.steps[t.i];if(!st)return null;
  return{id:st.id,i:t.i,n:lesson.steps.length,title:st.title,text:st.text?st.text(s):"",hint:st.hint?st.hint(s):"",
    target:typeof st.target==="function"?st.target(s):(st.target||[]),ready:!!(st.ready&&st.ready(s,t.f)),stuck:!!t.stuck,speed:!!st.speed};
}
/* begin a lesson at its first step; now is a clock in milliseconds from the caller */
function tutStart(s,lesson,now){
  s.tut={id:lesson.id,i:0,f:{},at:now||0,stuck:false,done:false,skipped:false};
  const st=lesson.steps[0];if(st&&st.enter)st.enter(s,s.tut.f);
  EV.emit("tutStep",tutInfo(s,lesson));
}
/* call a few times a second: moves to the next step when this one is done, flags a stuck player */
function tutStep(s,lesson,now){
  const t=s.tut;if(!t||t.done||t.id!==lesson.id)return;
  const st=lesson.steps[t.i];if(!st){t.done=true;return;}
  if(!t.at)t.at=now;
  if(st.done(s,t.f)){
    t.i++;t.f={};t.at=now;t.stuck=false;
    if(t.i>=lesson.steps.length){t.done=true;EV.emit("tutDone",{skipped:false});return;}
    const nx=lesson.steps[t.i];if(nx.enter)nx.enter(s,t.f);
    EV.emit("tutStep",tutInfo(s,lesson));
  }else if(!t.stuck&&now-t.at>(lesson.stuckMs||25000)){
    t.stuck=true;EV.emit("tutStuck",tutInfo(s,lesson));
  }
}
/* the player pressed "Got it" on a step whose ready() is true */
function tutAck(s,lesson){
  const t=s.tut;if(!t||t.done)return;const st=lesson.steps[t.i];
  if(st&&st.ready&&st.ready(s,t.f))t.f.ack=true;
}
/* leave the lesson early */
function tutSkip(s){
  const t=s.tut;if(!t||t.done)return;t.done=true;t.skipped=true;EV.emit("tutDone",{skipped:true});
}
/* jump to a step by number (for tests) */
function tutGo(s,lesson,i,now){
  const t=s.tut;if(!t)return;t.done=false;t.skipped=false;t.i=Math.max(0,Math.min(lesson.steps.length-1,i));t.f={};t.at=now||0;t.stuck=false;
  const st=lesson.steps[t.i];if(st.enter)st.enter(s,t.f);
  EV.emit("tutStep",tutInfo(s,lesson));
}
