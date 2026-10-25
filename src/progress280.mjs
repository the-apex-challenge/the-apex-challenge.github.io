import {FIELDS,compare,legendByName,maxGuesses} from './engine.mjs';
import {intelFor} from './daily218.mjs?ui=2.78.0';
import {COMMUNITY_INTEL} from './community_intel265.mjs';
export const INTEL_CATALOG=Object.values(COMMUNITY_INTEL).flat();
export function resetCountdown(now=Date.now()){
 const seconds=Math.ceil((86400000-(now%86400000))/1000);
 return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function progressStats(days={}){
 const completed=[],distribution=Array(6).fill(0),difficulty={full:{played:0,won:0},signal:{played:0,won:0}};
 for(const [day,entry] of Object.entries(days)){
  const c=entry?.daily265;if(!c?.round?.finished)continue;
  const r=c.round;completed.push({day,track:c.track,won:!!r.won,guesses:r.guesses?.length||0});
  if(difficulty[c.track]){difficulty[c.track].played++;difficulty[c.track].won+=Number(!!r.won);}
  if(r.won&&r.guesses?.length>=1&&r.guesses.length<=6)distribution[r.guesses.length-1]++;
 }
 return {completed,distribution,difficulty,played:completed.length,won:completed.filter(r=>r.won).length};
}
export function collectedIntel(store,triviaDays=[]){
 const titles=new Set(store.intelCollection||[]);
 const add=(day,index)=>{if(/^\d{4}-\d{2}-\d{2}$/.test(day))titles.add(intelFor(day,index).title);};
 for(const [day,entry] of Object.entries(store.days||{}))if(entry?.daily265?.round?.finished||entry?.daily218?.full?.finished||entry?.daily218?.signal?.finished)add(day,1);
 for(const day of triviaDays)add(day,2);
 for(const [key,value] of Object.entries(store.intelOpenedDays||{})){
  if(!value)continue;const m=key.match(/^(\d{4}-\d{2}-\d{2}):(1|2)$/);if(m)add(m[1],Number(m[2]));else if(/^\d{4}-\d{2}-\d{2}$/.test(key))add(key,2);
 }
 return titles;
}
export function dailyShare(day,chosen,roster,summary){
 const r=chosen?.round;if(!r?.finished)return null;
 const target=legendByName(roster,r.answer);
 const grid=r.guesses.map(name=>{
  if(name===r.answer)return '🟩'.repeat(r.mode==='full'?FIELDS.length:1);
  if(r.mode==='full'){const candidate=legendByName(roster,name);return FIELDS.map(f=>{const kind=candidate&&target?compare(candidate,target,f).kind:'unknown';return kind==='correct'?'🟩':kind==='wrong'?'⬛':'⬜';}).join('');}
  const signal=r.signals?.find(s=>s.guess===name);return signal?.kind==='correct'?'🟩':signal?.kind==='wrong'?'⬛':'⬜';
 }).join('\n');
 const limit=maxGuesses(r),difficulty=chosen.track==='full'?'Easy · Full Scan':'Hard · One Signal';
 return `The Apex Challenge · ${day}\n${difficulty} · ${r.won?r.guesses.length:'X'}/${limit}\n${grid}\n${Number(summary.score)||0} pts${summary.submitted?'':' · local preview'} · ${r.hints?.length||0} hints\nhttps://the-apex-challenge.github.io/`;
}
