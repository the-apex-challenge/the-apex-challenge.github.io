import test from 'node:test';import assert from 'node:assert/strict';
import {progressStats,collectedIntel,dailyShare,resetCountdown,INTEL_CATALOG} from '../src/progress280.mjs';
import {todayHub,archivePanel,resultPanel} from '../src/experience280.mjs';
import {chooseDaily} from '../src/daily265.mjs';import {legends} from '../src/data.mjs';import {tryGuess} from '../src/engine.mjs';import {intelFor} from '../src/daily218.mjs';
test('reset countdown uses UTC and changes correctly at midnight',()=>{
 assert.equal(resetCountdown(Date.parse('2026-10-25T23:59:59Z')),'00:00:01');assert.equal(resetCountdown(Date.parse('2026-10-26T00:00:00Z')),'24:00:00');
});
test('stats derive only recorded completed Daily results without modifying history',()=>{
 const days={a:{daily265:{track:'full',round:{finished:true,won:true,guesses:['A','B']}}},b:{daily265:{track:'signal',round:{finished:true,won:false,guesses:[]}}},c:{daily265:{track:'full',round:{finished:false}}},legacy:{daily218:{full:{won:true,finished:true}}}};
 const snapshot=JSON.stringify(days),s=progressStats(days);assert.equal(s.played,2);assert.equal(s.won,1);assert.equal(s.distribution[1],1);assert.deepEqual(s.difficulty.full,{played:1,won:1});assert.deepEqual(s.difficulty.signal,{played:1,won:0});assert.equal(JSON.stringify(days),snapshot);
});
test('Intel archive recovers completed puzzles, Trivia days and historical claims without exposing locked notes',()=>{
 const day='2026-10-25',s={days:{[day]:{daily265:{round:{finished:true}}}},intelOpenedDays:{'2026-10-24:1':true,'2026-10-23':true}};
 const snapshot=JSON.stringify(s),unlocked=collectedIntel(s,[day]);assert.ok(unlocked.has(intelFor(day,1).title));assert.ok(unlocked.has(intelFor(day,2).title));assert.ok(unlocked.has(intelFor('2026-10-23',2).title));assert.equal(JSON.stringify(s),snapshot);
 const locked=archivePanel({unlocked:new Set()});for(const t of INTEL_CATALOG)assert.ok(!locked.includes(t.tip));assert.match(locked,/UNDISCOVERED INTEL/);
 const favorite=INTEL_CATALOG[0];const html=archivePanel({unlocked:new Set([favorite.title]),favorites:[favorite.title],favoriteOnly:true});assert.match(html,/SAVED/);assert.ok(html.includes(favorite.title));
});
test('spoiler-free sharing works for both difficulties and never contains guessed Legend names',()=>{
 for(const track of ['full','signal']){const days={},day='2026-10-25',c=chooseDaily(days,day,track,legends);const wrong=legends.find(l=>l.name!==c.round.answer);c.round=tryGuess(c.round,wrong.name,legends,1000);c.round=tryGuess(c.round,c.round.answer,legends,2000);const text=dailyShare(day,c,legends,{score:1234});
 assert.match(text,/2\/[56]/);assert.match(text,/local preview/);for(const l of legends)assert.ok(!text.includes(l.name),l.name);assert.match(text,/🟩/);assert.ok(!dailyShare(day,{round:{finished:false}},legends,{}));}
});
test('Daily hub changes from play to resume to results and does not require a nickname',()=>{
 const base={day:'2026-10-25',triviaDone:false,streak:0};assert.match(todayHub(base),/PLAY DAILY/);assert.match(todayHub({...base,chosen:{track:'signal',round:{}}}),/RESUME DAILY/);assert.match(todayHub({...base,chosen:{track:'full',round:{finished:true}}}),/VIEW RESULT/);assert.doesNotMatch(todayHub(base),/nickname/i);
});
test('result panel uses authoritative score components when a receipt exists',()=>{
 const html=resultPanel({track:'full',round:{finished:true,won:true,guesses:['x'],hints:[],startedAt:1000,finishedAt:6000}},{baseScore:9000,bonus:500},{baseScore:6000,streakBonus:300});assert.match(html,/Base 6,000 \+ streak 300/);assert.match(html,/5s/);
});
