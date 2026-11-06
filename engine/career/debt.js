/* engine/career/debt.js: the Career debt ladder. You owe a patron a sum for a season of twelve game weeks. Pay it down at a
   quay. Pay it all and the next season starts on your current rung; fall short and you step down one rung, the ship sold in
   part exchange toward the debt, and your crew stay with you. Failure is a chapter, not a game over. Logic only.
   Money is in the game's smallest unit (the game uses shillings); time is in hours (s.t).
   State on `s`: s.debt = {season, t0, d0 (debt at the start of the season), owed, paid, interest, fees, deadline, weekDone,
     extUsed, letter, state: "open" | "cleared" | "due"}. Needs s.t, s.purse, s.done.
   `hard` (the game's Captain mode) means 2% interest a week and no grace; the easier mode has no interest and four free weeks.
   Events (the game words and draws them): EV.emit("debt", kind, ...)
     "start", debt        a new season began
     "paid", amount       a payment was made
     "interest", amount, week   Captain only, weekly
     "letter"             week six: the patron writes to say where you stand
     "cleared"            owed reached zero: call debtSettle
     "due"                the season (and any grace) ran out: call debtSettle
   Knobs: DBK. */
const DBK={weeks:12,weekH:168,mult:8/3,round:100,rateHard:.02,graceWeeks:4,warnFrac:.25,extWeeks:2,extFee:300,letterWeek:6,wharfFrac:.5,credit:.6,moraleHit:.1};
/* the season's debt for a rung, from the price of the ship you command */
const dbtBase=price=>Math.max(DBK.round,Math.round(price*DBK.mult/DBK.round)*DBK.round);
function debtStart(s,price,carry){const prev=s.debt,owed=Math.max(dbtBase(price),carry||0);
  s.debt={season:prev?prev.season+1:1,t0:s.t,d0:owed,owed,paid:0,interest:0,fees:0,deadline:s.t+DBK.weeks*DBK.weekH,weekDone:0,extUsed:false,letter:false,state:"open"};
  EV.emit("debt","start",s.debt);return s.debt;}
/* pay toward the debt from the purse; returns what was actually paid */
function debtPay(s,amt){const d=s.debt;if(!d||d.state!=="open"||d.owed<=0)return 0;
  amt=Math.max(0,Math.min(Math.round(amt),Math.floor(s.purse),Math.ceil(d.owed)));if(amt<=0)return 0;
  s.purse-=amt;d.owed-=amt;d.paid+=amt;EV.emit("debt","paid",amt);
  if(d.owed<=0){d.owed=0;d.state="cleared";EV.emit("debt","cleared");}return amt;}
const debtLimit=(d,hard)=>d.deadline+(hard?0:DBK.graceWeeks*DBK.weekH);
/* each simulation step: weekly interest (hard only), the week-six letter, and the due date */
function debtStep(s,hard){const d=s.debt;if(!d||d.state!=="open"||s.done)return;
  const w=Math.floor((s.t-d.t0)/DBK.weekH);
  while(d.weekDone<w){d.weekDone++;
    if(hard&&d.owed>0){const i=Math.round(d.owed*DBK.rateHard);d.owed+=i;d.interest+=i;EV.emit("debt","interest",i,d.weekDone);}
    if(d.weekDone===DBK.letterWeek&&!d.letter){d.letter=true;EV.emit("debt","letter");}}
  if(d.owed<=0){d.owed=0;d.state="cleared";EV.emit("debt","cleared");return;}
  if(s.t>=debtLimit(d,hard)){d.state="due";EV.emit("debt","due");}}
/* what the bar shows: weeks left, whether the grace has begun, and how much is paid */
function debtInfo(s,hard){const d=s.debt;if(!d)return null;
  const left=(d.deadline-s.t)/DBK.weekH,grace=!hard&&left<0&&d.state==="open";
  return{owed:d.owed,d0:d.d0,frac:d.d0>0?Math.min(1,Math.max(0,1-d.owed/d.d0)):1,weeksLeft:Math.max(0,left),grace,
    graceLeft:grace?Math.max(0,(debtLimit(d,hard)-s.t)/DBK.weekH):0,season:d.season,state:d.state};}
/* the ledger: paid, a warning (short by a quarter or less, once per season), or the fall.
   ladder is [[shipId,price],...] from the smallest ship up; rung is the index of the ship you command (-1 if not on it). */
function debtSettle(s,ladder,rung){const d=s.debt;
  if(d.owed<=0)return{kind:"paid",paid:d.paid,interest:d.interest,fees:d.fees,season:d.season};
  if(!d.extUsed&&d.owed<=DBK.warnFrac*d.d0)return{kind:"warn",fee:DBK.extFee,weeks:DBK.extWeeks,owed:d.owed};
  return debtFall(s,ladder,rung);}
function debtExtend(s){const d=s.debt;d.extUsed=true;d.owed+=DBK.extFee;d.fees+=DBK.extFee;d.deadline+=DBK.extWeeks*DBK.weekH;d.state="open";}
/* the fall: ship repossessed at the part-exchange rate, that cash goes to the debt, and you are lent the rung below.
   On the bottom rung (or off the ladder) it is wharf work: the debt is cut and the ship stays. */
function debtFall(s,ladder,rung){const d=s.debt,base=dbtBase(ladder[0][1]);
  if(rung<=0)return{kind:"wharf",owed:d.owed,owedAfter:Math.round(base*DBK.wharfFrac/DBK.round)*DBK.round};
  const credit=Math.round(DBK.credit*ladder[rung][1]);let left=d.owed-credit,surplus=0;if(left<0){surplus=-left;left=0;}
  return{kind:"demote",from:ladder[rung][0],to:ladder[rung-1][0],credit,surplus,owed:d.owed,owedAfter:Math.max(left,dbtBase(ladder[rung-1][1]))};}
