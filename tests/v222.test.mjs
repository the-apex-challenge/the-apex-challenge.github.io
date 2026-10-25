import {chooseDaily as chooseDaily265,chosenDaily as chosenDaily265} from '../src/daily265.mjs';import {legends as roster265} from '../src/data.mjs';import {COMMUNITY_INTEL as community265} from '../src/community_intel265.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newRound,tryGuess,scannerState,scannerDisplayValue,FIELDS,compare} from '../src/engine.mjs';
import {legends} from '../src/data.mjs';
import {freshStore,loadStore,saveStore} from '../src/store.mjs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const app=read('src/app.mjs'),css=read('styles.css'),html=read('index.html');
const home=app.split('function home(){')[1].split('function homeLegacy(){')[0];
test('only one header is rendered on all screens with HOME nav',()=>{
 assert.ok(app.includes('app.innerHTML=nav()+'));
 assert.ok(home.includes('gtp222-layout')&&!home.includes('gtp219-header'));
 assert.ok(app.includes('data-action="home">⌂ HOME'));
 assert.ok(css.includes('#app[data-screen="home"]>.gtp2-top{display:flex!important'));
});
test('six cards orbit around a single central reward hub',()=>{
 assert.ok(home.includes('gtp222-arena')&&home.includes('gtp222-core'));
 for(const mode of ['classic','pixel','quote','ability','emoji','trivia'])assert.ok(home.includes(`'${mode}'`));
 assert.ok(home.includes('data-action="wheel"')&&home.includes('tac258-wheel-face'));
 assert.ok(home.includes('data-action="intel-open"')&&home.includes('todayHub(')&&!home.includes('gtp222-primary-actions'));
});
test('Full Scan retains correct matches across later different guesses',()=>{
 const target=legends.find(l=>l.name==='Mirage');
 const first=legends.find(l=>l.name!==target.name&&FIELDS.some(f=>lMatch(l,target,f)));
 const shared=FIELDS.find(f=>lMatch(first,target,f));
 const second=legends.find(l=>l.name!==target.name&&l.name!==first.name&&l[shared]!==target[shared]&&l[shared]!=null);
 let round=tryGuess(newRound(target.name,'full'),first.name,legends,1000);
 assert.equal(scannerState(round,target,legends)[shared].kind,'correct');
 round=tryGuess(round,second.name,legends,2000);
 assert.equal(scannerState(round,target,legends)[shared].kind,'correct');
 assert.ok(app.includes('CONFIRMED MATCHES ARE REMEMBERED'));
 assert.ok(!app.includes('${fullScanHistoryMarkup(round,target)}'));
});
function lMatch(a,b,f){return a[f]!=null&&a[f]===b[f];}
test('saved days, stats and submission receipts survive reload',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 let st=freshStore();st.history.wins=17;st.days['2026-10-17']={daily218:{full:{finished:true,won:true}}};st.submittedDays['2026-10-17']={totalScore:2440};saveStore(st,storage);
 const again=loadStore(storage);assert.equal(again.history.wins,17);assert.equal(again.days['2026-10-17'].daily218.full.won,true);assert.equal(again.submittedDays['2026-10-17'].totalScore,2440);
 assert.ok(app.includes('SAVED_BOARD_KEY')&&app.includes('OFFLINE · SAVED RESULTS'));
});
test('priority 10 legends try Original model renders before square portraits',()=>{
 const art=read('src/art.mjs');for(const name of ['Vantage','Sparrow','Rampart','Revenant','Loba','Gibraltar','Conduit','Catalyst','Ballistic','Alter'])assert.ok(art.includes('Original%20'+name+'.png'));
 assert.ok(css.includes('.portrait-model-render'));
});
test('release assets share updated cache version and old Supabase APIs remain',()=>{
 assert.ok(html.includes('styles.css?v=2.43.0')&&html.includes('app.mjs?v=2.43.0'));
 assert.ok(read('src/leaderboard.mjs').includes("sb.rpc('get_overall_leaderboard'"));
 assert.ok(read('src/leaderboard.mjs').includes("sb.rpc('gtp_trivia_api'"));
});

test('mode launch always uses the clicked free-play session',()=>{
 assert.ok(app.includes("openMode(button.dataset.mode,button.dataset.session||'unlimited')"));
 assert.ok(home.includes('data-session="unlimited"'));
});
test('Full Scan keeps confirmed trait matches without duplicating history UI',()=>{
 assert.ok(app.includes("round.mode==='full'?scannerMarkup(round,target):''"));
 assert.ok(!app.includes('${fullScanHistoryMarkup(round,target)}'));
 assert.ok(app.includes('CONFIRMED MATCHES ARE REMEMBERED'));
});
test('partial local stores preserve progress without requiring a practice object',()=>{
 const map=new Map([['guess-the-predator-2:daybreak-v1',JSON.stringify({days:{'2026-10-17':{daily218:{full:{won:true}}}},history:{wins:7}})]]);
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const saved=loadStore(storage);
 assert.equal(saved.history.wins,7);
 assert.equal(saved.days['2026-10-17'].daily218.full.won,true);
 assert.deepEqual(saved.practice,{});
});

test('the three Intel checkpoints have deterministic actionable tactical notes',async()=>{
 const {INTEL_POOL,intelFor}=await import('../src/daily218.mjs');
 const official=['https://www.reddit.com/','https://apexmovement.tech/'];
 for(const idx of [1,2,3]){
  assert.ok(INTEL_POOL[idx].length>=6);
  const entry=intelFor('2026-10-17',idx);
  assert.deepEqual(entry,intelFor('2026-10-17',idx));
  assert.ok(entry.tip.length>70);
  assert.ok(entry.source===null||official.some(prefix=>entry.source.startsWith(prefix)));
  assert.ok(entry.title.length>5&&entry.category.length>5);
 }
});
test('read-aware Intel UI and contextual reward access are wired',()=>{assert.ok(app.includes("checkpoint===2?triviaRewardEarned()"));assert.ok(app.includes('intelReadyMarkup(1)'));assert.ok(app.includes('intelReadyMarkup(2)'));});
test('home cards leave space for character art; game sidebars match every mode',()=>{
 for(const mode of ['classic','pixel','quote','ability','emoji'])
  assert.ok(css.includes(`[data-mode="${mode}"]{--side-tone:`));
 assert.ok(css.includes('V2.23 · SHOWCASE'));
 assert.ok(css.includes('grid-template-columns:minmax(214px,286px)'));
 assert.ok(css.includes('.gtp222-home:after'));
});

test('V2.24 orbit, full dock art, game sessions and Trivia timeout are wired',()=>{
 assert.ok(app.includes('gtp224-orbit-'));
 assert.ok(app.includes('gtp230-session'));
 assert.ok(css.includes('V2.24 — true orbit'));
 assert.ok(css.includes('.gtp222-home-dock .gtp222-wheel-illustration'));
 assert.ok(css.includes('.gtp222-home-dock .gtp222-spotlight-art'));
 assert.ok(css.includes('#app[data-screen="trivia"] .trivia-page'));
 assert.ok(app.includes("requestAnimationFrame(frame)"));
 assert.ok(app.includes('TIME’S UP · QUESTION EXPIRED'));
});
test('portrait catalog prioritizes known real vertical assets, including missing screenshot roster',async()=>{
 const {portraitOriginalNames,portraitSourcesFor,stableFanPortraits,verifiedSkinPortraits,reliableIconFallbacks}=await import('../src/art.mjs');
 assert.equal(Object.keys(portraitOriginalNames).length,28);
 assert.equal(Object.keys(stableFanPortraits).length,22);
 assert.equal(Object.keys(verifiedSkinPortraits).length,6);
 assert.equal(Object.keys(reliableIconFallbacks).length,28);
 for(const legend of legends){
  const sources=portraitSourcesFor(legend.slug);
  assert.ok(sources.length>=2);
  if(['alter','ballistic','catalyst','conduit','sparrow'].includes(legend.slug))
   assert.equal(sources[0],reliableIconFallbacks[legend.slug]);
  else if(stableFanPortraits[legend.slug])assert.equal(sources[0],stableFanPortraits[legend.slug]);
  else assert.ok(sources[0].includes(encodeURIComponent(verifiedSkinPortraits[legend.slug])));
 }
 for(const slug of ['loba','gibraltar'])assert.ok(portraitSourcesFor(slug)[0].includes(slug==='loba'?'0012_Loba.png':'0015_Gibraltar.png'));
});
test('screenshot regression: dark Browse, non-overlapping Home and original graphic wheel',()=>{
 assert.ok(css.includes('V2.25 — Screenshot QA'));
 assert.ok(css.includes('#app .gtp2-picker .picker-header'));
 assert.ok(css.includes('#app .gtp2-picker .picker-search select'));
 assert.ok(css.includes('#app .gtp2-picker .portrait-unavailable'));
 assert.ok(css.includes('.gtp222-core .gtp222-primary-actions'));
 assert.ok(css.includes('conic-gradient('));
 assert.ok(css.includes('.gtp222-home-dock .gtp222-spotlight-art'));
});

test('V2.26 missing five portraits have real hosted per-Legend GitHub fallback sources',async()=>{
 const {portraitSourcesFor}=await import('../src/art.mjs');
 for(const slug of ['alter','axle','ballistic','catalyst','conduit','sparrow']){
  const sources=portraitSourcesFor(slug);
  assert.ok(sources.some(url=>url.includes('apexlegends.wiki.gg/')||url.includes('raw.githubusercontent.com/')));
  assert.ok(sources.some(url=>url.toLowerCase().includes(slug)));
 }
 assert.ok(app.includes('portrait-icon-fallback'));
 assert.ok(css.includes('.portrait-holder.portrait-icon-fallback'));
});
test('V2.26 every incorrect Full Scan cell has a red state and summary',()=>{
 assert.ok(app.includes('data-scan-kind="${kind}"'));
 assert.ok(app.includes('WRONG · DIFFERENT'));
 assert.ok(app.includes('gtp226-scan-metrics'));
 assert.ok(app.includes('matches=FIELDS.filter'));
 assert.ok(css.includes('.scan-cell.bad[data-scan-kind="wrong"]'));
 assert.ok(css.includes('background:linear-gradient(150deg,#921f32'));
});
test('V2.26 audio supports distinct modes, visible homepage hover and valid loss feedback',()=>{
 const audio=read('src/audio.mjs');
 assert.ok(audio.includes("const modes=['classic','pixel','quote','ability','emoji','trivia']"));
 assert.ok(audio.includes('audioEngine()'));
 assert.ok(audio.includes("if(name==='wrong')"));
 assert.ok(app.includes("closest?.('.arena-mode,.gtp222-orbit-card,.gtp239-mode-card')"));
 assert.ok(app.includes("if(next.finished)sound('lose');"));
});

test('V2.28 transparent full-body build is preferred for five Legends, not head-only fallback',()=>{
 const manifest=read('src/portrait_media_manifest.mjs');
 const probe=read('scripts/probe_fullbody.py');
 const workflow=read('.github/workflows/pages.yml');
 const qa=read('.github/workflows/pr-qa.yml');
 for(const slug of ['alter','ballistic','catalyst','conduit','sparrow']){
  assert.ok(manifest.includes("cutout-"+slug+".png"));
 }
 assert.ok(app.includes('...(localFile?[\x60./assets/portraits/'));
 assert.ok(probe.includes('raise SystemExit('));
 assert.ok(workflow.includes('OUTPUT_DIR=assets/portraits python3 scripts/probe_fullbody.py --strict'));
 assert.ok(qa.includes('OUTPUT_DIR=assets/portraits python3 scripts/probe_fullbody.py --strict'));
 assert.ok(workflow.includes('cp -r src assets dist/'));
});
test('V2.27 active Trivia centers its question and supports typed answers in view',()=>{
 assert.ok(app.includes('trivia-page-active'));
 assert.ok(app.includes('trivia-page-written'));
 assert.ok(app.includes('function focusTriviaQuestion()'));
 assert.ok(app.includes("question.scrollIntoView({behavior:'instant',block:'center'"));
 assert.ok(css.includes('V2.27 — Focused Trivia gameplay'));
 assert.ok(css.includes('.trivia-page-active .trivia-type'));
 assert.ok(css.includes('.trivia-page-active .trivia-main'));
});

test('V2.28 builds real transparent cutouts and prevents original scene backgrounds',()=>{
 const pipeline=read('scripts/probe_fullbody.py');
 const release=read('scripts/validate_release.py');
 const manifest=read('src/portrait_media_manifest.mjs');
 const workflow=read('.github/workflows/pages.yml');
 const qa=read('.github/workflows/pr-qa.yml');
 assert.ok(pipeline.includes('from rembg import new_session'));
 assert.ok(pipeline.includes('remove(studio, session=session'));
 assert.ok(pipeline.includes('ImageChops.multiply('));
 assert.ok(pipeline.includes('transparent_ratio < 0.30'));
 assert.ok(pipeline.includes('cutout-'));
 assert.ok(release.includes("alpha.getpixel(c)<=15"));
 assert.ok(workflow.includes("'rembg[cpu]==2.0.67'"));
 assert.ok(qa.includes("'rembg[cpu]==2.0.67'"));
 for(const slug of ['alter','ballistic','catalyst','conduit','sparrow'])
  assert.ok(manifest.includes("cutout-"+slug+".png"));
 assert.ok(!manifest.includes("original-alter.png"));
});

test('V2.30 cinematic game matches supplied seven-panel UI reference while retaining functionality',()=>{
 const unknown=read('assets/decor/unknown-legend.svg');
 assert.ok(unknown.includes('<svg')&&unknown.includes('Unknown Legend'));
 assert.ok(!app.includes('unknown-legend.svg'), 'Classic no longer renders the removed generic silhouette');
 assert.ok(app.includes('function cinematicIdentityBoard(round,target)'));
 assert.ok(app.includes('function cinematicStageAside(round,target)'));
 assert.ok(app.includes('function cinematicControls(round,target)'));
 assert.ok(app.includes('gtp230-titlebar'));
 assert.ok(app.includes('gtp230-arena'));
 assert.ok(app.includes('gtp230-trait-list'));
 assert.ok(app.includes('gtp230-control-row'));
 assert.ok(app.includes('gtp230-side-stages'));
 assert.ok(app.includes('gtp230-side-ability'));
 assert.ok(app.includes('gtp230-side-quote'));
 assert.ok(app.includes('gtp230-btn-main'));
 assert.ok(app.includes('data-action="picker"'));
 assert.ok(app.includes('data-action="hint"'));
 assert.ok(app.includes('data-action="submit-search"'));
 assert.ok(app.includes('data-action="surrender"'));
 assert.ok(app.includes("else if(action==='surrender')"));
 assert.ok(app.includes('window.confirm('));
 assert.ok(css.includes('V2.30 — CINEMATIC NEON MODES'));
 for(const mode of ['classic','pixel','quote','ability','emoji'])
  assert.ok(css.includes('[data-mode="'+mode+'"]{--gtp230-accent:'));
 assert.ok(css.includes('.gtp230-board'));
 assert.ok(css.includes('.gtp230-trait-different'));
 assert.ok(css.includes('.gtp230-btn-danger'));
 assert.ok(css.includes('.trivia-page-active .trivia-main'));
});

test('V2.31 themed backgrounds backfill both screen gutters without horizontal scrolling',()=>{
 assert.ok(css.includes('V2.31 — SCREENSHOT QA / FULL-BLEED'));
 assert.ok(css.includes('background-image:'));
 assert.ok(css.includes('var(--gtp230-back)!important'));
 assert.ok(css.includes('width:calc(100vw - 22px)!important'));
 assert.ok(css.includes('max-width:none!important'));
 assert.ok(css.includes('background-attachment:fixed!important'));
 assert.ok(css.includes('#app[data-screen="game"] > .gtp230-game::before'));
});
test('V2.31 gameplay dock is visible above fold at desktop viewport height',()=>{
 assert.ok(css.includes('@media (min-width:761px) and (min-height:680px)'));
 assert.ok(css.includes('height:calc(100dvh - 79px)!important'));
 assert.ok(css.includes('.gtp230-arena{'));
 assert.ok(css.includes('flex:1 1 0!important'));
 assert.ok(css.includes('min-height:0!important'));
 assert.ok(css.includes('.gtp230-console,'));
 assert.ok(css.includes('max-height:38dvh!important'));
 assert.ok(css.includes('.gtp230-main-clue>.clue-visual'));
 assert.ok(css.includes('.gtp229-mystery-stage'));
});
test('V2.31 short and mobile viewports retain scrollable game controls',()=>{
 assert.ok(css.includes('@media (max-width:760px), (max-height:679px)'));
 assert.ok(css.includes('height:auto!important;max-height:none!important'));
 assert.ok(css.includes('position:relative!important'));
 assert.ok(app.includes('gtp230-control-row'));
 assert.ok(app.includes('data-action="surrender"'));
});

test('V2.32 green scanner cells reveal only confirmed values with exact age',()=>{
 const target=legends.find(l=>l.name==='Bangalore');
 assert.equal(scannerDisplayValue('gender',compare(target,target,'gender')),'✓ FEMALE');
 assert.equal(scannerDisplayValue('role',compare(target,target,'role')),'✓ ASSAULT');
 assert.equal(scannerDisplayValue('age',compare(target,target,'age')),'✓ 40 EXACT');
 assert.equal(scannerDisplayValue('debut',compare(target,target,'debut')),'✓ LAUNCH');
 assert.equal(scannerDisplayValue('form',compare(target,target,'form')),'✓ HUMAN');
 const incorrect=legends.find(l=>l.gender==='Male');
 assert.equal(scannerDisplayValue('gender',compare(incorrect,target,'gender')),'✕ DIFFERENT');
 assert.equal(scannerDisplayValue('age',{kind:'wrong',value:'64',direction:-1}),'✕ DIFFERENT');
 assert.equal(scannerDisplayValue('age',{kind:'hidden',value:'40'}),'? UNKNOWN');
 assert.equal(scannerDisplayValue('origin',{kind:'unknown',value:'Secret planet'}),'? UNKNOWN');
 assert.equal(scannerDisplayValue('age',{kind:'hint',value:'40'}),'✓ 40 EXACT');
 const alter=legends.find(l=>l.name==='Alter');
 assert.equal(scannerDisplayValue('age',compare(target,alter,'age')),'? UNKNOWN');
});
test('V2.32 cinema board uses signal values, never unconfirmed target data',()=>{
 assert.ok(app.includes('scannerDisplayValue(field,trait)'));
 assert.ok(app.includes('const trait=state?.[field]'));
 assert.ok(app.includes('esc(wording)'));
 const board=app.split('function cinematicIdentityBoard(round,target){')[1].split('function cinematicStageAside')[0];
 assert.ok(!board.includes("target[field]"));
 assert.ok(board.includes('gtp230-trait-${status}'));
});
test('V2.32 seamless game backdrop is drawn once across the desktop',()=>{
 assert.ok(css.includes('V2.32 · ONE CONTINUOUS FULL-VIEWPORT BACKDROP'));
 assert.ok(css.includes('#app[data-screen="game"]::before,'));
 assert.ok(css.includes('#app[data-screen="game"]::after'));
 assert.ok(css.includes('content:none!important;display:none!important;'));
 assert.ok(css.includes('background-attachment:fixed!important;'));
 assert.ok(css.includes('var(--gtp230-back)!important;'));
 assert.ok(css.includes('#app[data-screen="game"] .gtp230-arena'));
 assert.ok(css.includes('background:linear-gradient(180deg,#07162a18,#040d1b29)!important;'));
 assert.ok(css.includes('.gtp230-trait strong'));
 assert.ok(css.includes('body.lightshift-playing #app[data-screen="game"]'));
 assert.ok(css.includes('body:has(.gtp2-game-scene) #app[data-screen="game"]'));
});

test('V2.33 adds an explicit full-screen game wallpaper node above legacy app layers',()=>{
 const render=app.split('function game(){')[1].split('function howTo()')[0];
 assert.ok(render.includes('<div class="gtp233-viewport-art" aria-hidden="true"></div><div class="gtp241-mode-scene'));;
 assert.ok(css.includes('V2.33 — DEDICATED FULL-VIEWPORT GAME ART'));
 assert.ok(css.includes('#app[data-screen="game"] > .gtp233-viewport-art'));
 assert.ok(css.includes('position:fixed!important'));
 assert.ok(css.includes('width:100vw!important;height:100vh!important;height:100dvh!important'));
 assert.ok(css.includes('z-index:0!important'));
 assert.ok(css.includes('var(--gtp230-back)!important'));
 assert.ok(css.includes('background-size:cover!important'));
 assert.ok(css.includes('background-position:center center!important'));
});
test('V2.33 live game content stays above a seamless non-interactive background',()=>{
 assert.ok(css.includes('#app[data-screen="game"] > .gtp2-top,'));
 assert.ok(css.includes('#app[data-screen="game"] > .gtp230-game{'));
 assert.ok(css.includes('z-index:2!important'));
 assert.ok(css.includes('pointer-events:none!important'));
 assert.ok(css.includes('#app[data-screen="game"] .gtp230-arena,'));
 assert.ok(css.includes('background-image:none!important'));
 assert.ok(css.includes('.gtp230-game.gtp2-game-scene::before'));
 assert.ok(css.includes('.clue-visual.gtp229-mystery-visual'));
 assert.ok(app.includes('gtp230-control-row'));
 assert.ok(app.includes('scannerDisplayValue(field,trait)'));
});

test('V2.34 HUD shows one full wallpaper even under navbar, title and action dock',()=>{
 assert.ok(css.includes('V2.34 — TRUE FULL-SCREEN WALLPAPER'));
 assert.ok(css.includes('background-image:none!important'));
 assert.ok(css.includes('#app[data-screen="game"] > .gtp233-viewport-art'));
 assert.ok(css.includes('var(--gtp230-back)!important'));
 assert.ok(css.includes('#app[data-screen="game"] > header.gtp2-top'));
 assert.ok(css.includes('backdrop-filter:none!important'));
 assert.ok(css.includes('.gtp230-game>.gtp230-titlebar'));
 assert.ok(css.includes('.gtp230-console,'));
 assert.ok(css.includes('rgba(5,14,29,.67)'));
 assert.ok(css.includes('border:0!important'));
 assert.ok(css.includes('.gtp230-board,'));
 assert.ok(app.includes('gtp233-viewport-art'));
});
test('V2.34 visual regression runner inspects real Chromium viewport and screenshots',()=>{
 const runner=read('scripts/visual_fullscreen_smoke.mjs');
 const ci=read('.github/workflows/visual-fullscreen.yml');
 assert.ok(runner.includes('chromium.launch'));
 assert.ok(runner.includes('width:1658,height:928'));
 assert.ok(runner.includes('backgroundImage'));
 assert.ok(runner.includes('gtp230-console'));
 assert.ok(runner.includes('screenshots/v234-'));
 assert.ok(ci.includes('node scripts/visual_fullscreen_smoke.mjs'));
});

test('V2.35 always-visible scan controls expose all three modes in every active game',()=>{
 const ui=app.split('function visibleRoundModes(round){')[1].split('function triedLegendNote')[0];
 assert.ok(ui.includes('▦ FULL SCAN'));
 assert.ok(ui.includes('✦ ONE SIGNAL'));
 assert.ok(ui.includes('◷ RUSH'));
 assert.ok(ui.includes('data-action="'));
 assert.ok(ui.includes('aria-pressed='));
 assert.ok(ui.includes("session==='daily'||round.guesses.length>0||round.finished"));
 assert.ok(ui.includes("DAILY RULES LOCKED"));
 assert.ok(ui.includes("LOCKED AFTER FIRST GUESS"));
 assert.ok(app.includes('${visibleRoundModes(round)}'));
 assert.ok(!app.includes('<details class="gtp230-round-options">'));
 assert.ok(css.includes('V2.35 · ALWAYS-VISIBLE SCAN RULES'));
 assert.ok(css.includes('.gtp235-rule-choice.is-active.scan-full'));
 assert.ok(css.includes('.gtp235-rule-choice.is-active.scan-signal'));
 assert.ok(css.includes('.gtp235-rule-choice.is-active.scan-rush'));
 assert.ok(css.includes('.gtp235-rule-choice:disabled'));
});
test('V2.35 previously guessed Legends are displayed unobtrusively with escaped names',()=>{
 const note=app.split('function triedLegendNote(round){')[1].split('function cinematicControls')[0];
 assert.ok(note.includes("if(!round.guesses.length)return ''"));
 assert.ok(note.includes('ALREADY TRIED'));
 assert.ok(note.includes('round.guesses.map('));
 assert.ok(note.includes('esc(name)'));
 assert.ok(app.includes('${triedLegendNote(round)}'));
 assert.ok(css.includes('.gtp235-tried-names'));
 assert.ok(css.includes('overflow-x:auto!important'));
 const runner=read('scripts/visual_fullscreen_smoke.mjs');
 assert.ok(runner.includes('Free Play settings should be editable before the first guess'));
 assert.ok(runner.includes('Previously guessed Legend note was not updated after first attempt'));
 assert.ok(runner.includes('Scan rules must be locked after the first guess'));
});

test('V2.49 Identity Signal Board remains visible without the old boxed sidebar',()=>{
 const game=app.split('function game(){')[1].split('function howTo()')[0];
 assert.ok(game.includes('gtp236-intel-column'));
 assert.ok(game.includes('${triedLegendNote(round)}'));
 assert.ok(game.includes('${board}<details class="gtp248-scan-details"')&&game.includes('${triedLegendNote(round)}${board}')&&game.includes('${side}</div></details>')&&game.includes('${visibleRoundModes(round)}'), 'All six scanner traits are visible; extra guess history is optional; scan rule controls remain');
 const console=app.split('function cinematicControls(round,target){')[1].split('function game(){')[0];
 assert.ok(!console.includes('latestSignal(round,target)'));
 assert.ok(!console.includes('${triedLegendNote(round)}'));
 assert.ok(css.includes('V2.36 · Screenshot-led gameplay UI polish'));
 assert.ok(css.includes('.gtp236-intel-column>.gtp235-tried'));
 assert.ok(css.includes('.gtp230-control-row>.gtp230-btn'));
});
test('V2.36 released Axle local alpha asset is built and validated',()=>{
 const pipeline=read('scripts/probe_fullbody.py');
 const manifest=read('src/portrait_media_manifest.mjs');
 const validator=read('scripts/validate_release.py');
 assert.ok(pipeline.includes('"axle"'));
 assert.ok(pipeline.includes('"Axle Pose Stand Tall.png"'));
 assert.ok(manifest.includes("axle:'cutout-axle.png'"));
 assert.ok(validator.includes("'alter','axle','ballistic'"));
});
test('V2.36 uses new confetti victory tune, not generic party sample',()=>{
 const audio=read('src/audio.mjs');
 assert.ok(app.includes("if(justWon){sound('victory')"));
 assert.ok(audio.includes("if(name==='victory')"));
 assert.ok(audio.includes("if(key!=='victory'&&key!=='hover-trivia')"), 'Victory and Trivia hover use their own synthesized sounds, not sample playback');
 assert.ok(audio.includes('melodyNotes'));
 assert.ok(audio.includes("const events=new Set("));
});
