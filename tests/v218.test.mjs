import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {dailySchedule,dailyAnswers,DAILY_TRACKS,checkpointCount,rewardFor,currentDailyRounds} from '../src/daily218.mjs';
import {dailySummary,buildSubmission} from '../src/scoring.mjs';
import {legends} from '../src/data.mjs';
import {newRound,tryGuess,MODES,puzzleAnswers} from '../src/engine.mjs';
const root=new URL('../',import.meta.url),read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const app=read('src/app.mjs'),css=read('styles.css'),html=read('index.html');
test('two different deterministic daily modes rotate across five games',()=>{
 const seen=new Set();
 for(let d=1;d<=31;d++){let day=`2026-10-${String(d).padStart(2,'0')}`;const s=dailySchedule(day);assert.notEqual(s.full,s.signal);assert.deepEqual(s,dailySchedule(day));seen.add(s.full);seen.add(s.signal);const a=dailyAnswers(day,legends);assert.notEqual(a.full,a.signal);assert.equal(a.full,puzzleAnswers(day,legends)[s.full]);}
 assert.deepEqual([...seen].sort(),[...MODES].sort());
});
test('checkpoint rewards require completed rounds and are repeatable by day',()=>{
 const day='2026-10-17';assert.equal(checkpointCount({},day),0);
 const days={[day]:{daily218:{full:{finished:true,won:false}}}};assert.equal(checkpointCount(days,day),1);
 days[day].daily218.signal={finished:true,won:true};assert.equal(checkpointCount(days,day),2);
 assert.ok(rewardFor(day,1).length>65);assert.ok(rewardFor(day,2).startsWith('ADVANCED INTEL'));
 assert.equal(rewardFor(day,2),rewardFor(day,2));
});
test('only two completed daily rounds can submit a v218 payload',()=>{
 const day='2026-10-17',targets=dailyAnswers(day,legends),schedule=dailySchedule(day);
 const days={[day]:{daily218:Object.fromEntries(DAILY_TRACKS.map(t=>[t,tryGuess(newRound(targets[t],t),targets[t],legends,1710)]))}};
 const s=dailySummary(days,day),p=buildSubmission(days,day,'Tester');assert.equal(s.completed,true);assert.equal(Object.keys(p.rounds).length,2);assert.equal(p.protocol,'v218');
 for(const t of DAILY_TRACKS){assert.equal(p.rounds[t].mode,t);assert.equal(p.rounds[t].gameMode,schedule[t]);}
});
test('home is full bleed with real buttons and not transparent overlay hit-boxes',()=>{
 const home=app.slice(app.indexOf('function home(){'),app.indexOf('function homeLegacy(){'));
 assert.ok(home.includes('gtp219-home'));assert.ok(home.includes('gtp219-backdrop'));assert.ok(home.includes('gtp222-orbit-card'));
 assert.ok(home.includes('todayHub('));assert.ok(home.includes('todayHub(')&&app.includes('data-action="home-session"'));assert.ok(home.includes('data-action="wheel"'));
 assert.ok(css.includes('.gtp222-layout{'));assert.ok(css.includes('width:100%'));assert.ok(css.includes('height:100svh'));
 assert.ok(!home.includes('gtp217-hit'));
});
test('five distinct neon UI schemes share matching game controls',()=>{
 for(const mode of MODES){assert.ok(css.includes(`.gtp218-card-${mode}`));assert.ok(statSync(new URL(`../assets/decor/gtp218-mode-${mode}.webp`,import.meta.url)).size>7000);}
 assert.ok(css.includes('#app[data-screen="game"] .style-strip'));
 assert.ok(css.includes('--game-neon:var(--tile)'));
});
test('the six probed full-body renders including Axle are configured locally',()=>{
 const manifest=read('src/portrait_media_manifest.mjs');const list=['vantage','sparrow','rampart','revenant','loba','gibraltar','conduit','catalyst','ballistic','alter'];
 for(const slug of list)assert.ok(manifest.includes(`'${slug}'`));
 for(const slug of ['alter','axle','ballistic','catalyst','conduit','sparrow'])
  assert.ok(manifest.includes(slug+":'cutout-"+slug+".png'"));
 for(const slug of ['vantage','rampart','revenant','loba','gibraltar'])
  assert.ok(!manifest.includes(slug+":'cutout-"+slug+".png'"));
});
test('no stale V217 entrypoint; backend protocol marker present',()=>{
 assert.ok(html.includes('2.43.0'));assert.ok(/daily218\.mjs\?v=\d+\.\d+\.\d+/.test(app));
 assert.ok(read('src/scoring.mjs').includes("protocol:'v218'"));
});
