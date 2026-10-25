import {gameScore} from './engine.mjs';
export const MODERN_SCORE_FACTOR=2.5;
export const DAILY_SCORE_WEIGHTS=Object.freeze({full:0.7,signal:1});
import {DAILY_TRACKS,dailySchedule,currentDailyRounds,dailyStats} from './daily218.mjs?ui=2.78.0';
/** V2.18: two Daily Challenges, independently validated by the server. */
export function dailySummary(days,day){
 const rounds=currentDailyRounds(days,day);
 if(rounds.single){const round=rounds[rounds.choice],completed=!!round?.finished,allWon=!!round?.won,baseScore=Math.round(gameScore(round||{})*5*(DAILY_SCORE_WEIGHTS[rounds.choice]??1));const streak=allWon?Math.max(1,dailyStats(days,day).current):0,bonus=Math.round(baseScore*Math.min(streak,10)*.05);return {completed,allWon,baseScore,bonus,score:baseScore+bonus,streak,difficulty:rounds.choice};}
 const completed=DAILY_TRACKS.every(track=>rounds[track]?.finished);
 const allWon=DAILY_TRACKS.every(track=>rounds[track]?.won);
 // Normalize 2 new rounds to the earlier 5-mode scoring scale for leaderboard continuity.
 const rawScore=DAILY_TRACKS.reduce((total,track)=>total+gameScore(rounds[track]||{}),0);
 const baseScore=Math.round(rawScore*MODERN_SCORE_FACTOR);
 const stats=dailyStats(days,day);
 const run=allWon?Math.max(1,stats.current):0;
 const bonus=Math.round(baseScore*Math.min(run,10)*.05);
 return {completed,allWon,baseScore,bonus,score:baseScore+bonus,streak:run};
}
export function buildSubmission(days,day,displayName){
 const rounds=currentDailyRounds(days,day),schedule=dailySchedule(day);
 if(rounds.single){const chosen=days[day].daily265,r=chosen.round;return {protocol:chosen.protocol==='v278'?'v278':'v265',day,displayName,difficulty:chosen.track,legacyMigration:chosen.migrated===true,rounds:{[chosen.track]:{gameMode:chosen.gameMode,guesses:r.guesses,hints:r.hints,mode:r.mode,timeLimit:r.timeLimit,finished:r.finished,won:r.won,loss:r.loss,startedAt:r.startedAt,finishedAt:r.finishedAt}}};}
 return {protocol:'v218',day,displayName,rounds:Object.fromEntries(DAILY_TRACKS.map(track=>{
  const r=rounds[track];
  return [track,{gameMode:schedule[track],guesses:r?.guesses||[],hints:r?.hints||[],mode:r?.mode||track,timeLimit:r?.timeLimit||0,finished:r?.finished||false,won:r?.won||false,loss:r?.loss||null,startedAt:r?.startedAt||null,finishedAt:r?.finishedAt||null}];
 }))};
}
