const MODE_SYMBOLS267={"classic":"<path d=\"M18 3 33 33H24L18 18 12 33H3Z\"/><path d=\"m13 27 5-9 5 9\"/>","pixel":"<path d=\"M5 5h9v9H5zm17 0h9v9h-9zM5 22h9v9H5zm17 0h9v9h-9z\"/><path d=\"M14 14h8v8h-8\"/>","quote":"<path d=\"M6 20h8V9H6v11l-3 7h7zm17 0h8V9h-8v11l-3 7h7\"/>","ability":"<path d=\"m18 3 4 11 11 4-11 4-4 11-4-11L3 18l11-4Z\"/><path d=\"M18 9v18M9 18h18\"/>","emoji":"<circle cx=\"18\" cy=\"18\" r=\"14\"/><path d=\"M11 22q7 8 14 0M12 12h1m10 0h1\"/>","trivia":"<circle cx=\"18\" cy=\"18\" r=\"14\"/><path d=\"M4 18h28M18 4q-13 14 0 28M18 4q13 14 0 28M7 10h22M7 26h22\"/>"};
import {chosenDaily,migrateSingleDaily,chooseDaily,DAILY_RULES} from './daily265.mjs?v=2.78.0';
import {TIPS,unlockedIntel,tipFor} from './tips.mjs?v=2.43.0';
import {legends} from './data.mjs?v=2.43.0';
import {artCatalog,portraitSourcesFor,reliableIconFallbacks} from './art.mjs?v=2.43.0';
import {localPortraitFiles} from './portrait_media_manifest.mjs?v=2.43.0';
import {abilityCandidates,localAbilitySlugs} from './abilities.mjs?v=2.43.0';
import {dailySpotlight,wheelChoices,wheelPick,destinationRotation} from './spotlight.mjs?v=2.43.0';
import {playSound} from './audio.mjs?v=2.43.0&release=2.44.0&ui=2.62.0';
import {paintPixelScene} from './pixel_scene.mjs?v=2.43.0&ui=2.63.0';
import {getBoards, submitDaily, triviaRequest, getTriviaBoards, leaderboardConfigured} from './leaderboard.mjs?v=2.43.0&release=2.54.0';
import {dailySummary, buildSubmission} from './scoring.mjs?v=2.43.0&ui=2.78.0';
import {DAILY_TRACKS,dailySchedule,dailyAnswers,currentDailyRounds,checkpointCount,dailyStats,rewardFor,intelFor,nextDailyStep} from './daily218.mjs?v=2.43.0&release=2.60.0&ui=2.65.0';
import {loadStore,saveStore} from './store.mjs?v=2.43.0';
import {normalizeNickname,validNickname,captureInputFocus,restoreInputFocus} from './usability279.mjs?v=2.79.0';
import {FIELDS,LABELS,MODES,MODE_NAMES,CLASS_NAMES,MAX_GUESSES,MAX_HINTS,maxGuesses,visibleEmojiCount,utcDay,puzzleAnswers,newRound,tryGuess,expireRound,
  getHint,availableHintFields,formatValue,gameScore,gameRank,scannerState,scannerDisplayValue,filteredRoster,remainingTime,dayCount,streak,legendByName} from './engine.mjs?v=2.43.0&release=2.60.0';

import {nextFreeMode, writtenAnswerPlaceholder} from './flow275.mjs?v=2.75.0';

const app=document.getElementById('app');
let store=loadStore();
// The owner reset public rankings on 19 October 2026. Discard obsolete offline snapshots.
try{localStorage.removeItem('gtp:boards:last-good:v1');localStorage.removeItem('tac:trivia-boards:v1');}catch{}

const SAVED_BOARD_KEY='gtp:boards:last-good:v265';
let boardCacheDay=utcDay();
const dailyModes=()=>chosenDaily(store.days,today())?[chosenDaily(store.days,today()).track]:['full'];
let screen='home';
let triviaRun=null;
const triviaDailyRewardKey=day=>'gtp-trivia-daily-complete:'+day;
function triviaRewardEarned(){try{return localStorage.getItem(triviaDailyRewardKey(today()))==='yes';}catch{return false;}}
function saveTriviaReward(run){if(run?.finished&&run.mode==='daily'){try{localStorage.setItem(triviaDailyRewardKey(run.day||utcDay()),'yes');localStorage.setItem('tac:trivia-receipt:'+(run.day||utcDay()),JSON.stringify({score:run.score,correctAnswers:run.correctAnswers}));}catch{}}}
function totalIntelCheckpoints(){return checkpointCount(store.days,today())+Number(triviaRewardEarned());}
function intelState(checkpoint){
  const unlocked=checkpoint===2?triviaRewardEarned():checkpoint===1&&checkpointCount(store.days,today())>=1;
  const read=Boolean(store.intelOpenedDays?.[`${today()}:${checkpoint}`]||(checkpoint===2&&store.intelOpenedDays?.[today()]===true));
  return {unlocked,read};
}
function intelReadyMarkup(checkpoint){
  const {unlocked,read}=intelState(checkpoint);
  if(!unlocked)return '';
  return `<aside class="gtp223-intel-ready ${read?'is-read':'is-new'}" role="status"><div><b>${read?'✓ INTEL ALREADY DECLASSIFIED':'✦ NEW FORBIDDEN INTEL UNLOCKED'}</b><small>${read?'You can read today’s tip again.':'Checkpoint '+checkpoint+' is available. Open the chest for your Apex tip.'}</small></div><button type="button" class="btn mint" data-action="intel-open" data-checkpoint="${checkpoint}">${read?'REVIEW INTEL ↗':'OPEN YOUR INTEL ↗'}</button></aside>`;
}

let triviaMode=store.settings.session==='unlimited'?'practice':'daily';
let triviaEpoch=0;
let triviaRetryAt=0;
let triviaBusy=false;
let triviaMessage='';
let triviaScoreTab='daily';
let triviaBoard=(()=>{try{const saved=JSON.parse(localStorage.getItem('tac:trivia-boards:v265')||'null');return saved?.boards?{daily:saved.day===utcDay()?saved.boards.daily:[],overall:saved.boards.overall||[]}:null;}catch{return null}})();
let triviaBoardBusy=false;
let triviaBoardError='';
let triviaSubmitting=false;
let triviaAnswerText='';
let triviaTickTimer=null;
let triviaClockFrame=0;
let triviaExpiredKey='';

let session=store.settings.session==='unlimited'?'unlimited':'daily';
let active='classic';
let dailyTrack='full';
let intelCheckpoint=1;
let boardTab='daily';
let boardData=(()=>{try{const d=JSON.parse(localStorage.getItem('gtp:boards:last-good:v265')||'null');return d?.boards?{daily:d.day===utcDay()?d.boards.daily:[],overall:d.boards.overall||[]}:null;}catch{return null}})();
let boardLoading=false;
let scoreSubmitting=false;
let boardError='';
let pickerOpen=false;
let pickerSearch='';
let pickerClass='All';
let pickerSort='az';
let pickerPreviewSlug='';
let quickSearch='';
let toastTimer=null;
let wheelOpen=false;
let wheelNoRepeat=true;
let wheelAnimation=0;
let wheelAngle=0;
let wheelSpinning=false;
let wheelChosen=null;
let wheelDisplayList=null;
let identityPromptOpen=false;
const COLORS={classic:'#f17b72',pixel:'#5ad7f1',quote:'#ffca75',ability:'#ba9eff',emoji:'#73dfc2'};
const ICONS={classic:'❔',pixel:'▦',quote:'❞',ability:'⌁',emoji:'✧'};
const TAGLINES={classic:'Deduce the target with every signal.',pixel:'Reveal the legend, not the background.',quote:'Who wrote this intercepted line?',ability:'Identify the passive ability icon.',emoji:'Five symbols. One legend.'};
const params=new URLSearchParams(location.search);
let sharedDay=null;
if(params.has('day')){const url=new URL(location.href);url.searchParams.delete('day');history.replaceState(null,'',url);}
const today=()=>sharedDay||utcDay();
const answers=()=>puzzleAnswers(today(),legends);

const PORTRAIT_FRAME_CLASS='balanced';
let intelModalOpen=false;
let intelFirstRevealPending=false;
let intelAnimation=null;
const styleBadges=round=>{const tags=[];if(round.won&&round.guesses.length<=3&&!round.hints.length)tags.push('FLAWLESS READ');if(round.won&&round.timeLimit&&remainingTime(round,round.finishedAt)>=90)tags.push('SPEED CLEAR');if(round.won&&round.mode==='signal')tags.push('MYSTERY CLEAR');return tags;};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const classOf=mode=>COLORS[mode]||'#ff91b7';
const sound=name=>playSound(name,store.settings.audio,store.settings.volume);
const sync=()=>saveStore(store);
const savedNickname=()=>String(store.profile?.nickname||'').trim();
const getRound=()=>session==='daily'?currentDailyRounds(store.days,today())[dailyTrack]:store.practice[active];
function setRound(round){
  if(session==='daily') {const day=store.days[today()]||{},chosen=day.daily265;if(!chosen)throw Error('Choose Daily difficulty first');store.days[today()]={...day,daily265:{...chosen,round}};}
  else store.practice[active]=round;
  sync();
}
function ensureRound(mode=active,playSession=session){
 if(playSession==='daily'){
  migrateSingleDaily(store.days,today(),legends);const chosen=chosenDaily(store.days,today());if(!chosen)throw Error('Choose Daily difficulty first');
  dailyTrack=chosen.track;active=chosen.gameMode;return chosen.round;
 }
 let round=store.practice[mode];
 if(round){
  if(mode==='ability'&&!round.finished&&!round.guesses?.length){
   const target=legendByName(legends,round.answer);
   if(!target||!localAbilitySlugs.includes(target.slug)){
    round=newRound(answers().ability,round.mode,round.timeLimit);store.practice[mode]=round;sync();
   }
  }
  if(round.mode==='full'&&!round.finished&&round.guesses?.length>=5){
   round={...round,finished:true,won:false,loss:'attempts',finishedAt:Date.now()};store.practice[mode]=round;sync();
  }
  return round;
 }
 const eligible=mode==='ability'?legends.filter(l=>localAbilitySlugs.includes(l.slug)):legends;
 round=newRound(eligible[Math.floor(Math.random()*eligible.length)].name,store.settings.playStyle,store.settings.rush?120:0);
 store.practice[mode]=round;sync();return round;
}
function randomPractice(mode=active){
  const last=store.practice[mode]?.answer;
  const pool=legends.filter(l=>l.name!==last&&(mode!=='ability'||localAbilitySlugs.includes(l.slug)));
  store.practice[mode]=newRound(pool[Math.floor(Math.random()*pool.length)].name,store.settings.playStyle,store.settings.rush?120:0);
  sync();session='unlimited';active=mode;screen='game';pickerOpen=false;render();sound('nav');
}
function portrait(slug,{alt='',cls='',concealed=false,eager=false}={}) {
  // Images are not embedded in HTML. The loader tries each real-character source.
  return `<span class="portrait-holder ${esc(cls)}"><img data-portrait="${esc(slug)}" alt="${esc(concealed?'Mystery Legend portrait':alt)}" loading="${eager?'eager':'lazy'}" decoding="async"/></span>`;
}
function loadPortraitImages(parent=app){
  parent.querySelectorAll('img[data-portrait]:not([data-art-ready])').forEach(image=>{
    image.dataset.artReady='yes';
    const slug=image.dataset.portrait;const localFile=localPortraitFiles[slug];
    const inPixelPuzzle=Boolean(image.closest('.pixel-art'));
    const sourceCatalog=portraitSourcesFor(slug,{pixel:inPixelPuzzle});
    // Pixel mode uses the old source priority so tall renders never change its canvas composition.
    const isSceneArt=Boolean(image.closest('.gtp241-scene-host,.gtp241-trivia-scene,.gtp241-spotlight-art'))||Boolean(image.closest('.tac258-portrait'));
    const isHostArt=Boolean(image.closest('.gtp239-mode-ring,.gtp238-game-host,.gtp240-mode-identity-art,.gtp240-trivia-host,.gtp238-wheel-host'));
    // Host portraits need reliable direct square sources first. Mystery and pixel target art keep their own ordering.
    const hostSource=isHostArt?reliableIconFallbacks[slug]:null;
    const preferredFullBody=isSceneArt?[...(localFile?[`./assets/portraits/${localFile}`]:[]),...sourceCatalog.filter(url=>!url.includes('moeneri/astrbot_plugin_apexrankwatch/'))]:[];
    const fastPixelSources=inPixelPuzzle?[...(localFile?[`./assets/portraits/${localFile}`]:[]),...(reliableIconFallbacks[slug]?[reliableIconFallbacks[slug]]:[])]:[];
    const candidates=[...new Set([...fastPixelSources,...(isSceneArt?preferredFullBody:[]),...(hostSource?[hostSource]:[]),...(localFile?[`./assets/portraits/${localFile}`]:[]),...sourceCatalog])];let index=0;
    const next=()=>{
      if(index>=candidates.length){
        const box=image.closest('.portrait-holder');
        const px=box?.closest('.pixel-art');
        if(px){const status=px.querySelector('.pixel-error');if(status)status.textContent='IMAGE SOURCE UNAVAILABLE · USE BACKUP INTEL';}
        if(box){const name=image.dataset.portrait||'?';const initial=(name[0]||'?').toUpperCase();box.innerHTML='<span class="portrait-unavailable" aria-label="Image unavailable"><b>'+initial+'</b><small>VISUAL SIGNAL<br>UNAVAILABLE</small></span>';}
        return;
      }
      const candidate=candidates[index++];
      const isIconFallback=candidate.includes('moeneri/astrbot_plugin_apexrankwatch/');
       const isRender=!isIconFallback&&(candidate.includes('Original%20')||candidate.startsWith('./assets/portraits/'));
       image.closest('.portrait-holder')?.classList.toggle('portrait-icon-fallback',isIconFallback);
      image.dataset.portraitSource=candidate.startsWith('./assets/portraits/')?'local':isRender?'model-render':'remote';
      image.closest('.portrait-holder')?.classList.toggle('portrait-model-render',isRender);
      image.src=candidate;
    };
    image.addEventListener('error',next);
    image.addEventListener('load',()=>{
      if(image.naturalWidth<80||image.naturalHeight<80||((inPixelPuzzle||image.closest('.gtp2-picker'))&&image.naturalWidth>image.naturalHeight*1.2)){next();return;}
      if(image.dataset.portrait==='mirage')image.closest('.hero-stage')?.classList.add('art-loaded');
      const pixels=image.closest('.pixel-art');
      if(pixels){
        const canvas=pixels.querySelector('canvas.pixel-canvas');
        if(canvas)paintPixel(canvas,image);
      }
    });
    next();
  });
}
function paintPixel(canvas,image){
  const result=paintPixelScene(canvas,image,{resolution:Number(canvas.dataset.resolution)||28,seed:'neutral-arena'});
  canvas.classList.toggle('loaded',result);
}

function loadAbilityImages(parent=app){
  parent.querySelectorAll('img[data-ability]:not([data-ability-ready])').forEach(img=>{
    img.dataset.abilityReady='1';
    const sources=abilityCandidates(img.dataset.ability);
    const box=img.closest('.ability-symbol');
    let ix=0;
    const next=()=>{
      if(!img.isConnected)return;
      if(ix>=sources.length){
        img.hidden=true;
        if(box)box.classList.add('ability-offline');
        return;
      }
      img.src=sources[ix++];
    };
    img.addEventListener('load',()=>{
      if(img.naturalWidth<24||img.naturalHeight<24){next();return;}
      if(box)box.classList.add('ability-loaded');
    });
    img.addEventListener('error',next);
    next();
  });
}

function identityPrompt(){
  const value=esc(savedNickname());
  return `<div class="identity-backdrop" id="identity-backdrop" role="presentation"><section class="identity-modal" role="dialog" aria-modal="true" aria-labelledby="identity-title"><button class="identity-close" type="button" data-action="identity-skip" aria-label="Close nickname dialog">✕</button><span class="identity-kicker">PUBLIC RANKINGS / SAVED LOCALLY</span><h2 id="identity-title">CHOOSE YOUR <em>NICKNAME.</em></h2><p>This name appears automatically when you submit Daily scores and stays saved on this device. You can change it later anytime.</p><form id="identity-form" class="identity-form"><label for="identity-name">PLAYER NICKNAME</label><input id="identity-name" name="nickname" required minlength="3" maxlength="18" autocomplete="nickname" pattern="[A-Za-z0-9 _-]{3,18}" placeholder="Example: MirageMain" value="${value}" required/><small>3–18 characters · letters, numbers, spaces, _ or -</small><div class="identity-actions"><button class="btn pink" type="submit">SAVE NICKNAME ↗</button><button class="btn lilac" type="button" data-action="identity-skip">MAYBE LATER</button></div><p class="identity-note">This only stores a public nickname, not personal details.</p></form></section></div>`;
}
function openIdentityPrompt(force=false){
  if(identityPromptOpen)return;
  if(!force&&store.profile?.askedName)return;
  identityPromptOpen=true;
  const wrapper=document.createElement('div');
  wrapper.innerHTML=identityPrompt();
  const node=wrapper.firstElementChild;
  node.addEventListener('click',event=>{if(event.target===node)closeIdentityPrompt();});
  app.appendChild(node);
  document.getElementById('identity-name')?.focus({preventScroll:true});
}
function closeIdentityPrompt(markAsked=true){
  identityPromptOpen=false;
  if(markAsked){store.profile={...(store.profile||{}),askedName:true};sync();}
  document.getElementById('identity-backdrop')?.remove();
}
function saveNickname(name,{close=true}={}){
  const clean=normalizeNickname(name);
  store.profile={...(store.profile||{}),nickname:clean,askedName:true};
  sync();
  const input=document.getElementById('board-nickname');if(input)input.value=clean;
  if(close)closeIdentityPrompt(false);
  return clean;
}
function edgeArenaDecor(){
  return `<aside class="edge-arena edge-arena-left" aria-hidden="true"><div class="edge-stitch"></div><span class="edge-glyph">△</span><span class="edge-label">OUTLANDS<br>AFTER HOURS</span><span class="edge-spark">✦ ✧</span></aside><aside class="edge-arena edge-arena-right" aria-hidden="true"><div class="edge-stitch"></div><span class="edge-glyph">◈</span><span class="edge-label">MIRAGE'S<br>HAUNTED ARENA</span><span class="edge-spark">✧ ✦</span></aside>`;
}
// The character is painted only once inside the backdrop art. No artificial gaze overlay.
function nav(){const nick=savedNickname();return `<header class="top gtp2-top"><div class="gtp2-top-inner">
  <button class="brand gtp2-brand gtp221-unified-brand" data-action="home" aria-label="The Apex Challenge home"><span class="gtp219-logo-emblem" aria-hidden="true"><svg viewBox="0 0 64 72" width="38" height="44" fill="none"><path d="M32 3 61 64H44L31 30 20 64H3L32 3Z" fill="currentColor"/><path d="M23 51h19l5 11H18l5-11Z" fill="#071222"/></svg></span><span class="gtp219-brand-type">THE APEX<strong>CHALLENGE</strong></span></button>
  <nav class="topnav" aria-label="Main navigation"><button class="nav-item ${screen==='home'?'active':''}" data-action="home">⌂ HOME</button><button class="nav-item ${screen==='trivia'?'active':''}" data-action="trivia">✦ TRIVIA</button><button class="nav-item ${screen==='game'?'active':''}" data-action="open" data-mode="classic">◈ PLAY</button><button class="nav-item ${screen==='leaderboard'?'active':''}" data-action="leaderboard">♛ RANKINGS</button><button class="nav-item ${screen==='records'?'active':''}" data-action="records">▤ STATS</button><button class="nav-item ${screen==='howto'?'active':''}" data-action="howto">? HOW TO PLAY</button><button class="nav-item ${screen==='faq'?'active':''}" data-action="faq">◉ FAQ</button></nav>
  <details class="gtp213-mobile-menu"><summary aria-label="Open site navigation">☰</summary><div class="gtp213-mobile-links"><button data-action="home" type="button">⌂ HOME</button><button data-action="trivia" type="button">✦ TRIVIA</button><button data-action="open" data-mode="classic" type="button">◈ PLAY</button><button data-action="leaderboard" type="button">♛ RANKINGS</button><button data-action="records" type="button">▤ STATS</button><button data-action="howto" type="button">? HOW TO PLAY</button><button data-action="faq" type="button">◉ FAQ</button></div></details>
  <div class="top-actions"><button class="switch gtp237-settings-switch" type="button" data-action="settings">⚙ SETTINGS</button><button class="switch gtp2-profile-switch" data-action="profile" aria-label="Choose nickname">${nick?`◉ ${esc(nick)}`:'◎ NICKNAME'}</button><button class="switch gtp2-sound-switch" data-action="audio" aria-label="Toggle sound" aria-pressed="${store.settings.audio}">${store.settings.audio?'♫ FX ON':'♪ FX OFF'}</button></div>
 </div></header>`;}
function settingsDialog(){
 if(document.getElementById('gtp237-settings'))return;
 const layer=document.createElement('div');layer.id='gtp237-settings';layer.className='gtp237-settings-backdrop';
 layer.innerHTML=`<div class="gtp237-settings-panel gtp246-settings-drawer" role="dialog" aria-modal="true" aria-label="Game settings"><div class="gtp237-settings-head"><div><span>OUTLANDS CONTROL PANEL</span><h2>SETTINGS</h2></div><button type="button" data-action="settings-close" aria-label="Close settings">✕</button></div><section class="gtp246-sound-section"><h3>♫ AUDIO CONTROLS</h3><p>Adjust the original Outlands sound effects.</p><label for="gtp237-volume">MASTER FX VOLUME <output id="gtp237-volume-output">${Math.round((store.settings.volume??.7)*100)}%</output></label><input id="gtp237-volume" type="range" min="0" max="100" step="1" value="${Math.round((store.settings.volume??.7)*100)}" aria-label="Sound effects volume"/></section><section class="gtp246-sound-section"><h3>◈ VISUAL SETTINGS</h3><div class="gtp237-settings-actions"><button type="button" data-action="audio">SOUND ${store.settings.audio?'ON':'OFF'}</button><button type="button" data-action="motion">ANIMATIONS ${store.settings.motion?'ON':'OFF'}</button><button type="button" data-action="sound-preview">TEST SOUND ✦</button></div></section><small>Preferences saved automatically.</small></div>`;
 layer.addEventListener('click',e=>{if(e.target===layer)layer.remove()});app.appendChild(layer);layer.querySelector('[data-action="settings-close"]')?.focus();
}
function statCards(){
  const day=currentDailyRounds(store.days,today());const stats=dailyStats(store.days,utcDay());
  return `<section class="dash" aria-label="Player statistics">
    <div class="stat"><label>DAILY PUZZLE</label><strong>${DAILY_TRACKS.filter(t=>day[t]?.finished).length}<small> / ${dailyModes().length}</small></strong><small>Completed today</small></div>
    <div class="stat"><label>CURRENT STREAK</label><strong>${stats.current}</strong><small>Consecutive Daily puzzle wins</small></div>
    <div class="stat"><label>PERSONAL BEST</label><strong>${store.history.bestScore||0}</strong><small>Best puzzle round; Trivia ranks separately</small></div>
    <div class="stat"><label>TOTAL WINS</label><strong>${store.history.wins||0}</strong><small>Saved on this browser · across both sessions</small></div>
  </section>`;
}
function forbiddenPanel(){
 const done=totalIntelCheckpoints();
 return `<section class="vault-showcase gtp218-record-rewards"><div class="vault-intro"><span class="kicker">✦ FORBIDDEN INTEL / TWO COMMUNITY GUIDES</span><h2>UNLOCK YOUR <em>INTEL.</em></h2><p>Complete your Daily puzzle and Daily Trivia to unlock two community guides.</p><div class="vault-track"><span style="width:${done/2*100}%"></span></div><strong>${done}/2 CHECKPOINTS COMPLETE</strong><div class="gtp218-reward-actions">${[1,2].map(n=>`<button class="btn mint" data-action="intel-open" data-checkpoint="${n}" ${intelState(n).unlocked?'':'disabled'}>${intelState(n).unlocked?(intelState(n).read?`✓ CHECKPOINT ${n} · READ`:`✦ CHECKPOINT ${n} · NEW`):`CHECKPOINT ${n} LOCKED`}</button>`).join('')}</div></div></section>`;
}
function intelDialog(){
  const tip=intelFor(today(),intelCheckpoint);
  const dialog=document.createElement('div');dialog.className='intel-backdrop';dialog.id='intel-dialog';dialog.setAttribute('role','presentation');
  dialog.innerHTML=`<div class="intel-modal tac275-intel-modal" role="dialog" aria-modal="true" aria-label="Forbidden Intel reward"><button class="intel-close" data-action="intel-close" type="button" aria-label="Close reward">✕</button><header class="tac275-intel-header"><span>DAILY CHALLENGE REWARD</span><strong>FORBIDDEN INTEL</strong></header>
      <div class="tac275-intel-body" tabindex="0" role="region" aria-label="Complete Intel brief"><div class="intel-reveal-scene"><span class="reward-spark s1">✦</span><span class="reward-spark s2">✧</span><span class="reward-spark s3">✦</span><span class="reward-spark s4">✧</span>
      <div class="tac275-unseal-stage"><div class="reward-chest gtp244-mythic-reward" role="img" aria-label="Mythic Supply Bin"><img src="./assets/decor/mythic-bin-halloween-v257.webp" alt="" loading="eager"/></div></div>
      <div class="tac275-paper-stage"><div class="gold-paper"><div class="paper-stamp">✦ OUTLANDS / DAILY REWARD ✦</div><h2>${intelCheckpoint===1?'FIELD<br>INTEL':intelCheckpoint===2?'RARE<br>INTEL':'LEGEND<br>INTEL'}</h2><span class="paper-legend">CHECKPOINT ${intelCheckpoint} · ${esc(tip.category)}</span><p><strong class="gtp223-intel-title">${esc(tip.title)}</strong> ${esc(tip.tip)}</p>${tip.input?`<small class="tac265-tip-input">${esc(tip.input)}</small>`:''}${tip.why?`<div class="tac259-intel-drill"><b>WHY IT WORKS</b><span>${esc(tip.why)}</span></div>`:''}${tip.mistake?`<div class="tac259-intel-drill"><b>COMMON MISTAKE</b><span>${esc(tip.mistake)}</span></div>`:''}${tip.drill?`<div class="tac259-intel-drill"><b>TRY IT NEXT MATCH</b><span>${esc(tip.drill)}</span></div>`:''}${tip.source?`<a class="gtp223-intel-source" href="${esc(tip.source)}" target="_blank" rel="noopener noreferrer">${esc(tip.sourceName||'COMMUNITY GUIDE')} ↗</a>`:'<span class="gtp223-intel-source">TACTICAL FIELD NOTE · THE APEX CHALLENGE</span>'}<small>COMMUNITY SOURCE REVIEWED · ${esc(tip.reviewed||today())}</small></div></div>
      <span class="reveal-boozle">BAMBOOZLED! ✦</span></div></div><div class="intel-dialog-footer"><button class="btn mint" data-action="intel-close" type="button">TAKE THE INTEL ✓</button></div></div>`;
  dialog.addEventListener('click',ev=>{if(ev.target===dialog){closeIntelDialog();render({scroll:false});}});
  app.appendChild(dialog);intelModalOpen=true;
  const close=dialog.querySelector('.intel-close');close?.focus({preventScroll:true});
  if(!intelFirstRevealPending){
    dialog.querySelector('.intel-modal')?.classList.add('reveal-started','reveal-finished');
  }else{ replayIntelReveal(); }
  intelFirstRevealPending=false;
}
function replayIntelReveal(){
  const modal=document.querySelector('.intel-modal');if(!modal)return;
  modal.classList.remove('reveal-started','reveal-finished');void modal.offsetWidth;
  modal.classList.add('reveal-started');sound('reveal');
  clearTimeout(intelAnimation);
  intelAnimation=setTimeout(()=>{if(modal.isConnected)modal.classList.add('reveal-finished');},1200);
}
function closeIntelDialog(){
  clearTimeout(intelAnimation);document.getElementById('intel-dialog')?.remove();intelModalOpen=false;
}
function dailyExtras(){
  const legend=dailySpotlight(utcDay(),legends);
  return `<section class="daily-extras" aria-label="Daily Legend and random Legend picker">
    <article class="daily-spotlight"><div class="spotlight-portrait">${portrait(legend.slug,{alt:legend.name,cls:'balanced'})}<span class="spotlight-corner">✦</span></div><div class="spotlight-copy"><span class="kicker">✳ LEGEND OF THE DAY</span><h3>${esc(legend.name)}</h3><p class="spotlight-role">${esc(legend.role)} · ${esc(legend.signature)}</p><p>Today's pick for your next match — changes every day, without spoiling today's puzzles.</p><span class="spotlight-reset">◷ REFRESHES AT 00:00 UTC</span></div></article>
    <article class="wheel-teaser"><div class="teaser-bubbles"><span>W</span><span>✦</span><span>28</span></div><div class="wheel-teaser-copy"><span class="kicker">FREE PLAY / OUTLANDS PICKER</span><h3>SPIN THE <em>WHEEL.</em></h3><p>28 Legends. One random pick. Zero excuses.</p><button class="btn dark" data-action="wheel" type="button">🎡 SPIN A LEGEND ↗</button></div></article>
  </section>`;
}
function homeIntelPanel(){
 const complete=Number(intelState(1).unlocked);
 const total=1;
 const {unlocked,read:claimed}=intelState(1);
 return `<article class="gtp214-intel-center gtp215-intel-feature" aria-label="Forbidden Intel daily reward">
   <div class="gtp215-intel-art" aria-hidden="true"><div class="vault-chest"><div class="vault-lid"><span>◆</span></div><div class="vault-box"><span>✦</span></div></div></div>
   <div class="gtp215-intel-details">
     <span class="gtp214-intel-kicker">✧ DAILY REWARD / ${complete} OF ${total}</span>
     <h2>FORBIDDEN <em>INTEL.</em></h2>
     <div class="gtp214-intel-track" role="progressbar" aria-valuenow="${complete}" aria-valuemin="0" aria-valuemax="${total}" aria-label="Daily challenges completed"><span style="width:${complete/total*100}%"></span></div>
     <p>${complete}/${total} MISSIONS COMPLETE</p>
     <button type="button" data-action="intel-open" data-checkpoint="1" ${unlocked?'':'disabled'}>${unlocked?(claimed?'✦ VIEW TODAY’S INTEL':'✦ REVEAL YOUR INTEL'):'◆ COMPLETE YOUR DAILY PUZZLE TO UNLOCK'}</button>
   </div>
 </article>`;
}
function homeFeatureDock(){
 const legend=dailySpotlight(utcDay(),legends);
 return `<section class="gtp213-dock gtp214-dock" aria-label="Next game and Legend of the day">
  <button class="gtp213-dock-card gtp213-dock-wheel gtp216-wheel-hitbox" type="button" data-action="wheel" aria-label="Spin the wheel to pick your next game Legend"><span class="gtp213-dock-kicker">◈ PLAY SOMETHING DIFFERENT</span><span class="gtp213-dock-main"><span class="gtp213-dock-icon gtp216-wheel-graphic" aria-hidden="true"><span class="gtp216-wheel-dial"></span></span><span class="gtp216-wheel-copy"><strong class="gtp216-wheel-title">NEXT GAME <em>LEGEND.</em></strong><span class="gtp216-wheel-descript">Spin for a random Legend to play next.</span></span></span><span class="gtp216-wheel-cta">✦ SPIN THE WHEEL <span aria-hidden="true">↗</span></span></button>
  <article class="gtp213-dock-card gtp213-dock-legend"><div class="gtp213-dock-portrait">${portrait(legend.slug,{alt:'',cls:'balanced'})}</div><div class="gtp213-dock-legend-copy"><span class="gtp213-dock-kicker">✳ LEGEND OF THE DAY</span><h3>${esc(legend.name)}</h3><p>${esc(legend.role)} · ${esc(legend.signature)}</p><small>NEW PICK EVERY DAY</small></div></article>
 </section>`;
}
function modeTile(mode,i){
 const round=store.days[today()]?.[mode];
 const status=session==='daily'&&round?.finished?(round.won?'✓ CLEARED':'✓ COMPLETED'):'PLAY NOW ↗';
 return `<button class="arena-mode gtp2-mode-card gtp2-card-${mode} ${round?.finished&&session==='daily'?'finished':''}" data-action="open" data-mode="${mode}" style="--tile:${classOf(mode)}" aria-label="Play ${MODE_NAMES[mode]}">
   <span class="gtp2-mode-number">0${i+1}</span><span class="gtp2-mode-glyph" aria-hidden="true">${ICONS[mode]}</span>
   <span class="gtp2-mode-copy"><strong>${MODE_NAMES[mode]}</strong><small>${TAGLINES[mode]}</small><em>${status}</em></span><span class="gtp2-mode-arrow">❯</span>
 </button>`;
}
/** Decorative mode hosts never reveal the hidden answer. */
const MODE_HOSTS=Object.freeze({
 classic:{slug:'loba',name:'LOBA'},pixel:{slug:'sparrow',name:'SPARROW'},
 quote:{slug:'wraith',name:'WRAITH'},ability:{slug:'octane',name:'OCTANE'},
 emoji:{slug:'wattson',name:'WATTSON'},trivia:{slug:'crypto',name:'CRYPTO'},
 wheel:{slug:'pathfinder',name:'PATHFINDER'}
});
function modeHostBadge(mode){
 const host=MODE_HOSTS[mode]||MODE_HOSTS.classic;
 return `<span class="gtp238-mode-portrait" aria-hidden="true">${portrait(host.slug,{alt:'',cls:'balanced',eager:true})}</span>`;
}
function playContext(isDaily,{trivia=false,home=false}={}){
 const chosen=chosenDaily(store.days,today()),finished=!!chosen?.round.finished;
 const copy=trivia?(isDaily?'One ranked run today · separate Trivia leaderboard':'Unlimited practice · no leaderboard points'):isDaily?'One puzzle · choose Full Scan or One Signal · 00:00 UTC reset':'Unlimited rounds · scores do not affect rankings';
 return '<section class="tac-play-context '+(isDaily?'is-daily':'is-free')+' '+(home?'is-home':'')+'" aria-label="Current play type"><div class="tac-context-copy"><span class="tac-context-label">'+(isDaily?'◈ DAILY CHALLENGE':'∞ FREE PLAY')+'</span><p>'+copy+'</p></div>'+(home?'<div class="tac-play-selector" role="group" aria-label="Choose Daily Challenge or Free Play"><button type="button" data-action="home-session" data-session="daily" aria-pressed="'+isDaily+'">◈ DAILY CHALLENGE</button><button type="button" data-action="home-session" data-session="unlimited" aria-pressed="'+!isDaily+'">∞ FREE PLAY</button></div>':'<button type="button" class="tac-context-switch" data-action="'+(trivia?'trivia-mode':isDaily?'session':'home-daily')+'" '+(trivia?'data-trivia-mode="'+(isDaily?'practice':'daily')+'"':'data-session="unlimited"')+'>'+(isDaily?'SWITCH TO FREE PLAY':'CONTINUE DAILY')+' ↗</button>')+(home&&isDaily?'<div class="tac-daily-progress"><button type="button" data-action="home-daily"><b>'+(chosen?DAILY_RULES[chosen.track].difficulty+' · '+DAILY_RULES[chosen.track].label:'START DAILY PUZZLE')+'</b><span>'+(finished?'COMPLETED · VIEW RESULT':chosen?'RESUME '+MODE_NAMES[chosen.gameMode]:'CHOOSE YOUR DIFFICULTY')+'</span></button><button type="button" data-action="trivia" data-trivia-mode="daily"><b>DAILY TRIVIA</b><span>'+(triviaRewardEarned()?'COMPLETED':'SEPARATE KNOWLEDGE RUN')+'</span></button></div>':'')+'</section>';
}
function home(){
 const rounds=currentDailyRounds(store.days,today());
 const done=checkpointCount(store.days,today());
 const intelDone=totalIntelCheckpoints();
 const spotlight=dailySpotlight(utcDay(),legends),scheduled=dailySchedule(today());
 const freeSelected=session==='unlimited';
 const dailyStatus=rounds.full?.finished?(rounds.signal?.finished?'BOTH DAILY CHALLENGES COMPLETE':`02 · ONE SIGNAL ${rounds.signal?.guesses?.length?'RESUME ('+rounds.signal.guesses.length+' GUESSES)':'UNLOCKED'}`):`01 · FULL SCAN ${rounds.full?.guesses?.length?'RESUME ('+rounds.full.guesses.length+' GUESSES)':'READY'}`;
 const cards=[
   ['classic','CLASSIC','Find the mystery Legend.','⌕'],
   ['pixel','PIXEL','See through the blur.','▦'],
   ['quote','QUOTE','Identify the voice line.','❞'],
   ['ability','ABILITY','Read the ability symbol.','◈'],
   ['emoji','EMOJI','Five symbols. One Legend.','✦'],
   ['trivia','TRIVIA','Five questions · 20 seconds each.','✧']
 ];
 const card=([mode,title,description,glyph],i)=>`<button type="button" class="gtp222-orbit-card gtp238-mode-card gtp222-card-${mode} gtp224-orbit-${i+1}" data-host="${MODE_HOSTS[mode].slug}" data-action="${mode==='trivia'?'trivia':'open'}" ${mode==='trivia'?'':`data-mode="${mode}" data-session="unlimited"`} aria-label="${mode==='trivia'?'Open Trivia':'Play '+title} hosted by ${MODE_HOSTS[mode].name}">${modeHostBadge(mode)}<span class="gtp222-orbit-copy"><span class="gtp238-host-name">✦ ${MODE_HOSTS[mode].name} · MODE GUIDE</span><strong>${title}</strong><small>${description}</small></span><span class="gtp222-orbit-arrow" aria-hidden="true">↗</span></button>`;

 const unread=[1,2].find(n=>intelState(n).unlocked&&!intelState(n).read);
 const lastUnlocked=[2,1].find(n=>intelState(n).unlocked);
 const intelTarget=unread||lastUnlocked||1;
 const showcase=[
  {id:'classic',title:'CLASSIC MODE',host:'loba',description:'Find the mystery Legend.',action:'open',mode:'classic',accent:'red'},
  {id:'pixel',title:'PIXEL MODE',host:'sparrow',description:'Decode the distorted silhouette.',action:'open',mode:'pixel',accent:'cyan'},
  {id:'quote',title:'QUOTE MODE',host:'wraith',description:'Recognize the intercepted voice.',action:'open',mode:'quote',accent:'purple'},
  {id:'ability',title:'ABILITY MODE',host:'octane',description:'Read the tactical signature.',action:'open',mode:'ability',accent:'lime'},
  {id:'emoji',title:'EMOJI MODE',host:'wattson',description:'Five symbols. One Legend.',action:'open',mode:'emoji',accent:'gold'},
  {id:'trivia',title:'TRIVIA',host:'crypto',description:'Crack five Apex intel questions.',action:'trivia',accent:'blue'}
 ];
 const heroCard=cfg=>{
 const selected=chosenDaily(store.days,today());const dailyMode=selected?.gameMode||'classic';const track=cfg.mode===dailyMode?(selected?.track||'full'):null;
 const locked=session==='daily'&&cfg.id!=='trivia'&&!track;
 const completed=session==='daily'&&(cfg.id==='trivia'?triviaRewardEarned():Boolean(track&&rounds[track]?.finished));
 const action=session==='daily'&&cfg.id!=='trivia'?(track?'home-daily':'open'):cfg.action;
 const r=track?rounds[track]:store.practice[cfg.mode];
 const state=session==='daily'?(cfg.id==='trivia'?(triviaRewardEarned()?'DAILY COMPLETED':'DAILY RANKED'):!track?'FREE PLAY ONLY TODAY':r?.finished?'DAILY COMPLETED':locked?'CHOOSE DIFFICULTY':r?.guesses?.length?'RESUME DAILY':'PLAY DAILY'):'FREE PLAY · UNRANKED';
 return `<button type="button" class="gtp239-mode-card gtp246-orbit-mode gtp239-${cfg.accent} ${completed?'tac-completed':''}" data-host="${cfg.host}" data-sound="${cfg.id}" data-action="${action}" ${cfg.mode?`data-mode="${cfg.mode}" data-session="unlimited"`:`data-trivia-mode="${session==='daily'?'daily':'practice'}"`} ${locked||completed?'disabled':''} aria-label="${cfg.title} — ${state}">
 <span class="gtp239-mode-ring gtp242-mode-medallion" aria-hidden="true"><span class="gtp242-ring-detail"></span><span class="gtp242-ring-notch"></span><svg class="tac267-mode-symbol" viewBox="0 0 36 36">${MODE_SYMBOLS267[cfg.id]}</svg></span>
 <span class="gtp239-mode-caption gtp242-mode-plate"><span class="gtp242-host-name">${cfg.host.toUpperCase()} · YOUR HOST</span><strong>${cfg.title}</strong><small>${cfg.description}</small><span class="tac-card-state">${state}</span></span></button>`;
 };
 return `<main class="gtp219-home gtp222-home gtp239-home gtp246-outlands-home" aria-label="The Apex Challenge homepage">
  <div class="gtp219-backdrop" aria-hidden="true"></div>
  <div class="gtp239-sky" aria-hidden="true"><span class="gtp239-embers"></span></div>
  <div class="gtp238-mirage-duo gtp239-mirage-duo" aria-hidden="true"><span class="gtp238-mirage-figure gtp239-mirage-figure gtp238-mirage-left"></span><span class="gtp238-mirage-figure gtp239-mirage-figure gtp238-mirage-right"></span></div>
  <div class="gtp222-layout gtp239-layout">
   <header class="gtp239-masthead"><span>THE APEX</span><h1>CHALLENGE</h1><small>APEX LEGENDS DAILY CHALLENGE</small></header>${playContext(session==='daily',{home:true})}
   <div class="gtp222-arena gtp239-arena gtp246-home-arena" aria-label="Six original game modes with individual Legend themes">
    <section class="gtp222-side gtp239-side gtp239-side-left" aria-label="Classic, Pixel and Quote">${showcase.slice(0,3).map(heroCard).join('')}</section>
    <section class="gtp222-core gtp239-core gtp246-home-core ${freeSelected?'tac268-free-core':''}" aria-label="Forbidden Intel Supply Bin">
      <div class="gtp239-bin-stage" role="img" aria-label="Halloween Mythic Supply Bin surrounded by candles and thorns"><span class="gtp239-bin-floor"></span><img class="gtp239-bin-image" src="./assets/decor/mythic-bin-halloween-v257.webp" alt="" loading="eager" decoding="async"/><span class="gtp239-bin-spark one">✦</span><span class="gtp239-bin-spark two">✦</span></div>
      ${freeSelected?'':`<div class="gtp239-intel-panel gtp246-intel-hub tac276-intel-brief"><span class="gtp239-kicker">✦ YOUR DAILY OBJECTIVE ✦</span><h2>FORBIDDEN <em>INTEL</em></h2><p>Complete today’s Daily to unlock real Apex techniques and a drill to try next match.</p>
       <button type="button" class="gtp239-open-intel" data-action="${lastUnlocked?'intel-open':'home-daily'}" ${lastUnlocked?`data-checkpoint="${intelTarget}"`:''}>◈ ${lastUnlocked?'OPEN MYTHIC INTEL':'PLAY DAILY · UNLOCK INTEL'} <span>↗</span></button>
       <p class="tac275-reward-path">Daily puzzle → Field Intel · Daily Trivia → Rare Intel</p><small class="tac275-daily-date">${today()} · resets at 00:00 UTC${sharedDay?' · ARCHIVED DAY':''}</small><details class="gtp239-reward-details"><summary>INTEL CHECKPOINTS · ${intelDone} / 2 <span aria-hidden="true">⌄</span></summary>
        <div class="gtp219-rewards gtp239-reward-grid">${[1,2].map(n=>{const {unlocked,read}=intelState(n);return `<button type="button" class="${unlocked?(read?'gtp223-read':'gtp223-new'):''}" data-action="intel-open" data-checkpoint="${n}" ${unlocked?'':'disabled'}><span>${unlocked?(read?'✓':'✦'):'◇'} ${n===1?'DAILY PUZZLE':'DAILY TRIVIA'}</span><small>${unlocked?(read?'READ ✓':'NEW · OPEN ↗'):'LOCKED'}</small></button>`}).join('')}</div>
       </details>
      </div>`}

    </section>
    <section class="gtp222-side gtp239-side gtp239-side-right" aria-label="Ability, Emoji and Trivia">${showcase.slice(3).map(heroCard).join('')}</section>
   </div>
   <section class="tac258-discover" aria-label="More ways to play">
    <button type="button" data-action="wheel" class="tac258-card tac258-random" aria-label="Spin the wheel to choose your next Legend">
     <span class="tac258-wheel" aria-hidden="true"><span class="tac258-wheel-face"><i></i><b>A</b></span></span>
     <span class="tac258-copy"><span class="tac258-eyebrow">THE LEGEND RITUAL</span><strong>SPIN THE<br><em>WHEEL.</em></strong><span class="tac258-description">Let fate choose your next drop.</span><span class="tac258-cta">SUMMON A LEGEND <span aria-hidden="true">↗</span></span></span>
    </button>
    <article class="tac258-card tac258-daily">
     <div class="tac258-copy"><span class="tac258-eyebrow">LEGEND OF THE DAY</span><h2>${esc(spotlight.name)}</h2><span class="tac258-role">${esc(spotlight.role)}</span><p class="tac258-description">A new main. Just for tonight.</p><span class="tac258-reset">NEXT PICK · 00:00 UTC</span></div>
     <div class="tac258-portrait">${portrait(spotlight.slug,{alt:spotlight.name,cls:'balanced',eager:true})}</div>
    </article>
   </section>
   <footer class="gtp219-footer">♥ Made by Sebyby</footer>
  </div>
 </main>`;
}
function homeLegacy(){
 return `<main class="gtp2-home">
  <section class="gtp2-hero nova27-home" aria-label="The Apex Challenge — five game modes">
   <img id="gtp2-backdrop" class="gtp2-backdrop" src="./assets/decor/haunted-hero.webp" alt="" aria-hidden="true" fetchpriority="high"/>
   <div class="gtp216-center-clear" aria-hidden="true"></div>
   <div class="gtp216-mirage-duo" aria-hidden="true"><span class="gtp216-mirage gtp216-mirage-left"></span><span class="gtp216-mirage gtp216-mirage-right"></span></div>
   <div class="gtp2-vignette" aria-hidden="true"></div>
   <div class="gtp2-hero-content">
     <div class="gtp214-hero-intro"><span>✦ FIVE MISSIONS · ONE MYSTERY</span><p>Pick your challenge. Follow the clues.</p></div>
     ${homeIntelPanel()}
     <div class="gtp2-switchline gtp27-session-picker"><div class="gtp2-session" role="group" aria-label="Play type"><button data-action="session" data-session="daily" class="${session==='daily'?'active':''}" aria-pressed="${session==='daily'}">◈ DAILY CHALLENGE</button><button data-action="session" data-session="unlimited" class="${session==='unlimited'?'active':''}" aria-pressed="${session==='unlimited'}">∞ FREE PLAY</button></div></div>
     <div class="gtp212-cascade" aria-label="Five playable daily modes">
       ${['classic','pixel','quote','ability','emoji'].map((mode,i)=>`<div class="gtp212-step gtp212-step-${mode}">${modeTile(mode,i)}</div>`).join('')}
     </div>
     ${homeFeatureDock()}
     <footer class="gtp213-credit"><strong>Made by Sebyby</strong><span>Independent fan trivia · Not affiliated with EA or Respawn · Artwork subject to third-party rights</span></footer>
   </div>
  </section>
 </main>`;
}
function getVisual(round,target){
  const mode=active;
  if(mode==='pixel'){
    const effect='soft';
    const step=round.won?6:Math.min(round.guesses.length,6);
    // Pixelate and blur the FULL COMPOSITE SCENE (location, lights, character), not a lone cutout.
    const sizes=[9,10,12,16,23,36,900];
    const blur=effect==='soft'?[2.8,2.5,2.1,1.6,1.1,.6,0]:effect==='holo'?[18,16,13,9,6,3,0]:[16,14,11,8,5,2,0];
    const pct=[6,15,28,46,66,84,100];
    const size=sizes[step];
    return `<div class="clue-visual visual-pixel px-effect-${effect} nova-pixel-scene ${round.won?'pixel-revealed':''}"><div class="pixel-art" style="--px-blur:${blur[step]}px;--px-progress:${pct[step]}%">
      <canvas class="pixel-canvas" data-resolution="${size}" width="${size}" height="${size}" aria-label="${round.won?esc(target.name)+' fully revealed':'Progressively decrypted full scene featuring a Legend'}"></canvas>
      ${portrait(target.slug,{alt:'',cls:'pixel-source',concealed:!round.finished,eager:true})}
      <div class="pixel-fallback" role="group" aria-label="Offline character identity clues"><span class="pixel-fallback-kicker">◈ BACKUP INTEL / SIGNAL RECOVERY</span><div class="pixel-fallback-emblem">${step>=4?esc((target.emoji.split(/\s+/)[0]||'◇')):'?'}</div><strong>${step>=3?esc(target.role.toUpperCase()):'CLASSIFIED ROLE'}</strong><p>${step>=5?esc(target.title):'IDENTITY PROFILE ENCRYPTED'}</p><small>${step>=6?esc(target.signature):'ADDITIONAL INTEL UNLOCKS AFTER GUESSES'}</small></div><div class="pixel-error" aria-hidden="true"></div><div class="pixel-scratch scratch-a"></div><div class="pixel-scratch scratch-b"></div><div class="pixel-scan"></div><div class="pixel-vignette"></div>
      </div><div class="pixel-dots"></div><div class="pixel-caption">${round.won?esc(target.name).toUpperCase()+' · FULLY REVEALED':'DECRYPTION '+pct[step]+'% · '+(maxGuesses(round)-round.guesses.length)+' MOVES LEFT'}</div>${round.won?'<button type="button" class="tac-pixel-full" data-action="pixel-full" aria-expanded="false">VIEW FULL IMAGE ↗</button>':''}</div>`;
  }
  if(mode==='quote')return `<div class="clue-visual gtp2-quote-rework gtp29-quote-visual"><div class="gtp2-quote-head"><span>◈ WRITTEN CLUE / NO VOICE IMPERSONATION</span><span>CHANNEL 0${MODES.indexOf(active)+1}</span></div><div class="gtp29-quote-card"><blockquote>“${esc(target.quote)}”</blockquote><div class="gtp29-quote-footer"><span class="gtp2-live-dot"></span><b>SPEAKER UNKNOWN</b><small>Use class, age and launch comparisons to narrow it down.</small></div></div></div>`;
  if(mode==='ability')return `<div class="clue-visual visual-ability gtp210-ability-stage" aria-label="Ability icon puzzle">
    <div class="gtp210-clue-top"><span><i class="gtp210-live-dot"></i> ABILITY / PASSIVE</span><small>FILE 04 · CLASSIFIED</small></div>
    <div class="gtp210-ability-core">
      <div class="gtp210-orbit-detail" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <div class="ability-symbol gtp210-ability-icon" role="img" aria-label="Mystery Legend ability icon"><img data-ability="${esc(target.slug)}" alt="" loading="eager"/><span class="ability-wait">LOADING<br>ABILITY ICON…</span><span class="ability-fail">ABILITY ICON<br>UNAVAILABLE</span></div>
      <div class="gtp210-scan-tag">VISUAL SCAN // 01</div>
    </div>
    <div class="gtp210-clue-bottom"><strong>RECOGNIZE THE ABILITY.</strong><span>Identify the Legend from the icon above.</span></div>
  </div>`;
  if(mode==='emoji'){
    const all=[...target.emoji.split(/\s+/),...target.extraEmoji];
    const shown=round.finished?all.length:visibleEmojiCount(round,all.length);
    return `<div class="clue-visual visual-emoji gtp210-emoji-stage" aria-label="Emoji puzzle: ${shown} of ${all.length} symbols visible">
      <div class="gtp210-clue-top"><span><i class="gtp210-live-dot"></i> EMOJI / DECRYPTION</span><small>${shown} / ${all.length} UNLOCKED</small></div>
      <div class="gtp210-emoji-core">
        <span class="gtp210-inner-kicker">FIVE SYMBOLS. ONE LEGEND.</span>
        <div class="gtp210-emoji-slots" role="group" aria-label="Emoji clues">${all.map((symbol,i)=>`<span class="gtp210-emoji-tile ${i>=shown?'is-locked':'is-visible'}" aria-label="${i<shown?'Visible clue '+(i+1):'Locked clue '+(i+1)}"><span>${i<shown?esc(symbol):'<b aria-hidden="true">?</b>'}</span><small>0${i+1}</small></span>`).join('')}</div>
        <div class="gtp210-reveal-track" aria-hidden="true">${all.map((_,i)=>`<span class="${i<shown?'is-lit':''}"></span>`).join('')}</div>
      </div>
      <div class="gtp210-clue-bottom"><strong>${shown===all.length?'ALL FIVE CLUES REVEALED':'DECRYPT THE REMAINING CLUES.'}</strong><span>${shown===all.length?'You have every symbol — make your final guess.':'Starts with 2 symbols. Unlock more after guesses 1, 3 and 5.'}</span></div>
    </div>`;
  }
  return `<div class="clue-visual gtp27-mystery gtp29-classic-visual gtp229-mystery-visual"><div class="mystery-wording"><small>01 · UNKNOWN LEGEND</small><strong>CRACK THE IDENTITY.</strong><span>${round.mode==='full'?'Make a guess. Compare six traits. Follow the scanner.':'Make a guess. Reveal one comparison. Follow the signal.'}</span></div></div>`;
}
function quickModeLinks(selected){
 const all=[...MODES,'trivia'];
 return '<nav class="gtp250-mode-links" aria-label="Quick links between game modes"><span class="gtp250-mode-links-label">'+(session==='daily'?'SWITCH TO FREE PLAY':'FREE PLAY MODES')+'</span>'+all.map(mode=>{
  const selectedMode=session==='unlimited'&&selected===mode;
  const route=mode==='trivia'?'data-action="trivia" data-trivia-mode="practice"':'data-action="open" data-mode="'+mode+'" data-session="unlimited"';
  return '<button type="button" class="gtp250-mode-link '+(selectedMode?'active':'')+'" '+route+' '+(selectedMode?'aria-current="page"':'')+'><span>'+(mode==='trivia'?'✧':ICONS[mode])+'</span> '+(mode==='trivia'?'TRIVIA':MODE_NAMES[mode])+'</button>';
 }).join('')+'</nav>';
}
function modeRail(){return `<nav class="mode-rail" aria-label="Switch game mode">${MODES.map(mode=>`<button class="mode-tab ${active===mode?'active':''} ${session==='daily'&&Object.values(currentDailyRounds(store.days,today())).some(r=>r?.won&&r.answer===answers()[mode])?'done':''}" style="--tile:${classOf(mode)}" data-action="open" data-mode="${mode}" ><b>${ICONS[mode]}</b><span>${MODE_NAMES[mode]}</span></button>`).join('')}</nav>`;}
function styleStrip(round){
  const locked=session==='daily'||round.guesses.length>0||round.finished;
  return `<div class="style-strip" aria-label="Round rules">
    <div><strong>${session==='daily'?'DAILY SCAN · RULES LOCKED':'CHOOSE YOUR SCAN'}</strong><div class="style-description">${round.mode==='signal'?'ONE SIGNAL: one comparison per guess; confirmed matches stay saved':'FULL SCAN: all six comparisons; confirmed matches stay saved'}</div></div>
    <div class="style-options" role="group" aria-label="Choose feedback"><button class="segment ${round.mode==='signal'?'active':''}" data-action="style" data-style="signal" ${locked?'disabled':''}>✦ ONE SIGNAL</button><button class="segment ${round.mode==='full'?'active':''}" data-action="style" data-style="full" ${locked?'disabled':''}>▦ FULL SCAN</button><button class="segment rush-btn ${round.timeLimit?'active':''}" data-action="rush" ${locked?'disabled':''}>⌛ RUSH ${round.timeLimit?round.timeLimit+'s':'OFF'}</button></div>
  </div>`;
}
function latestSignal(round,target){
  if(!round.guesses.length)return `<div class="flash idle"><span class="signal-mark">✧</span><span><strong>AWAITING YOUR FIRST GUESS</strong><small>Your next guess will reveal ${round.mode==='signal'?'one of the six traits':'all six traits'}.</small></span></div>`;
  if(round.mode==='full')return `<div class="flash idle"><span class="signal-mark">▦</span><span><strong>FULL SCAN · PROGRESS SAVED</strong><small>Every guess compares all six traits. Correct matches stay green even when a later guess differs.</small></span></div>`;
  const s=round.signals.at(-1);
  if(!s)return `<div class="flash idle"><span class="signal-mark">⌁</span><span><strong>NO NEW SIGNAL</strong><small>All remaining comparable fields were already revealed.</small></span></div>`;
  const correct=s.kind==='correct';
  return `<div class="flash intel-neutral" role="status"><span class="signal-mark">⌁</span><span><strong>${esc(s.guess)} · ${LABELS[s.field]} ${correct?'TRAIT MATCH':'TRAIT DIFFERENCE'}${s.direction?s.direction>0?' ↑':' ↓':''}</strong><small>${esc(s.value)} ${s.direction?(s.direction>0?'· Target has a higher value':'· Target has a lower value'):correct?'· Only this trait matches — target not found':'· Keep investigating'} · NOT A WIN</small></span></div>`;
}
function scannerMarkup(round,target){
  if(!round.guesses.length)return `<section class="gtp229-scan-preview" aria-label="Identity scanner waiting for guesses"><span class="gtp229-step">03 · IDENTITY SCANNER</span><strong>SCAN READY · AWAITING GUESS</strong><small>Make a guess to compare traits. Green = MATCH, red = DIFFERENT.</small></section>`;
  const scanner=scannerState(round,target,legends);
  const lastField=round.signals.at(-1)?.field;
  const verified=FIELDS.filter(field=>scanner[field]?.kind==='correct'||scanner[field]?.kind==='hint');
  const chips=verified.map(field=>`<span class="gtp222-locked-chip"><b>✓ ${LABELS[field]}</b> ${esc(scanner[field].value)}</span>`).join('');
  const cells=FIELDS.map(field=>{
    const signal=scanner[field];const kind=signal.kind;
    const css=kind==='correct'?'good':kind==='wrong'?'bad':kind==='hint'?'hinted':kind==='unknown'?'unknown':'';
    const direction=signal.direction>0?'↑':signal.direction<0?'↓':'';
    return `<div class="scan-cell ${css} ${field===lastField?'new':''}" data-scan-kind="${kind}" title="${LABELS[field]}" aria-label="${LABELS[field]}: ${kind==='wrong'?'does not match':kind==='correct'?'matches':kind}"><small>${LABELS[field]}</small><strong>${kind==='unknown'?'UNKNOWN':kind==='hidden'?'—':esc(signal.value)}${direction?' '+direction:''}</strong><span>${kind==='correct'?'✓ MATCH':kind==='wrong'?'✕ WRONG · DIFFERENT':kind==='hint'?'✓ HINT MATCH':kind==='unknown'?'UNKNOWN':'—'}</span></div>`;
  }).join('');
  const matches=FIELDS.filter(field=>scanner[field]?.kind==='correct'||scanner[field]?.kind==='hint').length;
  const misses=FIELDS.filter(field=>scanner[field]?.kind==='wrong').length;
  const remaining=availableHintFields(round,target,legends);
  const disabled=round.finished||round.guesses.length===0||round.hints.length>=MAX_HINTS||remaining.length===0;
  return `<div class="scanner-head gtp226-scanner-head"><div><strong>◈ IDENTITY SIGNAL BOARD</strong><small>${round.mode==='full'?'FULL SCAN · ALL SIX TRAITS, MATCHES LOCKED':'ONE SIGNAL · ONE TRAIT PER GUESS, MATCHES LOCKED'}</small></div><div class="gtp226-scan-metrics" aria-label="${matches} matching and ${misses} different traits"><span class="matching">✓ ${matches} MATCH</span><span class="different">✕ ${misses} DIFFERENT</span></div></div>
  ${round.mode==='signal'?`<div class="gtp222-locked-intel" role="status" aria-label="Previously confirmed traits"><strong>CONFIRMED INTEL</strong><div>${chips||'<small>Correct traits will stay locked here after every new guess.</small>'}</div></div>`:''}<div class="scanner" role="group" aria-label="Legend scanner">${cells}</div>
  `;
}
function fullScanHistoryMarkup(round,target){
  if(round.mode!=='full'||!round.guesses.length)return '';
  // Each row is a snapshot at that guess: future guesses cannot retroactively change it.
  const rows=round.guesses.map((name,i)=>{
    const snapshot={...round,guesses:round.guesses.slice(0,i+1),hints:[]};
    const state=scannerState(snapshot,target,legends);
    const chips=FIELDS.map(field=>{
      const kind=state[field]?.kind;
      const css=kind==='correct'?'locked':kind==='wrong'?'miss':'pending';
      const marker=kind==='correct'?'✓':kind==='wrong'?'×':'·';
      return '<small class="'+css+'">'+LABELS[field]+' '+marker+'</small>';
    }).join('');
    return '<div class="gtp222-scan-attempt"><b>'+(i+1)+'. '+esc(name)+'</b><span>'+chips+'</span></div>';
  }).join('');
  return '<div class="gtp222-scan-history" aria-label="Full Scan history, preserving previously confirmed traits">'+rows+'</div>';
}
function guessBody(round,target){
  if(round.finished){
    const score=gameScore(round);const rank=gameRank(score);const badges=styleBadges(round);
    return `<div class="end-panel ${round.won?'gtp212-victory':''}"><span class="rank">${round.won?rank:'—'}</span><h2>${round.won?'TARGET FOUND!':round.loss==='time'?'TIME’S UP.':'NICE TRY.'}</h2><p>${round.won?`You identified ${esc(target.name)} in ${round.guesses.length} guesses. ${score} points earned.`:`Your mystery Legend was ${esc(target.name)}. Every guess counts. Try another round!`}</p>${badges.length?`<div class="medal-row">${badges.map(tag=>`<span class="medal">${esc(tag)}</span>`).join('')}</div>`:''}<div class="answer-tag">${portrait(target.slug,{alt:target.name,cls:'balanced'})}<strong>${esc(target.name)}</strong></div>
      <div class="end-actions">${session==='daily'?`<button class="btn pink" data-action="next" data-session="daily">${dailyNextLabel()} ↗</button>`:'<button class="btn pink" data-action="next" data-session="unlimited">↻ PLAY AGAIN</button>'}<button class="btn ghost" data-action="home">BACK TO MODES</button></div></div>${session==='daily'?intelReadyMarkup(1):''}${round.mode==='full'?scannerMarkup(round,target):''}`;
  }
  const hintUnavailable=round.guesses.length===0||round.hints.length>=MAX_HINTS||availableHintFields(round,target,legends).length===0;
  return `<div class="gtp229-stepbar"><div><span class="gtp229-step">02 · YOUR GUESS</span><h2>IDENTIFY THE <em>LEGEND</em></h2></div><strong class="gtp229-remaining">${maxGuesses(round)-round.guesses.length}<small> GUESSES LEFT</small></strong></div>
  <div class="gtp229-answer-zone">
    <div class="search-wrap gtp229-search-wrap"><input id="guess-search" autocomplete="off" aria-label="Search a Legend" placeholder="Type a Legend name…" value="${esc(quickSearch)}"/><button type="button" class="btn pink gtp229-submit" data-action="submit-search" title="Guess the first matching Legend">GUESS ↗</button><div id="search-results" class="search-list" style="display:none"></div></div>
    <div class="guess-tools gtp229-guess-actions"><button type="button" class="btn mint gtp229-browse" data-action="picker">▦ BROWSE LEGENDS</button><button type="button" class="btn lilac gtp229-hint" data-action="hint" ${hintUnavailable?'disabled':''}>✧ GET HINT <small>${MAX_HINTS-round.hints.length} LEFT</small></button></div>
    <p class="gtp229-action-help">${round.guesses.length===0?'Start with any Legend · hints unlock after your first guess':'Choose another Legend, or request a hint if you are stuck.'}</p>
  </div>
  ${round.guesses.length?latestSignal(round,target):''}
  ${round.guesses.length?`<div class="gtp28-instant-history gtp229-history" aria-label="Previous attempts"><b>PREVIOUS GUESSES</b>${round.guesses.map((name,i)=>`<span>${i+1}. ${esc(name)}</span>`).join('')}</div>`:''}
  ${scannerMarkup(round,target)}`;
}

/** V2.30 cinematic round surface: UI only; engine scoring remains unchanged. */
function victoryIntelState(round,target){
 if(!round.won)return null;
 return Object.fromEntries(FIELDS.map(field=>[field,{kind:'hint',value:formatValue(target[field],field)}]));
}
function cinematicIdentityBoard(round,target){
 const state=round.won?victoryIntelState(round,target):round.guesses.length?scannerState(round,target,legends):null;
 const latest=round.mode==='full'&&round.guesses.length?scannerState({...round,guesses:round.guesses.slice(-1),hints:[]},target,legends):null;
 const latestMatches=latest?FIELDS.filter(field=>latest[field]?.kind==='correct').length:0;
 const comparison=latest?'<div class="tac-latest-comparison" aria-label="Latest guess comparison"><span>'+esc(round.guesses.at(-1))+'</span><small>'+latestMatches+'/6 matching this guess</small></div>':'';
 const excluded=Object.fromEntries(FIELDS.map(field=>[field,[]]));
 if(round.mode==='full')for(const name of round.guesses){
  const compared=scannerState({...round,guesses:[name],hints:[]},target,legends);
  for(const field of FIELDS){const trait=compared[field];if(trait?.kind==='wrong'&&!excluded[field].includes(trait.value))excluded[field].push(trait.value);}
 }
 const names={realName:'REAL NAME',name:'REAL NAME',role:'CLASS',class:'CLASS',age:'AGE',release:'RELEASE',season:'SEASON'};
 const rows=FIELDS.map((field,i)=>{
  const trait=state?.[field];
  const kind=trait?.kind||'hidden';
  const status=kind==='correct'||kind==='hint'?'match':kind==='wrong'?'different':'unknown';
  // The engine's comparison already includes the disclosed actual match;
  // never read the concealed answer here, as UNKNOWN/DIFFERENT remain hidden.
  const wording=round.mode==='full'&&kind==='wrong'?'Not: '+trait.value:scannerDisplayValue(field,trait);
  const earlier=round.mode==='full'?excluded[field].filter(value=>kind!=='wrong'||value!==trait.value):[];
  const eliminated=earlier.length?'<small class="tac-eliminated" title="'+esc(excluded[field].join(', '))+'">'+(kind==='wrong'?'Earlier: ':'Ruled out: ')+esc(earlier.join(', '))+'</small>':'';
  return `<div class="gtp230-trait gtp230-trait-${status}" aria-label="${esc(LABELS[field])}: ${esc(wording)}">
      <span class="gtp230-trait-icon" aria-hidden="true">${['◈','✥','▦','⌁','✧','◷'][i%6]}</span>
      <span class="gtp230-trait-name">${esc(names[field]||LABELS[field])}</span>
      <strong title="${esc(wording)}">${esc(wording)}</strong>${eliminated}
    </div>`;
 }).join('');
 const description=round.mode==='full'?'FULL SCAN · CONFIRMED MATCHES ARE REMEMBERED':'ONE SIGNAL · ONE REVEALED TRAIT PER GUESS';
 return `<aside class="gtp230-board" aria-label="Identity Signal Board">
   <h2>IDENTITY SIGNAL BOARD</h2><small>${description}</small>${comparison}
   <div class="gtp230-trait-list">${rows}</div>
  </aside>`;
}
function cinematicStageAside(round,target){
 if(active==='classic'){
  const rows=round.guesses.slice(-5);
  return `<aside class="gtp230-side gtp230-side-history" aria-label="Previous guesses">
    <h2>PREVIOUS GUESSES</h2>${rows.length?
      rows.map((name,i)=>`<div class="gtp230-side-row"><b>${round.guesses.length-rows.length+i+1}</b><span>${esc(name)}</span><em>${name===target.name?'✓':'✕'}</em></div>`).join(''):
      '<p>No guesses yet. Your attempts will appear here.</p>'}
    </aside>`;
 }
 if(active==='pixel'){
  const step=round.won?6:Math.min(6,round.guesses.length);
  return `<aside class="gtp230-side gtp230-side-stages" aria-label="Pixel decryption stages">
    <h2>◈ REVEAL STAGES</h2>
    ${Array.from({length:6},(_,i)=>`<div class="gtp230-stage-item ${step>=i?'is-unlocked':''} ${step===i?'is-current':''}"><span aria-hidden="true">▦</span><strong>STAGE ${i+1}</strong><small>${step>i?'REVEALED':step===i?'CURRENT':'LOCKED'}</small></div>`).join('')}
    <p>Each new guess reveals more of the picture.</p>
   </aside>`;
 }
 if(active==='ability'){
  return `<aside class="gtp230-side gtp230-side-ability" aria-label="Ability category">
   <h2>◈ ABILITY TYPE</h2>
   <div class="gtp230-ability-selected">✧ PASSIVE</div>
   <p>Identify the Legend from this passive ability icon.</p>
  </aside>`;
 }
 if(active==='quote'){
  return `<aside class="gtp230-side gtp230-side-quote" aria-label="Quote clue information">
   <h2>◈ TRANSMISSION</h2>
   <span class="gtp230-wave-deco" aria-hidden="true">▂▅▃▇▄▂▆▃▅▇▃▅▂▇▃▄▆▂</span>
   <p>Read the intercepted line and identify its speaker.</p>
  </aside>`;
 }
 return '';
}
/** Always-visible compact scan controls in gameplay.
 * Daily rounds and rounds in progress show their active settings but lock
 * changes; free-play rules are editable before the first guess only.
 */
function visibleRoundModes(round){
 const locked=session==='daily'||round.guesses.length>0||round.finished;
 const lockCopy=session==='daily'?'DAILY RULES LOCKED':round.finished?'ROUND FINISHED':round.guesses.length?'LOCKED AFTER FIRST GUESS':'SELECT BEFORE FIRST GUESS';
 const button=(label,action,activeMode,extra='')=>`<button type="button" class="gtp235-rule-choice ${activeMode?'is-active':''} ${extra}" data-action="${action}" ${action==='style'?`data-style="${extra==='scan-full'?'full':'signal'}"`:''} aria-pressed="${activeMode?'true':'false'}" ${locked?'disabled':''}>${label}</button>`;
 return `<div class="gtp235-rules" role="group" aria-label="Full Scan, One Signal and Rush settings">
   <span class="gtp235-rules-status" title="${lockCopy}"><b>SCAN RULES</b><small>${lockCopy}</small></span>
   <div class="gtp235-rule-buttons">
     ${button('▦ FULL SCAN <small>SPARROW</small>','style',round.mode==='full','scan-full')}
     ${button('✦ ONE SIGNAL <small>LOBA</small>','style',round.mode==='signal','scan-signal')}
     ${button(`◷ RUSH ${round.timeLimit?round.timeLimit+'s':'OFF'} <small>OCTANE</small>`,'rush',!!round.timeLimit,'scan-rush')}
   </div>
 </div>`;
}
function triedLegendNote(round){
 if(!round.guesses.length)return '';
 return `<div class="gtp235-tried gtp245-tried" role="note" aria-label="Legends you already tried this round">
  <strong>✕ ALREADY TRIED · ${round.guesses.length}</strong>
  <div class="gtp235-tried-names">${round.guesses.map((name,i)=>{const legend=legends.find(l=>l.name===name);return `<span title="Guess ${i+1}: ${esc(name)}">${legend?portrait(legend.slug,{alt:'',cls:'balanced'}):''}<small>${esc(name)}</small></span>`}).join('')}</div>
 </div>`;
}
function cinematicControls(round,target){
 if(round.finished){
  const score=session==='daily'?(store.submittedDays?.[today()]?.totalScore??dailySummary(store.days,today()).score):gameScore(round);
  return `<section class="gtp230-finished ${round.won?'gtp250-success':''}" aria-label="Round result" role="status" aria-live="polite">
   <div class="gtp230-finished-info">
    <span class="${round.won?'gtp250-success-eyebrow':''}">${round.won?'✓ CORRECT! TARGET IDENTIFIED':round.loss==='time'?'⌛ TIME IS UP':'✕ ROUND COMPLETE'}</span>
    <strong>${round.won?'LEGEND IDENTIFIED: ':''}${esc(target.name)}</strong>
    <small>${round.won?`YOU GOT IT RIGHT · ${score} POINTS · ${round.guesses.length} GUESSES`:'The correct Legend is revealed above.'}</small>
   </div>
   <div class="gtp230-finished-actions">
    ${session==='daily'?'<button type="button" data-action="next" data-session="daily" class="gtp230-btn gtp230-btn-main">'+(dailyNextLabel()+' ↗')+'</button>':'<button type="button" data-action="next" data-session="unlimited" class="gtp230-btn gtp230-btn-main">↻ PLAY AGAIN</button>'}
    ${session==='unlimited'?`<button type="button" data-action="free-next" class="gtp230-btn gtp230-btn-main">NEXT: ${esc(nextFreeMode(active).toUpperCase())} ↗</button>`:''}
    <button type="button" data-action="home" class="gtp230-btn gtp230-btn-secondary">BACK TO MODES</button>
   </div>
   ${session==='daily'?intelReadyMarkup(1):''}
  </section>`;
 }
 const remaining=maxGuesses(round)-round.guesses.length;
 const hintDisabled=!round.guesses.length||round.hints.length>=MAX_HINTS||availableHintFields(round,target,legends).length===0;
 return `<section class="gtp230-console" aria-label="Submit your next guess">
    <div class="gtp230-console-main"><div class="tac-guess-selection" id="guess-selection" aria-live="polite">CHOOSE A LEGEND · CONFIRM TO USE ONE GUESS</div>
      <div class="search-wrap gtp230-input-wrap">
       <input id="guess-search" autocomplete="off" aria-label="Search a Legend" placeholder="Type a Legend name…" value="${esc(quickSearch)}"/>
       <button type="button" class="gtp230-btn gtp230-btn-main" data-action="submit-search">CONFIRM GUESS ↗</button>
       <div id="search-results" class="search-list" style="display:none"></div>
      </div>
      <div class="gtp230-control-row">
       <button class="gtp230-btn gtp230-btn-blue" type="button" data-action="picker">▣ BROWSE LEGENDS</button>
       <button class="gtp230-btn gtp230-btn-gold" type="button" data-action="hint" ${hintDisabled?'disabled':''}>✦ GET HINT <small class="tac-hint-cost">${session==='daily'?'REDUCES DAILY SCORE':'-145 PTS'}</small> ${round.hints.length?`(${MAX_HINTS-round.hints.length} LEFT)`:''}</button>
       <button class="gtp230-btn gtp230-btn-danger" type="button" data-action="surrender">◷ GIVE UP</button>
      </div>
    </div>
    <span class="gtp230-console-help">${remaining} guesses left · ${hintDisabled?'Start with a guess to unlock hints':'Green = matching trait · Red = different trait'}</span>
   </section>`;
}
function game(){
 const round=ensureRound();const target=legendByName(legends,round.answer);
 const timeLeft=remainingTime(round),urgent=timeLeft!=null&&timeLeft<=25&&!round.finished;
 const showBoard=true;
 const board=cinematicIdentityBoard(round,target);
 const side=cinematicStageAside(round,target);
 const isDaily=session==='daily';
 const title=active.toUpperCase();
 const modeTag=round.mode==='full'?'FULL SCAN':'ONE SIGNAL';
 const host=MODE_HOSTS[active]||MODE_HOSTS.classic;
 const signature={classic:['DECOY PROTOCOL','BAMBOOZLE THEM'],pixel:['RECON OPTICS','READ BETWEEN THE PIXELS'],quote:['BLACK MARKET COMMS','EVERY VOICE HAS A PRICE'],ability:['STIM SYSTEMS','IDENTIFY THE SIGNATURE'],emoji:['ELECTRIC CIPHER','CONNECT THE SIGNALS']}[active]||['OUTLANDS INTEL','FOLLOW THE CLUES'];
 return `<div class="gtp233-viewport-art" aria-hidden="true"></div><div class="gtp241-mode-scene gtp241-scene-${active} gtp242-scene" aria-hidden="true"><div class="gtp242-scenery"><i></i><i></i><i></i></div><div class="gtp241-scene-halo"></div><div class="gtp241-scene-host gtp242-fullbody-host">${portrait(host.slug,{alt:'',cls:'balanced',eager:true})}</div><span class="gtp241-scene-label">${host.name} · ${signature[0]}</span><span class="gtp242-atmosphere-mark">◈ ${signature[0]}</span></div><main class="wrap game gtp2-game-scene gtp2-scene-${active} gtp230-game" style="--tile:${classOf(active)}">
   ${quickModeLinks(active)}
   <header class="gtp230-titlebar gtp240-themed-titlebar">
    <span class="gtp240-header-beam" aria-hidden="true"></span>
    <div class="gtp230-title-icon gtp238-game-host" aria-hidden="true">${portrait(host.slug,{alt:'',cls:'balanced',eager:true})}</div>
    <div class="gtp230-title-copy"><span class="gtp238-game-host-label">✦ ${host.name} · ${signature[0]}</span><h1>${title} MODE</h1><p>${TAGLINES[active]} <span class="gtp230-scan-caption">· ${modeTag}</span></p></div>
    <div class="gtp240-mode-identity" aria-hidden="true"><span class="gtp240-mode-identity-copy"><b>${host.name}</b><small>${signature[1]}</small></span><span class="gtp240-mode-identity-art">${portrait(host.slug,{alt:'',cls:'balanced',eager:true})}</span></div>
    <div class="gtp230-title-status">
     <span class="gtp230-session ${isDaily?'is-daily':'is-free'}">${isDaily?'DAILY · '+DAILY_RULES[dailyTrack].difficulty:'FREE PLAY · UNRANKED'}</span>
     <span class="gtp230-guess-count"><small>GUESSES</small><b>${round.guesses.length}/${maxGuesses(round)}</b></span>
     ${round.timeLimit?`<span id="round-timer" class="game-timer ${urgent?'urgent':''}" aria-label="Time remaining"><i>◷</i><span>${timeLeft??120}s</span></span>`:''}
    </div>
   </header>
   ${isDaily?'<section class="tac-daily-stage tac265-stage '+dailyTrack+'" role="status" aria-label="Daily puzzle difficulty"><b>DAILY PUZZLE · '+DAILY_RULES[dailyTrack].difficulty+' · '+modeTag+'</b><span>ONE MYSTERY LEGEND · '+(dailyTrack==='full'?'All six traits per guess · 5 guesses.':'One trait per guess · 6 guesses.')+' Difficulty locked for today.</span></section>':''}
   <div class="gtp230-arena ${board?'has-board':''} ${side?'has-side':''}">
    <section class="gtp230-main-clue" aria-label="Legend clue">
     ${getVisual(round,target)}
    </section>
    ${cinematicControls(round,target)}
    <div class="gtp236-intel-column gtp248-inline-intel gtp249-visible-signals" aria-label="Scanner, rule choices and guess history">${triedLegendNote(round)}${board}<details class="gtp248-scan-details"><summary>◈ PREVIOUS GUESSES / EXTRA INTEL ⌄</summary><div class="gtp248-scan-content">${side}</div></details>${visibleRoundModes(round)}</div>
   </div>
 </main>`;
}
function howTo(){return `<main class="wrap gtp27-guide gtp241-guide" aria-labelledby="guide-title">
<span class="kicker">OUTLANDS FIELD MANUAL · SIX MODES</span><h1 id="guide-title">HOW TO <em>PLAY.</em></h1>
<p>Play one ranked Daily puzzle: choose Full Scan (Easy) or One Signal (Hard), then your choice locks for the day. Daily Trivia is a separate ranked run. Both reset at 00:00 UTC. Use Free Play for unlimited unranked practice. Background characters are decorative and never reveal the answer.</p>
<div class="guide-grid">${[
 ['◈','CLASSIC','Identify the mystery Legend from clues and compare traits after each guess.'],
 ['▦','PIXEL','Recognize a heavily pixelated Legend. Each incorrect guess reveals a clearer stage.'],
 ['❞','QUOTE','Identify the Legend from a character quote or voice-line clue.'],
 ['⌁','ABILITY','Identify the Legend from an ability icon and its type.'],
 ['✦','EMOJI','Start with two thematic symbols. More symbols appear after guesses 1, 3 and 5, up to five clues about the Legend, abilities and story.'],
 ['◈','TRIVIA','Five different questions per run, progressing from familiar Legend knowledge to expert intel. You have 20 seconds each: 20 points for a correct answer, or 10 with a lifeline. Daily Ranked submits separately; Practice is unlimited and unranked.']
].map(([ico,title,desc])=>`<article class="guide-card"><span>${ico}</span><h2>${title}</h2><p>${desc}</p></article>`).join('')}</div>
<div class="guide-rule-row"><article><b>▦ FULL SCAN</b><p>All six traits are compared after each incorrect guess. Correct matches stay green across later guesses. Five guesses total. Easy difficulty for the single Daily puzzle. Daily score weighting: 70%.</p></article><article><b>◈ ONE SIGNAL</b><p>One trait comparison is revealed per incorrect guess. Confirmed correct traits stay green. Six guesses. Hard difficulty available immediately in the Daily selector. Daily score weighting: 100%.</p></article><article><b>◷ RUSH</b><p>Daily Ranked enables Rush by default: 120 seconds per puzzle, starting at your first guess. Free Play keeps its optional timer.</p></article></div>
<div class="guide-rule-row"><article><b>◈ FORBIDDEN INTEL</b><p>Unlock two community technique guides by completing your selected Daily puzzle and Daily Trivia.</p></article><article><b>✧ NEXT GAME LEGEND</b><p>The mystery '?' wheel draws a random Legend. It does not reveal or alter your current puzzle answer.</p></article><article><b>⚙ SETTINGS</b><p>Change sound FX volume and animations from Settings; progress and preferences are remembered on this device.</p></article></div>
<div class="guide-cta"><button class="btn pink" data-action="open" data-mode="classic">PLAY CLASSIC ↗</button><button class="btn lilac" data-action="faq">READ FAQ</button></div></main>`;}
function faq(){return `<main class="wrap gtp27-guide gtp27-faq gtp241-guide" aria-labelledby="faq-title"><span class="kicker">OUTLANDS SUPPORT · UPDATED FOR SIX MODES</span><h1 id="faq-title">FREQUENTLY <em>ASKED.</em></h1>
 <div class="faq-stack">${[
 ['What are the six modes?','Classic uses trait comparisons; Pixel reveals a clearer image; Quote uses character lines; Ability uses an ability icon; Emoji reveals thematic symbols; Trivia tests Apex knowledge. Background characters are decorative and do not reveal hidden answers.'],
 ['How do Daily Challenges work?','The daily challenges reset at 00:00 UTC. Choose Full Scan (Easy) or One Signal (Hard) for one mystery Legend. Your choice locks at start. The puzzle has a 120-second Rush timer from the first guess. Daily Trivia has its own separate daily ranked run.'],
 ['What are Full Scan, One Signal and Rush?','These are gameplay rule options, not additional modes. Full Scan compares all six traits per guess (five attempts), preserving confirmed matches. One Signal reveals one trait per guess (six attempts), preserving confirmed matches. Rush adds a two-minute timer beginning with the first guess.'],
 ['How do Easy and Hard scores differ?','Easy (Full Scan) earns 70% of the normal Daily score; Hard (One Signal) keeps 100%. Guesses, hints and remaining time determine the score before weighting. The streak bonus is calculated afterwards. Previously submitted scores keep their recorded value. Free Play and Trivia scoring are unchanged.'],
 ['How do I unlock Forbidden Intel?','Complete your selected Daily puzzle and Daily Trivia. Open any unlocked Intel rewards from the Home centerpiece.'],
 ['What does the Next Game Legend question mark do?','The spinning wheel chooses a random Legend. It does not give away the answer to a running puzzle.'],
 ['What makes Pixel Mode difficult?','The Legend starts heavily pixelated, with more detail revealed after each guess. You must identify the figure from visual information, not the host portrait.'],
 ['How does Trivia scoring work?','Answer five questions in 20 seconds each. Each right answer earns 20 points, or 10 after using the optional lifeline (up to 100). Daily Ranked and unlimited Practice have separate scores. Difficulty increases through the run: two familiar questions, then standard, advanced and expert. Questions do not repeat within a run.'],
 ['Does Free Play affect my rankings?','No. Free Play is unlimited practice. Only supported completed ranked Daily runs can be submitted.'],
 ['Where are my settings and progress stored?','Game progress and preferences are saved in the browser on this device. Settings includes sound volume and animation preferences. Clearing browser data or changing devices may change what is available locally.'],
 ['Why might some Legend art be unavailable?','Some images load from third-party fan-art and asset sources. If a source refuses access, the site uses a fallback instead of an unrelated character.'],
 ['Is The Apex Challenge official?','No. This is an independent Apex Legends fan project and is not affiliated with EA or Respawn.']
 ].map(([q,a])=>`<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
 <div class="guide-cta"><button class="btn pink" data-action="home">BACK TO MODES ↗</button><button class="btn lilac" data-action="howto">HOW TO PLAY</button></div></main>`;}

function trivia(){
 const run=triviaRun;
 const question=run?.question;
 const remaining=question&&run.deadlineAt?Math.max(0,Math.ceil((Date.parse(run.deadlineAt)-Date.now())/1000)):20;
 const isDaily=triviaMode==='daily';
 const rows=triviaBoard?.[triviaScoreTab]||[];
 const feedback=run?.feedback;
 return `<div class="gtp241-trivia-scene gtp242-trivia-environment" aria-hidden="true"><span class="gtp242-crypto-grid"></span>${portrait('crypto',{alt:'',cls:'balanced',eager:true})}</div><main class="trivia-page ${run&&!run.finished?'trivia-page-active':''} ${question&&!feedback&&!run?.finished?'trivia-page-question':''} ${question&&question.kind!=='choice'?'trivia-page-written':''}" aria-label="Apex Trivia"><div class="trivia-shell">
  ${quickModeLinks('trivia')}
  <section class="trivia-hero gtp240-trivia-hero"><span class="gtp240-trivia-host" aria-hidden="true">${portrait('crypto',{alt:'',cls:'balanced',eager:true})}</span><span class="trivia-kicker">◈ CRYPTO / ENCRYPTED OUTLANDS INTEL</span><h1>APEX <em>TRIVIA.</em></h1><p>Five different questions, from familiar to expert. 20 seconds each. Earn <b>20 points</b> per correct answer, or 10 with a lifeline, up to 100. Separate from the Daily puzzle.</p><div class="trivia-switch" role="group" aria-label="Trivia mode"><button data-action="trivia-mode" data-trivia-mode="daily" class="${isDaily?'active':''}">✦ DAILY RANKED</button><button data-action="trivia-mode" data-trivia-mode="practice" class="${!isDaily?'active':''}">∞ PRACTICE</button></div></section>
  <div class="trivia-grid"><section class="trivia-main" id="trivia-main-content" tabindex="-1">
  ${triviaMessage?`<div class="trivia-status" role="status">${esc(triviaMessage)}</div>`:''}
  ${!run?`<div class="trivia-intro"><span class="trivia-tag">${isDaily?'ONE OFFICIAL RUN PER UTC DAY':'UNLIMITED UNRANKED ROUNDS'}</span><h2>${isDaily?'DAILY INTEL DROP':'TRAIN YOUR KNOWLEDGE'}</h2><p>${isDaily?'Everyone receives the same five-question selection today. Answers and timing are verified on the server; results appear on the separate Trivia leaderboard.':'Try varied sets across the question bank; recent topics are rotated when possible. Practice does not affect your global ranking.'}</p><p class="trivia-hint">${isDaily?'Public nickname: <strong>'+esc(savedNickname()||'Choose one when starting Daily')+'</strong>':'No nickname needed. Practice is unranked.'}</p><button type="button" data-action="trivia-start" class="trivia-primary" ${triviaBusy?'disabled':''}>${triviaBusy?'CONNECTING…':isDaily?'START / RESUME DAILY →':'START PRACTICE →'}</button></div>`:''}
  ${run?.finished?`<div class="trivia-finale"><span class="trivia-tag">${isDaily?'DAILY SUBMITTED':'PRACTICE COMPLETE'}</span><h2>RUN COMPLETE.</h2><div class="trivia-final-score">${Number(run.score)||0}<small> / 100</small></div><p>${run.score===100?'PERFECT INTEL. FIVE FOR FIVE.':'You answered '+Number(run.correctAnswers??Math.floor(run.score/20))+' of 5 questions correctly.'} ${isDaily?'Your score is stored in the separate Trivia rankings.':'Practice rounds never change the leaderboard.'}</p>${run.feedback?`<div class="trivia-last-explanation"><strong>${run.feedback.correct?'✓ FINAL ANSWER CORRECT':'FINAL QUESTION REVIEW'}</strong><span>${esc(run.feedback.explanation||'')}</span>${run.feedback.source?`<a href="${esc(run.feedback.source)}" target="_blank" rel="noopener noreferrer">Official EA source ↗</a>`:''}</div>`:''}${isDaily&&triviaRewardEarned()?intelReadyMarkup(2):''}<div class="trivia-final-actions">${isDaily?'<button type="button" class="trivia-primary" data-action="daily-summary">VIEW DAILY SUMMARY ↗</button>':''}<button type="button" class="trivia-primary" data-action="trivia-mode" data-trivia-mode="practice">∞ PRACTICE AGAIN</button>${!isDaily?'<button type="button" class="trivia-primary" data-action="free-next">NEXT: CLASSIC ↗</button>':''}<button type="button" class="trivia-secondary" data-action="leaderboard">VIEW RANKINGS ↗</button></div></div>`:''}
  ${run&&!run.finished&&feedback?`<div class="trivia-feedback ${feedback.correct?'good':'bad'}"><span class="trivia-tag">QUESTION ${Math.min(run.number-1,5)} / 5</span><h2>${feedback.correct?'✓ CORRECT · +'+Number(feedback.earned||20):feedback.timedOut?'⌛ TIME’S UP · QUESTION EXPIRED':'✕ NOT QUITE'}</h2><p><strong>Accepted answer${feedback.acceptedAnswers?.length>1?'s':''}:</strong> ${esc((feedback.acceptedAnswers||[]).join(' · '))}</p><p>${esc(feedback.explanation||'')}</p>${feedback.source?`<a href="${esc(feedback.source)}" target="_blank" rel="noopener noreferrer">Verify with EA ↗</a>`:''}<p class="trivia-current-score">RUN SCORE: ${run.score} / 100</p><button data-action="trivia-next" class="trivia-primary" ${triviaBusy?'disabled':''}>${triviaBusy?'LOADING…':'NEXT QUESTION →'}</button></div>`:''}
  ${run&&!run.finished&&!feedback&&question?`<div class="trivia-question"><div class="gtp245-trivia-progress" role="progressbar" aria-label="Completed Trivia questions" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${Math.max(0,run.number-1)}">${Array.from({length:5},(_,i)=>`<span class="${i<run.number-1?'complete':i===run.number-1?'current':''}"></span>`).join('')}</div><div class="trivia-question-head"><span class="trivia-tag">QUESTION ${run.number} / 5 · ${['WARM-UP','WARM-UP','STANDARD','ADVANCED','EXPERT'][Math.max(0,Math.min(4,run.number-1))]} · ${esc(question.category.replace(/-/g,' ').toUpperCase())}</span><strong class="trivia-clock ${remaining<=6?'urgent':''}" id="trivia-clock"><span id="trivia-seconds">${remaining}</span>s</strong></div><div class="trivia-timebar"><span id="trivia-timefill" style="width:100%;transform:scaleX(${Math.max(0,Math.min(1,remaining/20))})"></span></div><h2>${esc(question.prompt)}</h2><div class="tac-trivia-help"><button type="button" data-action="trivia-help" ${triviaBusy||question.assisted?'disabled':''}>${question.assisted?'INTEL ASSIST ACTIVE':question.kind==='choice'?'50 / 50 LIFELINE':'REVEAL ANSWER OPTIONS'}</button><span>${question.assisted?'Correct answer: 10 points':'Optional help · 10 points instead of 20 · timer keeps running'}</span></div><form id="trivia-answer-form">${question.kind==='choice'?`<div class="trivia-options">${question.options.map((v,i)=>`<button class="trivia-option" type="button" data-action="trivia-choice" data-value="${esc(v)}" ${triviaBusy?'disabled':''}><b>${String.fromCharCode(65+i)}</b><span>${esc(v)}</span><span>↗</span></button>`).join('')}</div>`:`<div class="trivia-type"><label for="trivia-written-answer">YOUR ANSWER</label><input id="trivia-written-answer" name="answer" spellcheck="false" autocomplete="off" placeholder="${writtenAnswerPlaceholder(question)}" maxlength="70" value="${esc(triviaAnswerText)}" ${triviaBusy?'disabled':''}/><button class="trivia-primary" type="submit" ${triviaBusy?'disabled':''}>SUBMIT ANSWER ↗</button></div>`}</form><button type="button" class="trivia-skip" data-action="trivia-skip" ${triviaBusy?'disabled':''}>SKIP / NO ANSWER</button><p class="trivia-note">The clock continues even when you switch tabs. Answers are evaluated server-side.</p></div>`:''}
  </section><aside class="trivia-sidebar"><div class="trivia-sidehead"><span>✦ SEPARATE TRIVIA RANKINGS</span><div class="trivia-tabs"><button data-action="trivia-board-tab" data-tab="daily" class="${triviaScoreTab==='daily'?'active':''}">TODAY</button><button data-action="trivia-board-tab" data-tab="overall" class="${triviaScoreTab==='overall'?'active':''}">ALL TIME</button></div></div>${triviaBoardBusy&&!rows.length?'<p class="trivia-quiet">LOADING SCORES…</p>':triviaBoardError&&!rows.length?`<p class="trivia-quiet">${esc(triviaBoardError)}</p>`:rows.length?`<div class="trivia-board-rows">${rows.map((r,i)=>`<div class="trivia-board-row"><b>#${Number(r.position)||i+1}</b><span>${esc(r.player_name||'Player')}</span><strong>${Number(r.score)||0} ${triviaScoreTab==='overall'?'PTS':'/100'}</strong></div>`).join('')}</div>`:'<p class="trivia-quiet">No daily submissions yet. Be the first!</p>'}<div class="trivia-aside-foot"><b>CURATED QUESTION BANK</b><p>Start with two familiar Legend questions, then progress through standard, advanced and expert intel. Five different questions per run. Lifelines are always optional.</p><button class="trivia-secondary" data-action="trivia-board-refresh">↻ REFRESH LEADERBOARD</button></div></aside></div>
  </div></main>`;
}
async function loadTriviaBoards(){if(!leaderboardConfigured())return;
 const requestedDay=utcDay();
 triviaBoardBusy=true;triviaBoardError='';if(screen==='trivia'||screen==='leaderboard')render({scroll:false});
 try{const fresh=await getTriviaBoards(requestedDay);if(requestedDay!==utcDay())return;triviaBoard=fresh;try{localStorage.setItem('tac:trivia-boards:v265',JSON.stringify({day:requestedDay,boards:triviaBoard}));}catch{}}catch(e){if(requestedDay===utcDay())triviaBoardError=e?.message||'Could not load Trivia rankings';}
 finally{triviaBoardBusy=false;if(screen==='trivia'||screen==='leaderboard')render({scroll:false});}
}
function resetTriviaView(){
 triviaEpoch++;triviaBusy=false;triviaSubmitting=false;triviaRun=null;triviaAnswerText='';triviaMessage='';triviaExpiredKey='';triviaRetryAt=0;
}
function triviaContext(){return {epoch:triviaEpoch,mode:triviaMode,day:triviaRun?.day||utcDay(),runId:triviaRun?.runId};}
function currentTriviaContext(context){return context.epoch===triviaEpoch&&context.mode===triviaMode&&(context.mode!=='daily'||context.day===utcDay());}
async function triviaAction(action,payload={},timedOut=false){
 if(triviaMode==='daily'&&checkDailyRollover())return;
 if(triviaBusy)return;
 const context=triviaContext();triviaBusy=true;triviaMessage='';if(action==='answer')triviaSubmitting=true;
 if(action==='start'||action==='next')render({scroll:false});
 try{
  let response=await triviaRequest({action,...payload});
  response={...response,day:response.day||context.day};saveTriviaReward(response);
  if(!currentTriviaContext(context)||response.mode!==context.mode||(context.mode==='daily'&&response.day!==utcDay()))return;
  if(timedOut&&response.feedback)response={...response,feedback:{...response.feedback,timedOut:true}};
  triviaRun=response;triviaAnswerText='';triviaMessage='';triviaRetryAt=0;
  if(action==='answer')sound(response.feedback?.correct?'correct':'wrong');
  if(response.finished){sound('win');void loadTriviaBoards();}
 }catch(e){
  if(!currentTriviaContext(context))return;
  triviaMessage=e?.message||'Trivia connection unavailable. Please retry.';
  if(timedOut){triviaExpiredKey='';triviaRetryAt=Date.now()+3000;}
 }finally{
  if(currentTriviaContext(context)){triviaBusy=false;triviaSubmitting=false;if(screen==='trivia'){render({scroll:false});if(action==='start'||action==='next')focusTriviaQuestion();}}
 }
}
async function triviaHelp(){
 if(triviaBusy||!triviaRun?.question||triviaRun.question.assisted)return;
 return triviaAction('hint',{runId:triviaRun.runId});
}
async function triviaStart(){
 if(triviaBusy)return;
 const nickname=savedNickname()||(triviaMode==='practice'?'Practice':'');
 if(triviaMode==='daily'&&!/^[A-Za-z0-9 _-]{3,18}$/.test(nickname)){triviaMessage='Choose a nickname in the top-right profile first.';render({scroll:false});openIdentityPrompt(true);return;}
 return triviaAction('start',{mode:triviaMode,displayName:nickname});
}
async function triviaSubmitAnswer(value,timedOut=false){
 if(triviaBusy||triviaSubmitting||!triviaRun?.question||triviaRun.finished)return;
 return triviaAction('answer',{runId:triviaRun.runId,answer:String(value||'').slice(0,120)},timedOut);
}
async function triviaNext(){
 if(triviaBusy||!triviaRun?.waitingNext)return;
 return triviaAction('next',{runId:triviaRun.runId});
}
function focusTriviaQuestion(){
 if(screen!=='trivia'||!triviaRun?.question||triviaRun?.finished||triviaRun?.feedback)return;
 requestAnimationFrame(()=>{
  const question=document.querySelector('#trivia-main-content .trivia-question');
  if(!question)return;
  // Keep the entire question, answer box and submit button within the viewport.
  // Avoid focusing the text input, which would force the virtual keyboard open.
  question.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});
 });
}
function triviaClockTick(){
 // Continuous compositor-friendly progress; the label itself updates only
 // when the displayed whole second changes. The deadline stays server-owned.
 if(triviaClockFrame)cancelAnimationFrame(triviaClockFrame);
 triviaClockFrame=0;
 const frame=()=>{
  const run=triviaRun;
  if(screen!=='trivia'||!run?.question||run?.feedback||!run.deadlineAt){triviaClockFrame=0;return;}
  const remainingMs=Math.max(0,Date.parse(run.deadlineAt)-Date.now());
  const seconds=Math.ceil(remainingMs/1000);
  const digits=document.getElementById('trivia-seconds');
  if(digits&&digits.textContent!==String(seconds))digits.textContent=seconds;
  const fill=document.getElementById('trivia-timefill');
  if(fill)fill.style.transform='scaleX('+Math.max(0,Math.min(1,remainingMs/20000))+')';
  document.getElementById('trivia-clock')?.classList.toggle('urgent',seconds<=6);
  if(remainingMs<=0){
   const key=[run.runId,run.number,run.deadlineAt].join(':');
   if(triviaExpiredKey!==key&&!triviaBusy&&!triviaSubmitting&&Date.now()>=triviaRetryAt){
    triviaExpiredKey=key;
    void triviaSubmitAnswer('',true);
   }
   triviaClockFrame=requestAnimationFrame(frame);return;
  }
  triviaClockFrame=requestAnimationFrame(frame);
 };
 triviaClockFrame=requestAnimationFrame(frame);
}
function rankingColumn(kind,rows,{loading=false,error=''}={}){
 const trivia=kind==='trivia',title=trivia?'TRIVIA':'DAILY CHALLENGES';
 const subtitle=trivia?'Five questions · independent Trivia scores':'One Daily puzzle · Easy or Hard difficulty';
 const state=loading?'UPDATING':error?(rows.length?'OFFLINE · SAVED RESULTS':'CONNECTION UNAVAILABLE'):'LIVE RANKINGS';
 return `<section class="gtp27-board tac-ranking-column ${trivia?'is-trivia':'is-challenge'}" aria-label="${title} leaderboard"><header class="tac-ranking-header"><span>${trivia?'✧':'◈'}</span><div><h2>${title}</h2><p>${subtitle}</p></div><small>${state}</small></header>
 ${rows.length?`<div class="board-table">${rows.map((r,i)=>`<div class="board-row"><span>#${Number(r.position)||i+1}</span><strong>${esc(r.player_name||'Player')}</strong><b>${Number(r.score||0).toLocaleString('en-US')} ${trivia&&boardTab==='daily'?'/ 100':'PTS'}</b><small>${trivia?(boardTab==='daily'?Number(r.questions_correct??Math.floor(Number(r.score)/20))+' / 5 CORRECT':Number(r.days_played||0)+' DAYS · '+Number(r.perfect_days||0)+' PERFECT'):(boardTab==='daily'?'STREAK '+Number(r.streak||0):Number(r.days_played||0)+' DAYS · BEST '+Number(r.best_streak||0))}</small></div>`).join('')}</div>`:loading?'<div class="board-empty">LOADING RANKINGS…</div>':error?`<div class="board-empty">${esc(error)}</div>`:'<div class="board-empty">No scores for this period yet.</div>'}
 <footer class="tac-ranking-footer">${trivia?'Daily Trivia submits automatically when the run ends.':'Complete your Daily puzzle, then submit your score below.'}</footer></section>`;
}
function leaderboard(){
 const summary=dailySummary(store.days,today());
 const rows=boardData?.[boardTab]||[];
 const isTodayComplete=summary.completed && !sharedDay && today()===utcDay();
 const existingSubmission=store.submittedDays?.[today()];
 const canSubmitDaily=isTodayComplete&&leaderboardConfigured()&&!existingSubmission;
 return `<main class="wrap gtp27-leaderboard" aria-labelledby="rank-title"><span class="kicker">PUBLIC HALL OF FAME / TWO RANKINGS</span><h1 id="rank-title">THE <em>LEADERBOARD.</em></h1><p class="lead">Two independent rankings: your selected Daily puzzle and Daily Trivia. Switch between Today and Overall to compare each board. Daily resets at 00:00 UTC. Easy earns 70% of the normal Daily score; Hard earns 100%, with the streak bonus applied afterwards. Free Play and Trivia Practice never affect rankings.</p>
 <div class="board-switch" role="group" aria-label="Choose leaderboard"><button data-action="board-tab" data-board="daily" class="${boardTab==='daily'?'active':''}" aria-pressed="${boardTab==='daily'}">◈ TODAY · ${esc(utcDay())}</button><button data-action="board-tab" data-board="overall" class="${boardTab==='overall'?'active':''}" aria-pressed="${boardTab==='overall'}">♛ OVERALL · ALL-TIME</button></div>
 <div class="tac-rankings-grid">${rankingColumn('challenge',rows,{loading:boardLoading,error:boardError})}${rankingColumn('trivia',triviaBoard?.[boardTab]||[],{loading:triviaBoardBusy,error:triviaBoardError})}</div>
 <section class="gtp27-submit"><div><span class="kicker">YOUR DAILY SCORE</span><h2>${Number(existingSubmission?.totalScore??summary.score).toLocaleString('en-US')} <small>PTS (${existingSubmission?'SUBMITTED':'LOCAL PREVIEW'})</small></h2><p>${existingSubmission?`✓ DAILY SCORE SUBMITTED · ${Number(existingSubmission.totalScore||0).toLocaleString('en-US')} POINTS · SAVED ON THIS DEVICE`:summary.completed?'Daily puzzle complete. Submit once to appear in the public rankings.':'Complete your Daily puzzle to unlock submission. Free Play scores are practice-only.'}</p><small>BASE ${Number(existingSubmission?.baseScore??summary.baseScore).toLocaleString('en-US')} · STREAK BONUS ${Number(existingSubmission?.streakBonus??summary.bonus).toLocaleString('en-US')} · ${existingSubmission?.streak??summary.streak} DAY STREAK</small></div>
 <form class="board-form" id="board-submit-form"><label for="board-nickname">PUBLIC NICKNAME</label><input id="board-nickname" name="nickname" required minlength="3" maxlength="18" autocomplete="nickname" pattern="[A-Za-z0-9 _-]{3,18}" placeholder="Your gamer nickname" value="${esc(savedNickname())}" ${isTodayComplete&&leaderboardConfigured()&&!existingSubmission?'':'disabled'}/>${canSubmitDaily?'<button class="btn pink" type="submit">SUBMIT DAILY SCORE ↗</button>':existingSubmission?'<button class="btn pink" type="button" disabled>✓ SCORE SUBMITTED</button>':!isTodayComplete?'<button class="btn pink" type="button" data-action="home-daily">▶ PLAY DAILY TO UNLOCK SUBMISSION</button>':'<button class="btn pink" type="button" disabled>SUBMISSION UNAVAILABLE</button>'}<small>Ranked scores require one completed Daily puzzle. Free Play is unranked · one submission per day · no real names. <button class="inline-link" type="button" data-action="profile">Change nickname</button></small><p id="board-submit-feedback" class="board-submit-feedback" role="status" aria-live="polite"></p></form></section>
 <div class="guide-cta"><button class="btn lilac" data-action="home">BACK TO CHALLENGES</button><button class="btn mint" data-action="records">MY STATS ↗</button></div></main>`;
}
async function refreshBoards(){
 if(!leaderboardConfigured()||boardLoading)return;
 boardLoading=true;boardError='';
 // Keep the visible leaderboard while the request is pending.
 const requestedDay=utcDay();
 try{const fresh=await getBoards(requestedDay);if(requestedDay!==utcDay())return;boardData=fresh;try{localStorage.setItem(SAVED_BOARD_KEY,JSON.stringify({day:requestedDay,boards:boardData,updatedAt:Date.now()}));}catch{/* Ranking reads still work with blocked browser storage. */}}catch(error){boardError=error.message||'Connection unavailable';}
 finally{boardLoading=false;if(screen==='leaderboard')render({scroll:false});}
}
async function submitScores(){
 if(checkDailyRollover())return;
 if(scoreSubmitting)return;
 if(!leaderboardConfigured()){showToast('Database not configured yet');return;}
 const summary=dailySummary(store.days,today());
 if(!summary.completed||sharedDay||today()!==utcDay()){showToast('Ranked submissions require one completed Daily puzzle. Free Play is practice-only.');return;}
 if(store.submittedDays?.[today()]){showToast('Today’s score is already submitted.');return;}
 const input=document.getElementById('board-nickname');
 if(!input||!input.checkValidity()){input?.reportValidity();return;}
 const nickname=normalizeNickname(input.value);
 if(!validNickname(nickname)){showToast('Use 3–18 characters for your nickname.');input.focus();return;}
 if(nickname)saveNickname(nickname,{close:false});
 const button=document.querySelector('#board-submit-form button[type=submit]');
 const feedback=document.getElementById('board-submit-feedback');
 if(feedback){feedback.textContent='Checking your Daily run…';feedback.dataset.status='pending';}
 scoreSubmitting=true;
 const submittedDay=today();
 if(button){button.disabled=true;button.textContent='SUBMITTING…';}
 try{
  const receipt=await submitDaily(buildSubmission(store.days,submittedDay,nickname));
  store.submittedDays={...(store.submittedDays||{}),[submittedDay]:{...receipt,nickname,submittedAt:Date.now()}};sync();
  if(submittedDay!==utcDay()){checkDailyRollover();return;}
  await refreshBoards();if(screen==='debrief')render({scroll:false});const message=`SCORE SUBMITTED · ${receipt.totalScore} PTS · STREAK ${receipt.streak}`;showToast(message);const status=document.getElementById('board-submit-feedback');if(status){status.textContent=message;status.dataset.status='success';}
 }catch(error){const message=error.message||'Submission failed';showToast(message);const currentFeedback=document.getElementById('board-submit-feedback');if(currentFeedback){currentFeedback.textContent=message;currentFeedback.dataset.status='error';}}finally{scoreSubmitting=false;const currentButton=document.querySelector('#board-submit-form button[type=submit]');if(currentButton&&!store.submittedDays?.[today()]){currentButton.disabled=false;currentButton.textContent='SUBMIT DAILY SCORE ↗';}}
}
function dailyDebrief(){
 const chosen=chosenDaily(store.days,today()),summary=dailySummary(store.days,today()),triviaDone=triviaRewardEarned(),receipt=store.submittedDays?.[today()];
 let triviaReceipt=null;try{triviaReceipt=JSON.parse(localStorage.getItem('tac:trivia-receipt:'+today())||'null');}catch{}
 const finished=Number(summary.completed)+Number(triviaDone),eligible=summary.completed&&!receipt&&!sharedDay&&today()===utcDay()&&leaderboardConfigured(),score=receipt?.totalScore??summary.score;
 return `<main class="tac261-debrief" aria-labelledby="debrief-title"><section class="tac261-debrief-window"><header><b>THE APEX CHALLENGE</b><span>DAILY · ${esc(today())}</span></header><div class="tac261-debrief-body"><span class="kicker">${finished}/2 INTEL REWARDS</span><h1 id="debrief-title">${finished===2?'DAILY COMPLETE.':summary.completed?'PUZZLE COMPLETE.':'YOUR DAILY CHALLENGE.'}</h1><p class="tac261-debrief-intro">One puzzle. One mystery Legend. Trivia keeps its own rankings.</p><div class="tac261-stages"><div class="${summary.completed?'complete':'pending'}"><b>${chosen?DAILY_RULES[chosen.track].difficulty+' · '+DAILY_RULES[chosen.track].label:'DAILY PUZZLE'}</b><small>${summary.completed?'COMPLETED':'READY'}</small></div><div class="${triviaDone?'complete':'pending'}"><b>DAILY TRIVIA</b><small>${triviaDone?'COMPLETED':'OPTIONAL · SEPARATE RUN'}</small></div></div><section class="tac261-score" aria-label="Daily puzzle score"><div><span>DAILY PUZZLE</span><strong>${Number(score).toLocaleString('en-US')} <small>PTS${receipt?'':' · LOCAL PREVIEW'}</small></strong><p>${receipt?'✓ Score submitted':summary.completed?'Ready to submit':'Finish your selected puzzle to submit'}</p></div>${eligible?`<form id="board-submit-form" class="board-form"><label for="board-nickname">PUBLIC NICKNAME</label><input id="board-nickname" name="nickname" required minlength="3" maxlength="18" pattern="[A-Za-z0-9 _-]{3,18}" autocomplete="nickname" placeholder="Your gamer nickname" value="${esc(savedNickname())}"/><button type="submit" class="tac261-submit" ${scoreSubmitting?'disabled':''}>${scoreSubmitting?'SUBMITTING…':'SUBMIT DAILY SCORE ↗'}</button><p id="board-submit-feedback" role="status" aria-live="polite"></p></form>`:''}</section><section class="tac261-score" aria-label="Daily Trivia score"><div><span>DAILY TRIVIA</span><strong>${triviaDone?(triviaReceipt?Number(triviaReceipt.score)+' / 100':'SUBMITTED'):'NOT PLAYED'}</strong><p>${triviaDone?'Automatically submitted':'Five questions · independent ranking'}</p></div></section><button type="button" class="tac261-next" ${!summary.completed?'data-action="home-daily"':!triviaDone?'data-action="trivia" data-trivia-mode="daily"':'data-action="leaderboard"'}>${!summary.completed?'CONTINUE DAILY PUZZLE →':!triviaDone?'PLAY DAILY TRIVIA →':'VIEW RANKINGS →'}</button><div class="tac261-footer"><button type="button" data-action="home">BACK TO HOME</button><button type="button" data-action="leaderboard">VIEW RANKINGS ↗</button></div></div></section></main>`;
}

function records(){
  const stats=dailyStats(store.days,utcDay());const days=Object.keys(store.days).sort().reverse().slice(0,14);
  return `<main class="wrap records"><span class="pill">PERSONAL ARCHIVE</span><h1>YOUR <span style="color:#ec4a95">SIGNAL.</span></h1><p class="lead">Your puzzle history, streaks and Intel rewards are saved in this browser. The current Daily has one puzzle with a locked Easy or Hard choice; Daily Trivia is a separate run. Public results appear in Rankings after submission. Clearing browser data removes local history.</p>${statCards()}${forbiddenPanel()}<h2 class="caps" style="font-size:38px">RECENT DAYS</h2><div class="record-rows">${days.map(day=>`<div class="record-row"><span>${day}</span><span>${checkpointCount(store.days,day)}/${store.days[day]?.daily265?1:2} ${checkpointCount(store.days,day)===(store.days[day]?.daily265?1:2)?'✦ CLEARED':''}</span></div>`).join('')||'<p>No Daily results yet. Go start a hunt!</p>'}</div><div class="record-settings"><div><strong>ACCESSIBILITY / VISUAL EFFECTS</strong><small>Reduce background and reward animation intensity on slower devices.</small></div><button class="btn lilac small" data-action="motion">FX ${store.settings.motion?'ON':'OFF'} · CHANGE</button></div><button class="btn pink" data-action="home">BACK TO CHALLENGES ↗</button><button class="btn mint" data-action="leaderboard">♛ GLOBAL LEADERBOARD</button></main>`;
}
function wheelPool(){
 return wheelChoices(legends).filter(l=>!wheelNoRepeat||!wheelChosen||l.name!==wheelChosen.name);
}
function refreshWheelOptions(){
 const count=document.getElementById('wheel-available-count');if(count)count.textContent=wheelPool().length+' AVAILABLE';
 const btn=document.getElementById('wheel-spin');if(btn)btn.disabled=wheelPool().length===0||wheelSpinning;
 drawWheel();
}
function drawWheel(angle=wheelAngle){
  const canvas=document.getElementById('legend-wheel');if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const logical=600,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(logical*dpr))canvas.width=Math.round(logical*dpr);
  if(canvas.height!==Math.round(logical*dpr))canvas.height=Math.round(logical*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,logical,logical);
  const list=wheelDisplayList??wheelPool(),length=list.length,slice=Math.PI*2/Math.max(length,1);
  if(!length){ctx.fillStyle="#382441";ctx.fillRect(0,0,600,600);return;}
  const palette=['#492c24','#71452e','#353044','#8a5a37','#41313e','#61513b','#2d3840'];
  ctx.save();ctx.translate(300,300);ctx.rotate(angle);
  for(let i=0;i<length;i++){
    const start=-Math.PI/2-slice/2+i*slice;
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,284,start,start+slice);ctx.closePath();
    ctx.fillStyle=palette[i%palette.length];ctx.fill();
    ctx.strokeStyle='#bf946855';ctx.lineWidth=1.5;ctx.stroke();
    ctx.save();ctx.rotate(start+slice/2);
    ctx.font='800 13px "Arial Narrow", Arial, sans-serif';
    ctx.fillStyle='#fff0d9';ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.fillText(list[i].name.toUpperCase(),270,0,150);
    ctx.restore();
  }
  ctx.beginPath();ctx.arc(0,0,284,0,Math.PI*2);ctx.lineWidth=10;ctx.strokeStyle='#b78a58';ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,67,0,Math.PI*2);ctx.fillStyle='#18151c';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#b78a58';ctx.stroke();
  ctx.fillStyle='#efbb7d';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 50px Impact, sans-serif';ctx.fillText('A',0,0);
  ctx.restore();
}
function showWheel(){
  if(wheelOpen)return;
  wheelOpen=true;wheelAngle=0;wheelSpinning=false;wheelChosen=null;wheelDisplayList=null;
  const overlay=document.createElement('div');overlay.className='wheel-backdrop';overlay.id='wheel-backdrop';
  overlay.innerHTML=`<section class="wheel-modal" role="dialog" aria-modal="true" aria-label="Spin the Legend wheel">
    <header class="wheel-heading"><div><span class="kicker">THE LEGEND RITUAL</span><h2>NEXT GAME <em>LEGEND.</em></h2><p>Spin to discover who to play in your next Apex match. Daily puzzles remain unaffected.</p></div><button class="btn flat small" data-action="close-wheel" aria-label="Close wheel">✕ CLOSE</button></header>
    <div class="wheel-layout"><div class="wheel-disc"><span class="wheel-arrow" aria-hidden="true">▼</span><canvas id="legend-wheel" width="600" height="600" role="img" aria-label="Random-selection wheel with all playable Legends"></canvas></div>
    <div class="wheel-side"><span class="wheel-stamp" id="wheel-available-count">28 AVAILABLE</span><h3>LET THE<br><em>SPIRITS DECIDE.</em></h3><div class="wheel-pick" id="wheel-pick" role="status" aria-live="polite"><span class="wheel-pick-empty">Waiting for a spin…</span></div><button class="btn pink wheel-spin-button" data-action="spin" id="wheel-spin" type="button">✦ SPIN THE WHEEL</button><button class="btn lilac wheel-share-button" data-action="share-wheel" id="wheel-share" type="button" disabled>◇ COPY MY PICK</button><p class="wheel-help">Every Legend is included. No class filters or exclusions.</p><div class="wheel-settings"><label class="wheel-check"><input id="wheel-repeat" type="checkbox" ${wheelNoRepeat?'checked':''}/> Avoid immediate repeat</label></div></div></div>
  </section>`;
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeWheel();});
  app.appendChild(overlay);
  refreshWheelOptions();overlay.querySelector('[data-action="spin"]')?.focus({preventScroll:true});
}
function closeWheel(){
  if(!wheelOpen)return;
  wheelOpen=false;wheelSpinning=false;wheelChosen=null;wheelDisplayList=null;
  if(wheelAnimation)cancelAnimationFrame(wheelAnimation);
  wheelAnimation=0;document.getElementById('wheel-backdrop')?.remove();
}
function showWheelPick(legend){
  const box=document.getElementById('wheel-pick');if(!box)return;
  wheelChosen=legend;
  box.innerHTML=`<span class="wheel-pick-badge">YOUR NEXT LEGEND</span>${portrait(legend.slug,{alt:legend.name,cls:'balanced'})}<strong>${esc(legend.name)}</strong><small>${esc(legend.role)} · ${esc(legend.signature)}</small>`;
  loadPortraitImages(box);
  document.getElementById('wheel-share')?.removeAttribute('disabled');
  const button=document.getElementById('wheel-spin');if(button){button.disabled=false;button.textContent='↻ SPIN AGAIN';}
  sound('win');
}
function spinWheel(){
  if(wheelSpinning||!wheelOpen)return;
  const list=wheelPool();if(!list.length)return;wheelDisplayList=list;const legend=wheelPick(list);
  const index=list.findIndex(l=>l.name===legend.name);
  const target=destinationRotation(wheelAngle,index,list.length);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||!store.settings.motion;
  const duration=reduced?0:4600;
  wheelSpinning=true;wheelChosen=null;
  document.getElementById('wheel-share')?.setAttribute('disabled','');
  const label=document.getElementById('wheel-pick');if(label)label.innerHTML='<span class="wheel-pick-empty">PICKING YOUR NEXT LEGEND…</span>';
  const button=document.getElementById('wheel-spin');if(button){button.disabled=true;button.textContent='✦ SPINNING…';}
  sound('pick');
  const finish=()=>{wheelAngle=((target%(Math.PI*2))+(Math.PI*2))%(Math.PI*2);wheelSpinning=false;drawWheel();showWheelPick(legend);};
  if(!duration){finish();return;}
  const startAngle=wheelAngle;let started=null;
  const frame=stamp=>{
    if(!wheelOpen)return;
    if(started===null)started=stamp;
    const t=Math.min(1,(stamp-started)/duration);
    const ease=1-Math.pow(1-t,5);
    wheelAngle=startAngle+(target-startAngle)*ease;
    drawWheel();
    if(t<1){wheelAnimation=requestAnimationFrame(frame);}else{wheelAnimation=0;finish();}
  };
  wheelAnimation=requestAnimationFrame(frame);
}
async function copyWheelPick(){
  if(!wheelChosen)return;
  const message=`My next Apex Legend: ${wheelChosen.name}! Picked by The Apex Challenge — Spin the Wheel.`;
  let copied=false;
  try{await navigator.clipboard.writeText(message);copied=true;}
  catch{
    // Fallback for browsers where Clipboard API is not available on a local preview.
    const field=document.createElement('textarea');field.value=message;
    field.style.position='fixed';field.style.opacity='0';field.setAttribute('aria-hidden','true');
    document.body.appendChild(field);field.select();
    try{copied=document.execCommand('copy');}catch{/* Clipboard permission may be denied. */}
    field.remove();
  }
  const button=document.getElementById('wheel-share');
  if(copied){
    if(button){button.textContent='✓ PICK COPIED';setTimeout(()=>{if(button.isConnected)button.textContent='◇ COPY MY PICK';},1400);}
    showToast(`Copied: ${wheelChosen.name} ✦`);
  }else{
    if(button){button.textContent='COPY UNAVAILABLE';setTimeout(()=>{if(button.isConnected)button.textContent='◇ COPY MY PICK';},1500);}
    showToast(message);
  }
  sound('pick');
}
function pageEnvironment(){return '';}
function sceneBackdrop273(){
 const utility={leaderboard:'leaderboard-v273',records:'records-v273',faq:'faq-v273',howto:'howto-v273'};
 const mode={classic:'loba-v271',pixel:'pixel',quote:'quote',ability:'ability',emoji:'emoji'};
 const image=utility[screen]||(screen==='game'?mode[active]:screen==='trivia'?'trivia':screen==='daily-choice'||screen==='debrief'?'hangar':'loba-v271');
 return '<div class="tac273-scene" aria-hidden="true"><img src="./assets/industrial-v267/'+image+'.webp" alt="" loading="eager" decoding="async" draggable="false"/></div>';
}
function reconcileDailyView(){
 if(screen!=='game'||session!=='daily')return;
 const chosen=chosenDaily(store.days,today());
 if(!chosen){screen='daily-choice';pickerOpen=false;return;}
 dailyTrack=chosen.track;active=chosen.gameMode;
}
function render({scroll=true}={}) {
 const inputFocus=!scroll?captureInputFocus(document):null;
 if(migrateSingleDaily(store.days,today(),legends))sync();
 reconcileDailyView();
  const identityDraft=identityPromptOpen?(document.getElementById('identity-name')?.value??''):null;
  const settingsWasOpen=!!document.getElementById('gtp237-settings');identityPromptOpen=false;
  if(intelModalOpen)closeIntelDialog();
  if(wheelOpen)closeWheel();
  document.body.classList.toggle('lightshift-playing',screen==='game');
  app.className=`app ${store.settings.motion?'':'no-motion'}`;
  app.dataset.screen=screen;app.dataset.session=session;app.dataset.difficulty=session==='daily'?(chosenDaily(store.days,today())?.track||''):'';app.dataset.mode=screen==='game'?active:'';
  app.innerHTML=nav()+sceneBackdrop273()+pageEnvironment()+(screen==='daily-choice'?dailyChoice():screen==='home'?home():screen==='game'?game():screen==='trivia'?trivia():screen==='records'?records():screen==='howto'?howTo():screen==='faq'?faq():screen==='debrief'?dailyDebrief():leaderboard());
  if(identityDraft!==null){openIdentityPrompt(true);const input=document.getElementById('identity-name');if(input)input.value=identityDraft;}
  else if(settingsWasOpen)settingsDialog();
  loadPortraitImages();
  loadAbilityImages();
  if(screen==='trivia')triviaClockTick();
  if(scroll)window.scrollTo({top:0,behavior:'instant'});
  if(screen==='game'&&!getRound()?.finished)updateSearchResults();
  if(pickerOpen)renderPicker();
  if(inputFocus)restoreInputFocus(document,inputFocus);
  // Nicknames are requested only for ranked submissions, never for browsing or practice.
}

function openMode(mode,playSession=session){
  if(!MODES.includes(mode))return;
  if(playSession==='daily'){
    migrateSingleDaily(store.days,today(),legends);const chosen=chosenDaily(store.days,today());
    if(!chosen){beginDaily();return;}dailyTrack=chosen.track;mode=chosen.gameMode;
  }
  active=mode;session=playSession;store.settings.session=session;sync();screen='game';pickerOpen=false;quickSearch='';ensureRound();render();sound('nav');
}
function submitGuess(name){
  if(session==='daily'&&checkDailyRollover())return;
  const round=getRound();if(!round){if(session==='daily'){ensureRound();render({scroll:false});}return;}if(round.finished)return;
  const next=tryGuess(round,name,legends);
  if(next===round)return;
  const wasWon=round.won;setRound(next);
  const justWon=next.won&&!wasWon;
  if(justWon){
    store.history.wins=(store.history.wins||0)+1;
    store.history.bestScore=Math.max(store.history.bestScore||0,gameScore(next));sync();
  } else {
     if(next.finished)sound('lose');
     else if(next.mode==='full'){
       const target=legendByName(legends,next.answer);
       const current=scannerState(next,target,legends);
       sound(FIELDS.some(f=>current[f]?.kind==='correct')?'clue':'wrong');
     }else sound(next.signals.at(-1)?.kind==='correct'?'clue':'wrong');
   }
  pickerOpen=false;quickSearch='';render({scroll:false});
  if(store.settings.motion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('.gtp230-trait').forEach((node,i)=>{node.style.setProperty('--scan-delay',(i*70)+'ms');node.classList.add('tac-trait-reveal');});
  if(session==='daily'&&next.finished)showToast('✦ FORBIDDEN INTEL READY — Open the unlocked tip below!');
  if(justWon){sound('victory');if(store.settings.motion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)triggerVictoryConfetti();}
}
function triggerVictoryConfetti(){
  document.querySelector('.gtp212-confetti')?.remove();
  const layer=document.createElement('div');layer.className='gtp212-confetti';
  layer.setAttribute('aria-hidden','true');
  const palette=['#ff744d','#ffd18a','#fff0d2','#82d7ec','#db9ef9','#ec5149'];
  for(let i=0;i<96;i++){
    const bit=document.createElement('i');
    bit.style.setProperty('--left',`${(i*47+17)%100}%`);
    bit.style.setProperty('--delay',`${((i*37)%100)/140}s`);
    bit.style.setProperty('--time',`${2.35+(i%7)*.16}s`);
    bit.style.setProperty('--twist',`${i%2===0?720:-540}deg`);
    bit.style.setProperty('--drift',`${((i*31)%190)-95}px`);
    bit.style.background=palette[i%palette.length];
    layer.appendChild(bit);
  }
  app.appendChild(layer);
  setTimeout(()=>layer.remove(),4400);
}
function updateSearchResults(){
  const input=document.querySelector('#guess-search');const box=document.querySelector('#search-results');if(!input||!box)return;
  const query=input.value.trim();const selection=document.getElementById('guess-selection');const candidate=query?filteredRoster(legends,{search:query,excluded:getRound()?.guesses||[]})[0]:null;if(selection)selection.textContent=candidate?candidate.name.toUpperCase()+' SELECTED · CONFIRM TO USE ONE GUESS':query?'NO AVAILABLE LEGEND MATCHES':'CHOOSE A LEGEND · CONFIRM TO USE ONE GUESS';if(!query){box.style.display='none';return;}
  const used=getRound()?.guesses||[];
  const matches=filteredRoster(legends,{search:query,excluded:used}).slice(0,7);
  if(!matches.length){box.innerHTML='<div style="padding:12px;font-size:11px;color:#8c6896">No matches</div>';box.style.display='block';return;}
  box.innerHTML=matches.map(l=>`<button class="search-result" data-action="guess" data-name="${esc(l.name)}">${portrait(l.slug,{alt:l.name,cls:'balanced'})}<strong>${esc(l.name)}</strong><small>${esc(l.role)}</small></button>`).join('');
  box.style.display='block';loadPortraitImages(box);
}
function renderPicker(){
  document.getElementById('picker-backdrop')?.remove();
  const overlay=document.createElement('div');overlay.className='picker-backdrop';overlay.id='picker-backdrop';overlay.setAttribute('role','presentation');
  overlay.innerHTML=`<div class="picker gtp2-picker tac-picker" role="dialog" aria-modal="true" aria-label="Browse Legends">
    <div class="picker-header"><div><span class="kicker">LEGEND ROSTER</span><h2>CHOOSE YOUR LEGEND</h2><p>Select a portrait to inspect it, then confirm your guess.</p></div><button class="btn flat small" data-action="close-picker" aria-label="Close Legend picker">✕ CLOSE</button></div>
    <div class="picker-search"><input id="picker-search" type="search" autocomplete="off" placeholder="Search a Legend or class…" value="${esc(pickerSearch)}" aria-label="Search Legend roster"/><select id="picker-sort" aria-label="Sort Legends"><option value="az" ${pickerSort==='az'?'selected':''}>A → Z</option><option value="za" ${pickerSort==='za'?'selected':''}>Z → A</option></select></div>
    <div class="class-filters" role="group" aria-label="Filter Legends by class">${CLASS_NAMES.map(cls=>`<button class="filter-btn ${pickerClass===cls?'active':''}" data-action="filter" data-class="${cls}">${cls.toUpperCase()}</button>`).join('')}</div>
    <div class="gtp245-picker-layout tac-picker-layout"><div class="gtp245-picker-list"><div class="picker-count" id="picker-count"></div><div class="picker-grid" id="picker-grid"></div></div><aside class="gtp245-picker-preview" id="gtp245-picker-preview" aria-label="Selected Legend preview"></aside></div></div>`;
  overlay.addEventListener('click',event=>{if(event.target===overlay){pickerOpen=false;overlay.remove();}});
  const previewFromEvent=event=>{const card=event.target.closest?.('[data-preview-slug]');if(card)showLegendPreview(card.dataset.previewSlug);};
  // Selection stays stable while browsing; a click or keyboard focus updates the dossier.
  overlay.addEventListener('focusin',previewFromEvent);
  app.appendChild(overlay);renderPickerResults();document.getElementById('picker-search')?.focus({preventScroll:true});
}
function renderPickerResults(){
  const grid=document.getElementById('picker-grid'),count=document.getElementById('picker-count');if(!grid||!count)return;
  const results=filteredRoster(legends,{search:pickerSearch,role:pickerClass,sort:pickerSort,excluded:getRound()?.guesses||[]});
  count.textContent=`${results.length} AVAILABLE · ${(getRound()?.guesses.length||0)} ELIMINATED`;
  grid.innerHTML=results.length?results.map(l=>`<button class="picker-legend gtp2-legend-card gtp245-picker-item" data-action="preview-legend" data-preview-slug="${esc(l.slug)}" aria-pressed="${pickerPreviewSlug===l.slug}" data-name="${esc(l.name)}">${portrait(l.slug,{alt:'',cls:'balanced'})}<strong>${esc(l.name)}</strong><small>${esc(l.role)}</small></button>`).join(''):'<div class="picker-empty">No Legends match these filters.</div>';
  loadPortraitImages(grid);
  showLegendPreview(results.find(l=>l.slug===pickerPreviewSlug)?.slug||results[0]?.slug);
}
function showLegendPreview(slug){
 const panel=document.getElementById('gtp245-picker-preview');if(!panel)return;
 if(!slug){panel.innerHTML='<p class="picker-empty">No Legend matches these filters.</p>';panel.dataset.slug='';return;}
    pickerPreviewSlug=slug;
   document.querySelectorAll('.gtp245-picker-item').forEach(card=>{const selected=card.dataset.previewSlug===slug;card.classList.toggle('is-preview',selected);card.setAttribute('aria-pressed',String(selected));});
   if(panel.dataset.slug===slug)return;
 const legend=legends.find(l=>l.slug===slug);if(!legend)return;
 panel.dataset.slug=slug;
 panel.innerHTML=`<div class="gtp245-preview-art">${portrait(legend.slug,{alt:legend.name,cls:'balanced',eager:true})}</div><div class="gtp245-preview-copy"><small>◈ OUTLANDS DOSSIER</small><h3>${esc(legend.name)}</h3><p>${esc(legend.title||legend.signature||'Apex Legend')}</p><div class="gtp245-preview-tags"><span>${esc(legend.role)}</span><span>${esc(legend.signature||'Legend')}</span></div><button type="button" class="gtp230-btn gtp230-btn-main gtp245-preview-select" data-action="guess" data-name="${esc(legend.name)}">CONFIRM GUESS ↗</button><small class="tac-picker-confirm-note">This uses one guess. Your selection is not submitted until confirmed.</small></div>`;
 document.querySelectorAll('.gtp245-picker-item').forEach(card=>card.classList.toggle('is-preview',card.dataset.previewSlug===slug));
 loadPortraitImages(panel);
}
function advanceFreeMode(){
 const mode=nextFreeMode(screen==='trivia'?'trivia':active);
 session='unlimited';store.settings.session='unlimited';sync();pickerOpen=false;quickSearch='';
 if(mode==='trivia'){resetTriviaView();triviaMode='practice';screen='trivia';render();void loadTriviaBoards();sound('nav');return;}
 if(store.practice[mode]?.finished)randomPractice(mode);else openMode(mode,'unlimited');
}
function useCurrentDay(){
 if(sharedDay){sharedDay=null;const url=new URL(location.href);url.searchParams.delete('day');history.replaceState(null,'',url);}
}
function beginDaily(){
 useCurrentDay();
 session='daily';store.settings.session='daily';migrateSingleDaily(store.days,today(),legends);sync();pickerOpen=false;
 const chosen=chosenDaily(store.days,today());if(chosen){dailyTrack=chosen.track;openMode(chosen.gameMode,'daily');return;}
 screen='daily-choice';render();sound('nav');
}
function dailyChoice(){
 return '<main class="tac265-choice" aria-labelledby="daily-choice-title"><header><span>ONE DAILY PUZZLE · ONE MYSTERY LEGEND</span><h1 id="daily-choice-title">CHOOSE YOUR CHALLENGE</h1><p>The same mystery awaits on both sides. Your choice locks when you start.</p></header><div class="tac265-choice-grid">'+['full','signal'].map(track=>{const easy=track==='full';return '<section class="tac265-choice-card '+(easy?'easy':'hard')+'"><span class="tac265-difficulty">'+(easy?'EASY MODE':'HARD MODE')+'</span><h2>'+DAILY_RULES[track].label+'</h2><p>'+(easy?'Read the whole signal.':'Make every signal count.')+'</p><ul><li>'+(easy?'70% Daily score weighting':'100% Daily score weighting')+'</li><li>'+(easy?'All six traits compared after each guess':'One trait comparison after each wrong guess')+'</li><li>'+DAILY_RULES[track].guesses+' guesses to identify the Legend</li><li>Confirmed matches stay revealed</li><li>2 optional hints · each reduces your final score</li><li>Rush enabled · 120 seconds from your first guess</li><li>One ranked attempt today · no difficulty switching</li></ul><button type="button" data-action="choose-daily" data-track="'+track+'">START '+DAILY_RULES[track].label+' ↗</button></section>';}).join('')+'</div><footer><button type="button" data-action="home">BACK TO HOME</button><span>Easy scores 70% · Hard scores 100% · Streak bonus applies after weighting.</span></footer></main>';
}
function dailyNextLabel(){return 'VIEW DAILY SUMMARY';}
function nextMode(playSession=session){if(playSession==='unlimited'){randomPractice(active);return;}session='daily';store.settings.session='daily';sync();pickerOpen=false;screen='debrief';render();sound('nav');}
function showToast(message){
  document.querySelector('.toast')?.remove();
  const toast=document.createElement('div');toast.className='toast';toast.setAttribute('role','status');toast.textContent=message;app.appendChild(toast);
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.remove(),3000);
}
let lastModeHover=0;
app.addEventListener('pointerover',event=>{
  const card=event.target.closest?.('.arena-mode,.gtp222-orbit-card,.gtp239-mode-card');
  if(!card||!store.settings.audio)return;
  if(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget))return;
  const now=performance.now();if(now-lastModeHover<210)return;lastModeHover=now;
  const mode=card.dataset.mode||card.dataset.sound;
  if(MODES.includes(mode))sound('hover-'+mode);
  else if(mode==='trivia'||card.classList.contains('gtp222-card-trivia'))sound('hover-trivia');
});
app.addEventListener('click',event=>{
  if(checkDailyRollover())return;
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(action==='intel-open'){
  const checkpoint=Number(button.dataset.checkpoint)||1;
  if(checkpoint===2?!triviaRewardEarned():checkpoint>checkpointCount(store.days,today())){showToast(checkpoint===2?"Complete Daily Trivia to unlock this reward.":`Complete Daily Challenge ${checkpoint} to unlock the reward.`);return;}
  intelCheckpoint=checkpoint;store.intelOpenedDays??={};const claimKey=`${today()}:${checkpoint}`;
  intelFirstRevealPending=!intelState(checkpoint).read;store.intelOpenedDays[claimKey]=true;sync();intelDialog();
}
  else if(action==='intel-close'){closeIntelDialog();render({scroll:false});}
  else if(action==='wheel')showWheel();
  else if(action==='close-wheel')closeWheel();
  else if(action==='spin')spinWheel();
  else if(action==='share-wheel')void copyWheelPick();
  else if(action==='home'){screen='home';pickerOpen=false;render();sound('nav');}
  else if(action==='home-session'){session=button.dataset.session==='unlimited'?'unlimited':'daily';store.settings.session=session;triviaMode=session==='daily'?'daily':'practice';sync();render({scroll:false});sound('nav');}
  else if(action==='trivia'){resetTriviaView();triviaMode=button.dataset.triviaMode||(session==='daily'?'daily':'practice');if(triviaMode==='daily')useCurrentDay();session=triviaMode==='daily'?'daily':'unlimited';store.settings.session=session;sync();screen='trivia';pickerOpen=false;triviaMessage='';triviaRun=null;render();void loadTriviaBoards();sound('nav');}
  else if(action==='trivia-mode'){resetTriviaView();triviaMode=button.dataset.triviaMode==='practice'?'practice':'daily';if(triviaMode==='daily')useCurrentDay();session=triviaMode==='daily'?'daily':'unlimited';store.settings.session=session;sync();triviaRun=null;triviaMessage='';render({scroll:false});sound('nav');}
  else if(action==='trivia-help')void triviaHelp();
  else if(action==='trivia-start')void triviaStart();
  else if(action==='trivia-choice')void triviaSubmitAnswer(button.dataset.value);
  else if(action==='trivia-skip')void triviaSubmitAnswer('');
  else if(action==='trivia-next')void triviaNext();
  else if(action==='trivia-board-tab'){triviaScoreTab=button.dataset.tab==='overall'?'overall':'daily';render({scroll:false});}
  else if(action==='trivia-board-refresh')void loadTriviaBoards();
  else if(action==='daily-summary'){screen='debrief';pickerOpen=false;render();sound('nav');}
  else if(action==='records'){screen='records';pickerOpen=false;render();sound('nav');}
  else if(action==='howto'){screen='howto';pickerOpen=false;render();sound('nav');}
  else if(action==='faq'){screen='faq';pickerOpen=false;render();sound('nav');}
  else if(action==='leaderboard'){screen='leaderboard';pickerOpen=false;render();void refreshBoards();void loadTriviaBoards();sound('nav');}
  else if(action==='scroll-extras'){document.getElementById('home-extras')?.scrollIntoView({behavior:store.settings.motion?'smooth':'instant'});}
  else if(action==='board-tab'){boardTab=button.dataset.board;render({scroll:false});if(!boardData)void refreshBoards();}
  else if(action==='choose-daily'){if(!DAILY_RULES[button.dataset.track])return;const chosen=chooseDaily(store.days,today(),button.dataset.track,legends);dailyTrack=chosen.track;sync();openMode(chosen.gameMode,'daily');}
  else if(action==='open'){if(!button.dataset.session&&session==='daily')beginDaily();else openMode(button.dataset.mode,button.dataset.session||'unlimited');}
  else if(action==='home-full'||action==='home-signal'){beginDaily();}
  else if(action==='home-rush'){
    store.settings.rush=true;store.settings.playStyle='signal';
    const saved=store.practice.classic;
    if(saved&&!saved.finished&&!saved.guesses?.length)store.practice.classic={...saved,mode:'signal',timeLimit:120};
    sync();openMode('classic','unlimited');
    if(saved&&!saved.finished&&saved.guesses?.length&&!saved.timeLimit)showToast('Your in-progress Classic round was preserved. Rush will apply next round.');
  }
  else if(action==='home-daily'){beginDaily();}
  else if(action==='session'){if(button.dataset.session==='unlimited')openMode(active||'classic','unlimited');else beginDaily();}
  else if(action==='profile'){openIdentityPrompt(true);sound('pick');}
  else if(action==='identity-skip'){closeIdentityPrompt();}
  else if(action==='settings'){settingsDialog();sound('nav');}
  else if(action==='settings-close'){document.getElementById('gtp237-settings')?.remove();}
  else if(action==='sound-preview'){sound('victory');}
  else if(action==='audio'){store.settings.audio=!store.settings.audio;sync();document.querySelectorAll('.gtp2-sound-switch').forEach(node=>{node.textContent=store.settings.audio?'♫ FX ON':'♪ FX OFF';node.setAttribute('aria-pressed',String(store.settings.audio))});if(button.closest('.gtp237-settings-panel'))button.textContent='SOUND '+(store.settings.audio?'ON':'OFF');if(store.settings.audio)sound('pick');}
  else if(action==='motion'){store.settings.motion=!store.settings.motion;sync();if(button.closest('.gtp237-settings-panel')){button.textContent='ANIMATIONS '+(store.settings.motion?'ON':'OFF');app.classList.toggle('no-motion',!store.settings.motion);}else render({scroll:false});}
  else if(action==='picker'){pickerOpen=true;pickerSearch='';pickerClass='All';pickerSort='az';renderPicker();sound('pick');}
  else if(action==='close-picker'){pickerOpen=false;document.getElementById('picker-backdrop')?.remove();}
  else if(action==='preview-legend'){showLegendPreview(button.dataset.previewSlug);sound('pick');}
  else if(action==='pixel-full'){const scene=button.closest('.visual-pixel');if(!getRound()?.won||!scene)return;const expanded=scene.classList.toggle('tac-pixel-expanded');button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'COMPACT IMAGE ↙':'VIEW FULL IMAGE ↗';}
  else if(action==='guess'){submitGuess(button.dataset.name);}
  else if(action==='submit-search'){
    const query=document.getElementById('guess-search')?.value||'';
    const first=filteredRoster(legends,{search:query,excluded:getRound()?.guesses||[]})[0];if(query.trim()&&first)submitGuess(first.name);
  }
  else if(action==='style'||action==='rush'){
    const round=getRound();if(!round||session==='daily'||round.guesses.length||round.finished)return;
    const changed=action==='style'?{...round,mode:button.dataset.style}:{...round,timeLimit:round.timeLimit?0:120};
    store.settings.playStyle=changed.mode;store.settings.rush=changed.timeLimit>0;setRound(changed);
    sync();render({scroll:false});sound('pick');
  }
  else if(action==='surrender'){
    const current=getRound();
    if(!current||current.finished)return;
    if(!window.confirm('Give up this round? Your remaining guesses will be used and this round will count as a loss.'))return;
    // Consume remaining moves as replayable wrong guesses so Daily results still
    // validate against the server's official puzzle-answer algorithm.
    let discarded=current;
    const now=Date.now();
    for(const candidate of legends){
      if(discarded.finished)break;
      if(candidate.name===discarded.answer||discarded.guesses.includes(candidate.name))continue;
      discarded=tryGuess(discarded,candidate.name,legends,now);
    }
    if(discarded!==current){setRound(discarded);pickerOpen=false;quickSearch='';render({scroll:false});sound('lose');}
  }
  else if(action==='hint'){
    const round=getRound();if(!round)return;
    const expired=expireRound(round,Date.now());if(expired!==round){setRound(expired);render({scroll:false});sound('lose');return;}
    const target=legendByName(legends,round.answer);const changed=getHint(round,target,legends);
    if(changed!==round){setRound(changed);render({scroll:false});sound('clue');}
  }
  else if(action==='filter'){pickerClass=button.dataset.class;renderPicker();sound('nav');}
  else if(action==='free-next')advanceFreeMode();
  else if(action==='next')nextMode(button.dataset.session||session);
  else if(action==='again')randomPractice(active);
});
app.addEventListener('submit',event=>{
  if(event.target.id==='board-submit-form'){event.preventDefault();void submitScores();return;}
  if(event.target.id==='trivia-answer-form'){event.preventDefault();void triviaSubmitAnswer(document.getElementById('trivia-written-answer')?.value||'');return;}
  if(event.target.id==='identity-form'){event.preventDefault();const form=new FormData(event.target);const nickname=normalizeNickname(form.get('nickname'));const input=document.getElementById('identity-name');if(!input?.checkValidity()){input?.reportValidity();return;}if(!validNickname(nickname)){showToast('Use 3–18 characters for your nickname.');input.focus();return;}saveNickname(nickname);render({scroll:false});showToast(`Nickname saved: ${nickname}`);}
});
app.addEventListener('focusin',event=>{
 if(event.target?.id!=='trivia-written-answer')return;
 // The keyboard can reduce the visual viewport. Keep the entry area visible,
 // while leaving text selection and typing to the browser.
 requestAnimationFrame(()=>{
  const input=document.getElementById('trivia-written-answer');
  input?.scrollIntoView({behavior:'instant',block:'nearest'});
 });
});
app.addEventListener('input',event=>{
 if(event.target.id==='gtp237-volume'){const level=Number(event.target.value);store.settings.volume=Math.max(0,Math.min(1,level/100));document.getElementById('gtp237-volume-output').textContent=level+'%';sync();}
  if(event.target.id==='guess-search'){quickSearch=event.target.value;updateSearchResults();}
  if(event.target.id==='trivia-written-answer')triviaAnswerText=event.target.value;
  if(event.target.id==='picker-search'){pickerSearch=event.target.value;renderPickerResults();}
  if(event.target.id==='board-nickname'){store.profile={...(store.profile||{}),nickname:event.target.value};sync();}
  if(event.target.id==='picker-sort'){pickerSort=event.target.value;renderPickerResults();}
});
app.addEventListener('change',event=>{
  if(event.target.id==='wheel-repeat'&&!wheelSpinning){wheelNoRepeat=event.target.checked;refreshWheelOptions();}
if(event.target.id==='picker-sort'){pickerSort=event.target.value;renderPickerResults();}});
document.addEventListener('keydown',event=>{
  const modal=document.getElementById('identity-backdrop')||document.getElementById('gtp237-settings')||document.getElementById('intel-dialog')||document.getElementById('wheel-backdrop')||document.getElementById('picker-backdrop');
  if(modal&&event.key==='Tab'){
   const nodes=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(node=>node.getClientRects().length);
   const index=nodes.indexOf(document.activeElement);
   if(nodes.length&&(index===-1||(!event.shiftKey&&index===nodes.length-1)||(event.shiftKey&&index===0))){event.preventDefault();nodes[event.shiftKey?nodes.length-1:0].focus();}
   return;
  }
  if(event.key==='Escape'){
   if(identityPromptOpen){closeIdentityPrompt();return;}
   if(document.getElementById('gtp237-settings')){document.getElementById('gtp237-settings').remove();return;}
   if(intelModalOpen){closeIntelDialog();return;}
   if(wheelOpen){closeWheel();return;}
   if(pickerOpen){pickerOpen=false;document.getElementById('picker-backdrop')?.remove();return;}
   if(document.activeElement instanceof HTMLElement)document.activeElement.blur();return;
  }
  if(modal&&!pickerOpen)return;
  if(screen!=='game'||getRound()?.finished)return;
  if(pickerOpen){
    if(event.key==='Enter'&&event.target.id==='picker-search'){
      const results=filteredRoster(legends,{search:pickerSearch,role:pickerClass,sort:pickerSort,excluded:getRound()?.guesses||[]});
      const selected=results.find(l=>l.slug===pickerPreviewSlug)||results[0];
      if(selected){showLegendPreview(selected.slug);document.querySelector('.gtp245-preview-select')?.focus();}
      event.preventDefault();
    }
    return;
  }
  const typing=event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement;
  if(!typing&&(event.key==='g'||event.key==='G')){event.preventDefault();pickerOpen=true;pickerSearch='';pickerClass='All';pickerSort='az';renderPicker();}
  if(!typing&&event.key==='/'){event.preventDefault();document.getElementById('guess-search')?.focus();}
  if(event.key==='Enter'&&event.target.id==='guess-search'){
    const query=event.target.value;const first=filteredRoster(legends,{search:query,excluded:getRound()?.guesses||[]})[0];if(query.trim()&&first)submitGuess(first.name);event.preventDefault();
  }
});
let lastSpotlightUTC=utcDay();
function checkDailyRollover(){
 const currentUTC=utcDay();if(currentUTC===lastSpotlightUTC)return false;
 lastSpotlightUTC=currentUTC;
 store=loadStore();
 if(boardData)boardData={...boardData,daily:[]};
 boardCacheDay=currentUTC;
 pickerOpen=false;quickSearch='';if(intelModalOpen)closeIntelDialog();intelFirstRevealPending=false;
 if(wheelOpen)closeWheel();
 if(triviaMode==='daily')resetTriviaView();
 if(triviaBoard)triviaBoard={...triviaBoard,daily:[]};
 useCurrentDay();
 if(screen==='game'&&session==='daily'){beginDaily();showToast('A new UTC day has started. Choose your Daily difficulty.');return true;}
 if(screen==='daily-choice'||screen==='debrief'){screen='home';}
 if(['home','records','leaderboard','trivia'].includes(screen)&&!wheelOpen){
  render({scroll:false});
  if(screen==='trivia'&&triviaMode==='daily')showToast('New Daily Trivia is ready. Yesterday’s result stays in your history.');
  if(screen==='leaderboard'){void refreshBoards();void loadTriviaBoards();}
 }
 return true;
}
window.addEventListener('focus',checkDailyRollover);
window.addEventListener('pageshow',checkDailyRollover);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDailyRollover();});
setInterval(()=>{
  checkDailyRollover();
  if(screen!=='game')return;
  const round=getRound();if(!round)return;
  const expired=expireRound(round,Date.now());
  if(expired!==round){setRound(expired);sound('lose');render({scroll:false});return;}
  const timer=document.getElementById('round-timer');if(timer){const time=remainingTime(round);timer.querySelector('span').textContent=`${time}s`;timer.classList.toggle('urgent',time<=25&&!round.finished);}
},500);
render();



// Keep open tabs synchronized without overwriting server-backed leaderboards.
window.addEventListener('storage',event=>{if(event.key===null||event.key==='guess-the-predator-2:daybreak-v1'){if(checkDailyRollover())return;const fresh=loadStore();if(fresh?.days){store=fresh;render({scroll:false});}}else if(event.key===triviaDailyRewardKey(today())||event.key==='tac:trivia-receipt:'+today()){render({scroll:false});}});
