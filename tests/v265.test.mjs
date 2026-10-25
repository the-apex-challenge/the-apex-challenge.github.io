import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {chooseDaily,chosenDaily,migrateSingleDaily,DAILY_RULES} from '../src/daily265.mjs';import {currentDailyRounds,checkpointCount,nextDailyStep} from '../src/daily218.mjs';import {legends} from '../src/data.mjs';import {newRound,tryGuess,utcDay} from '../src/engine.mjs';import {dailySummary,buildSubmission} from '../src/scoring.mjs';import {COMMUNITY_INTEL} from '../src/community_intel265.mjs';
const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8'),source=readFileSync(new URL('../supabase/functions/submit-score/index.ts',import.meta.url),'utf8');
test('both difficulties expose the same single daily mystery over a week',()=>{for(let n=20;n<27;n++){const day='2026-10-'+n,a=chooseDaily({},day,'full',legends),b=chooseDaily({},day,'signal',legends);assert.equal(a.gameMode,b.gameMode);assert.equal(a.round.answer,b.round.answer);assert.equal(a.round.mode,'full');assert.equal(b.round.mode,'signal');assert.equal(a.round.timeLimit,120);}});
test('a selected difficulty cannot be switched even before the first guess or after reload',()=>{const days={},a=chooseDaily(days,'2026-10-20','signal',legends);assert.equal(chooseDaily(days,'2026-10-20','full',legends),a);const copy=JSON.parse(JSON.stringify(days));assert.equal(chooseDaily(copy,'2026-10-20','full',legends).track,'signal');assert.equal(chosenDaily(copy,'2026-10-21'),null);assert.throws(()=>chooseDaily({},'2026-10-20','invalid',legends));});
test('legacy active and finished rounds migrate without changing their answers or guesses',()=>{for(const finished of [false,true]){const old={...newRound('Mirage','full',120),guesses:['Newcastle'],startedAt:1,finished};const days={'2026-10-20':{daily218:{full:old}}};assert.equal(migrateSingleDaily(days,'2026-10-20'),true);assert.equal(days['2026-10-20'].daily265.round,old);assert.equal(migrateSingleDaily(days,'2026-10-20'),false);assert.equal(days['2026-10-20'].daily218.full,old);}});
test('an untouched legacy placeholder does not choose Easy automatically',()=>{const days={'2026-10-20':{daily218:{full:newRound('Mirage','full',0)}}};assert.equal(migrateSingleDaily(days,'2026-10-20'),false);assert.equal(chooseDaily(days,'2026-10-20','signal',legends).track,'signal');});
test('one completed puzzle unlocks one Intel and its score; next goes to Trivia or rankings',()=>{const days={},c=chooseDaily(days,'2026-10-20','signal',legends);c.round=tryGuess(c.round,c.round.answer,legends,1);const rounds=currentDailyRounds(days,'2026-10-20');assert.equal(checkpointCount(days,'2026-10-20'),1);assert.equal(dailySummary(days,'2026-10-20').completed,true);assert.equal(nextDailyStep(rounds),'trivia');assert.equal(nextDailyStep(rounds,true),'leaderboard');const payload=buildSubmission(days,'2026-10-20','Tester');assert.equal(payload.protocol,'v278');assert.deepEqual(Object.keys(payload.rounds),['signal']);});
test('chooser clearly explains both difficulties, guesses, hints and timer',()=>{assert.equal(DAILY_RULES.full.guesses,5);assert.equal(DAILY_RULES.signal.guesses,6);for(const text of ['EASY MODE','HARD MODE','CHOOSE YOUR CHALLENGE','120 seconds from your first guess','no difficulty switching'])assert.ok(app.includes(text));assert.doesNotMatch(app,/START PUZZLE #2/);});
test('12 community techniques include source, input scope, reasoning, mistake and drill',()=>{const tips=Object.values(COMMUNITY_INTEL).flat();assert.equal(tips.length,12);assert.equal(new Set(tips.map(t=>t.title)).size,12);for(const tip of tips){assert.ok(tip.why&&tip.mistake&&tip.drill&&tip.input&&tip.sourceName);assert.ok(tip.source.startsWith('https://'));assert.doesNotMatch(tip.source,/ea[.]com/);assert.equal(tip.reviewed,'2026-10-20');}});
function server({prior=false,nicknameConflict=false}={}){let handler,inserted;const client={auth:{getUser:async()=>({data:{user:{id:'test-user',is_anonymous:true}},error:null})},from:()=>{let column;const q={select:c=>{column=c;return q},eq:()=>q,maybeSingle:async()=>({data:column==='user_id'&&prior?{user_id:'test-user'}:null,error:null}),insert:async row=>{inserted=row;return {error:nicknameConflict?{code:'23505',message:'Nickname already taken'}:null}}};return q}};
let js=source.replace(/^import .*;$/gm,'').replaceAll(':unknown','').replaceAll(':string','').replaceAll(':Request','').replaceAll(':any','').replaceAll(':Record<string,unknown>','').replaceAll(' as string','');vm.runInNewContext(js,{createClient:()=>client,legends,MODES:['classic','pixel','quote','ability','emoji'],hash,puzzleAnswers,Response,Date,Deno:{env:{get:()=> 'configured'},serve:fn=>handler=fn}});return {call:async payload=>{const res=await handler({method:'POST',headers:new Headers({Origin:'https://the-apex-challenge.github.io',Authorization:'Bearer test'}),text:async()=>JSON.stringify(payload)});return {status:res.status,body:await res.json(),inserted}}};}
import {hash,puzzleAnswers} from '../src/engine.mjs';
import {gameScore} from '../src/engine.mjs';

test('Easy has a 70 percent Daily weight and Hard retains its original score, with the streak bonus applied afterwards',()=>{
 const day=utcDay(),scores={};
 for(const track of ['full','signal']){
  const days={},c=chooseDaily(days,day,track,legends);
  c.round=tryGuess(c.round,c.round.answer,legends,1000);
  c.round.finishedAt=11000;
  const summary=dailySummary(days,day);
  assert.equal(summary.baseScore,Math.round(gameScore(c.round)*5*(track==='full'?0.7:1)));
  assert.equal(summary.bonus,Math.round(summary.baseScore*.05));
  scores[track]=summary.baseScore;
 }
 assert.equal(scores.full,Math.round(scores.signal*.7));
});

test('client and authoritative server agree on weighted scores with guesses, hints and losses; client multipliers cannot override the server',async()=>{
 const day=utcDay(),end=Date.now()-100,start=Math.max(Date.parse(day+'T00:00:00Z'),end-10000);
 for(const track of ['full','signal'])for(const guesses of [1,3,5])for(const hints of [0,1,2]){
  const days={},c=chooseDaily(days,day,track,legends);
  const wrong=legends.filter(l=>l.name!==c.round.answer).slice(0,guesses-1);
  for(const l of wrong)c.round=tryGuess(c.round,l.name,legends,start);
  c.round=tryGuess(c.round,c.round.answer,legends,start);
  c.round={...c.round,hints:['age','role'].slice(0,hints),finishedAt:end};
  const expected=dailySummary(days,day),payload={...buildSubmission(days,day,'WeightedScore'),score:999999,multiplier:1};
  const res=await server().call(payload);
  assert.equal(res.status,200,JSON.stringify(res.body));
  assert.equal(res.body.baseScore,expected.baseScore);
  assert.equal(res.body.streakBonus,expected.bonus);
  assert.equal(res.body.totalScore,expected.score);
 }
 for(const track of ['full','signal']){
  const days={},c=chooseDaily(days,day,track,legends);
  for(const l of legends.filter(l=>l.name!==c.round.answer).slice(0,track==='full'?5:6))c.round=tryGuess(c.round,l.name,legends,start);
  c.round.finishedAt=end;
  const res=await server().call(buildSubmission(days,day,'WeightedLoss'));
  assert.equal(res.status,200);assert.equal(res.body.totalScore,0);assert.equal(dailySummary(days,day).score,0);
 }
});
function validPayload(track){const days={},day=utcDay(),c=chooseDaily(days,day,track,legends);c.round=tryGuess(c.round,c.round.answer,legends,Date.now()-2000);c.round.finishedAt=Date.now()-1000;return buildSubmission(days,day,'Player265');}
test('new Daily uses Classic for both difficulties across 90 UTC dates',()=>{
 for(let n=0;n<90;n++){const day=new Date(Date.UTC(2026,9,1+n)).toISOString().slice(0,10);
 for(const track of ['full','signal']){const c=chooseDaily({},day,track,legends);assert.equal(c.protocol,'v278');assert.equal(c.gameMode,'classic');assert.equal(c.round.answer,puzzleAnswers(day,legends).classic);}}
});
test('untouched rotating choices become Classic while played rounds and historical stats stay intact',()=>{
 for(const started of [false,true]){const day=utcDay(),round=newRound('Mirage','signal',120);if(started){round.startedAt=Date.now()-1000;round.guesses=['Newcastle'];}
 const previous={track:'signal',gameMode:'pixel',round},historic={daily265:{track:'full',gameMode:'quote',round:{finished:true,won:true}}};
 const days={[day]:{daily265:previous},'2026-01-01':historic};const history=JSON.stringify(historic);
 const c=chooseDaily(days,day,'full',legends);assert.equal(c.track,'signal');assert.equal(c.gameMode,started?'pixel':'classic');
 if(started)assert.equal(c,previous);else assert.equal(c.protocol,'v278');assert.equal(JSON.stringify(historic),history);
 }
});
test('Classic protocol rejects every rotating mode even if legacyMigration is forged',async()=>{
 for(const mode of ['pixel','quote','ability','emoji'])for(const legacyMigration of [false,true]){
 const p=validPayload('full');p.legacyMigration=legacyMigration;p.rounds.full.gameMode=mode;
 assert.equal((await server().call(p)).status,400);
 }
});
test('previous v265 single rounds remain valid under their original rotating schedule',async()=>{
 const day=utcDay(),pivot=hash('gtp:v218:daily:'+day)%5,mode=['classic','pixel','quote','ability','emoji'][pivot];
 for(const track of ['full','signal']){const p=validPayload(track);p.protocol='v265';p.rounds[track].gameMode=mode;p.rounds[track].guesses=[puzzleAnswers(day,legends)[mode]];assert.equal((await server().call(p)).status,200);}
});
test('Intel panel uses Daily checkpoint state rather than obsolete five-mode rounds',()=>{
 const panel=app.slice(app.indexOf('function homeIntelPanel(){'),app.indexOf('function homeFeatureDock(){'));
 assert.match(panel,/intelState\(1\)/);assert.doesNotMatch(panel,/rounds\[mode\]|COMPLETE ALL FIVE/);
});
for(const track of ['full','signal'])test('server accepts and recomputes a single '+track+' score',async()=>{const payload=validPayload(track),res=await server().call(payload);assert.equal(res.status,200,JSON.stringify(res.body));assert.equal(res.body.ok,true);assert.deepEqual(Object.keys(res.inserted.round_results),[track]);assert.ok(res.inserted.base_score>0);});
test('server rejects difficulty mismatch, extra rounds and forged timing',async()=>{for(const mutate of [p=>p.difficulty='other',p=>p.rounds.full.mode='signal',p=>p.rounds.full.gameMode='quote',p=>p.rounds.signal={...p.rounds.full},p=>p.rounds.full.startedAt=null,p=>p.rounds.full.finishedAt=Date.now()+60000]){const p=validPayload('full');mutate(p);assert.equal((await server().call(p)).status,400);}});
test('server rejects a second daily score and reports a reserved nickname distinctly',async()=>{assert.equal((await server({prior:true}).call(validPayload('full'))).status,409);const r=await server({nicknameConflict:true}).call(validPayload('full'));assert.equal(r.status,409);assert.match(r.body.error,/Nickname already taken/);});

test('migrated untimed legacy wins retain their original scoring rules',async()=>{const p=validPayload('full'),mode=(await import('../src/daily218.mjs')).dailySchedule(p.day).full;p.protocol='v265';p.rounds.full.gameMode=mode;p.rounds.full.guesses=[puzzleAnswers(p.day,legends)[mode]];p.rounds.full.timeLimit=0;assert.equal((await server().call(p)).status,200);});
test('Classic ranked submissions cannot turn off Rush or submit a blank nickname',async()=>{
 for(const timeLimit of [0,180]){const p=validPayload('full');p.rounds.full.timeLimit=timeLimit;assert.equal((await server().call(p)).status,400);}
 for(const displayName of ['', '   ', ' a ']){const p=validPayload('full');p.displayName=displayName;assert.equal((await server().call(p)).status,400);}
 const p=validPayload('full');p.displayName='  Valid   Name  ';const result=await server().call(p);assert.equal(result.status,200);assert.equal(result.inserted.display_name,'Valid Name');
});

test('a started legacy One Signal round keeps its original mode and can submit',async()=>{const day=utcDay(),oldDays={},oldSchedule=(await import('../src/daily218.mjs')).dailySchedule(day),round=newRound(puzzleAnswers(day,legends)[oldSchedule.signal],'signal',120);oldDays[day]={daily218:{signal:tryGuess(round,round.answer,legends,Date.now()-2000)}};oldDays[day].daily218.signal.finishedAt=Date.now()-1000;migrateSingleDaily(oldDays,day);const payload=buildSubmission(oldDays,day,'LegacySignal');assert.equal(payload.legacyMigration,true);assert.equal(payload.rounds.signal.gameMode,oldSchedule.signal);assert.equal((await server().call(payload)).status,200);});
