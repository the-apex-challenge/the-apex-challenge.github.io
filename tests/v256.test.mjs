import {chooseDaily as chooseDaily265,chosenDaily as chosenDaily265} from '../src/daily265.mjs';import {legends as roster265} from '../src/data.mjs';import {COMMUNITY_INTEL as community265} from '../src/community_intel265.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {legends} from '../src/data.mjs';
import {FIELDS,LABELS,MODE_NAMES,newRound,scannerState,scannerDisplayValue,legendByName,maxGuesses,remainingTime} from '../src/engine.mjs';
const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const fn=(name,next)=>app.slice(app.indexOf('function '+name+'('),app.indexOf('function '+next+'('));
function homeMarkup({session='daily',full=false,signal=false,trivia=false}={}){
 const rounds={full:{finished:full},signal:{finished:signal}};
 const context={session,legends,MODE_NAMES,esc,store:{days:{},practice:{}},today:()=> '2026-10-19',utcDay:()=> '2026-10-19',
 currentDailyRounds:()=>rounds,checkpointCount:()=>Number(full)+Number(signal),totalIntelCheckpoints:()=>Number(full)+Number(signal)+Number(trivia),
 dailySpotlight:()=>legends[0],dailySchedule:()=>({full:'classic',signal:'quote'}),triviaRewardEarned:()=>trivia,intelState:()=>({unlocked:false,read:false}),
 portrait:()=>'<span class="test-portrait"></span>',playContext:()=>'<section class="only-play-selector"></section>'};
 return vm.runInNewContext(fn('home','homeLegacy')+'home()',context);
}
test('Daily choice remains locked while all Free Play modes remain available',()=>{const days={};const c=chooseDaily265(days,'2026-10-20','signal',roster265);c.round.finished=true;assert.equal(chooseDaily265(days,'2026-10-20','full',roster265),c);assert.ok(app.includes('todayHub('));assert.ok(app.includes('FREE PLAY · UNRANKED'));});
test('every guessing mode renders six real scanner traits and one session status',()=>{
 for(const active of ['classic','pixel','quote','ability','emoji']){
  const round=newRound('Mirage','full');const host={slug:'mirage',name:'MIRAGE'};
  const context={active,session:'unlimited',legends,FIELDS,LABELS,esc,scannerState,scannerDisplayValue,legendByName,maxGuesses,remainingTime,
   ensureRound:()=>round,MODE_HOSTS:Object.fromEntries([active].map(m=>[m,host])),TAGLINES:{[active]:'Clue'},classOf:()=>'',portrait:()=>'',
   quickModeLinks:()=>'',cinematicStageAside:()=>'',getVisual:()=>'<div>Clue</div>',cinematicControls:()=>'',triedLegendNote:()=>'',visibleRoundModes:()=>'',
   victoryIntelState:()=>null};
  const html=vm.runInNewContext(fn('cinematicIdentityBoard','cinematicStageAside')+fn('game','howTo')+'game()',context);
  assert.equal((html.match(/class="gtp230-trait gtp230-trait-/g)||[]).length,6,active);
  assert.equal((html.match(/FREE PLAY · UNRANKED/g)||[]).length,1,active);
  assert.ok(!html.includes('tac-play-context'),active);
 }
});
test('Practice starts without nickname; Ranked still requests one',async()=>{
 for(const triviaMode of ['practice','daily']){
  let prompts=0,requests=0;
  const context={triviaMode,triviaBusy:false,triviaMessage:'',screen:'trivia',triviaRun:null,triviaAnswerText:'',savedNickname:()=>'',
   render:()=>{},openIdentityPrompt:()=>prompts++,saveTriviaReward:()=>{},focusTriviaQuestion:()=>{},
   triviaAction:async(action,p)=>{requests++;assert.equal(action,'start');assert.equal(p.displayName,'Practice');return {finished:false};}};
  await vm.runInNewContext(app.slice(app.indexOf('async function triviaStart('),app.indexOf('async function triviaSubmitAnswer('))+'triviaStart()',context);
  assert.equal(prompts,triviaMode==='daily'?1:0);assert.equal(requests,triviaMode==='daily'?0:1);
 }
});
