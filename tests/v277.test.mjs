import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {chooseDaily,chosenDaily} from '../src/daily265.mjs';
import {checkpointCount} from '../src/daily218.mjs';
import {freshStore,loadStore,saveStore} from '../src/store.mjs';
import {legends} from '../src/data.mjs';
import {normalizeNickname,validNickname} from '../src/usability279.mjs';
const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const section=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
test('completed history, rewards and difficulty stay on their original UTC day after reload',()=>{
 const store=freshStore(),old='2026-10-23',day='2026-10-24';
 const previous=chooseDaily(store.days,old,'signal',legends);previous.round.finished=true;previous.round.won=true;
 store.intelOpenedDays={[old+':1']:true};store.submittedDays[old]={totalScore:100};
 let raw;const storage={getItem:()=>raw,setItem:(_k,v)=>{raw=v;}};saveStore(store,storage);const restored=loadStore(storage);
 assert.equal(checkpointCount(restored.days,day),0);assert.equal(chosenDaily(restored.days,day),null);
 assert.equal(restored.submittedDays[day],undefined);assert.equal(restored.intelOpenedDays[day+':1'],undefined);
 assert.equal(checkpointCount(restored.days,old),1);
 assert.equal(chooseDaily(restored.days,day,'full',legends).round.guesses.length,0);
 assert.equal(chosenDaily(restored.days,old).round.finished,true);
});
test('late score receipt belongs to yesterday even if midnight happens during submission',async()=>{
 let day='2026-10-23',resolve;const pending=new Promise(r=>resolve=r);
 const c={normalizeNickname,validNickname,checkDailyRollover:()=>false,scoreSubmitting:false,leaderboardConfigured:()=>true,dailySummary:()=>({completed:true}),
  store:{days:{},submittedDays:{}},today:()=>day,utcDay:()=>day,sharedDay:null,
  document:{getElementById:id=>id==='board-nickname'?{checkValidity:()=>true,value:'Tester'}:null,querySelector:()=>null},
  saveNickname:()=>{},buildSubmission:(_s,d)=>({day:d}),submitDaily:payload=>{assert.equal(payload.day,day);return pending;},sync:()=>{},showToast:()=>{}};
 vm.createContext(c);vm.runInContext(section('async function submitScores(){','function dailyDebrief(){'),c);
 const result=vm.runInContext('submitScores()',c);day='2026-10-24';resolve({totalScore:100});await result;
 assert.equal(c.store.submittedDays['2026-10-23'].totalScore,100);assert.equal(c.store.submittedDays[day],undefined);
});
test('late Trivia board response cannot be cached as the new day',async()=>{
 let day='2026-10-23',resolve;const pending=new Promise(r=>resolve=r);const writes=[];
 const c={utcDay:()=>day,leaderboardConfigured:()=>true,screen:'home',triviaBoard:null,render:()=>{},
 getTriviaBoards:()=>pending,localStorage:{setItem:(...v)=>writes.push(v)}};
 vm.createContext(c);vm.runInContext(section('async function loadTriviaBoards(){','function resetTriviaView(){'),c);
 const result=vm.runInContext('loadTriviaBoards()',c);day='2026-10-24';resolve({daily:[{score:100}],overall:[]});await result;
 assert.equal(c.triviaBoard,null);assert.equal(writes.length,0);
});
test('server response for an old Trivia day is rejected even with a current request context',async()=>{
 const c={triviaMode:'daily',checkDailyRollover:()=>false,triviaBusy:false,triviaSubmitting:false,triviaRun:null,
 triviaContext:()=>({day:'2026-10-24',mode:'daily'}),currentTriviaContext:()=>true,utcDay:()=> '2026-10-24',
 triviaRequest:async()=>({mode:'daily',day:'2026-10-23',finished:true}),saveTriviaReward:()=>{},render:()=>{},screen:'home'};
 vm.createContext(c);vm.runInContext(section('async function triviaAction(','async function triviaHelp(){'),c);
 await vm.runInContext("triviaAction('start')",c);assert.equal(c.triviaRun,null);assert.equal(c.triviaBusy,false);
});
test('UTC boundaries do not depend on the player timezone',async()=>{
 const {utcDay}=await import('../src/engine.mjs');
 assert.equal(utcDay('2026-10-24T02:59:59+03:00'),'2026-10-23');
 assert.equal(utcDay('2026-10-24T03:00:00+03:00'),'2026-10-24');
});
