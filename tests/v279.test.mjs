import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {normalizeNickname,validNickname,captureInputFocus,restoreInputFocus} from '../src/usability279.mjs';
const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
test('nickname validation uses the actual trimmed name rather than whitespace padding',()=>{
 assert.equal(normalizeNickname('  Apex   Player '),'Apex Player');for(const name of ['',null,'   ',' a ','ab','a'.repeat(19),'<script>'])assert.equal(validNickname(name),false);assert.equal(validNickname('Apex_Player-13'),true);
});
test('synchronized Daily views follow the chosen difficulty and mode, while cleared progress opens the chooser',()=>{
 const c={screen:'game',session:'daily',store:{days:{}},today:()=> 'today',chosenDaily:()=>({track:'signal',gameMode:'classic'}),dailyTrack:'full',active:'pixel',pickerOpen:true};vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('function reconcileDailyView(){'),app.indexOf('function render(')),c);vm.runInContext('reconcileDailyView()',c);assert.equal(c.dailyTrack,'signal');assert.equal(c.active,'classic');
 c.chosenDaily=()=>null;vm.runInContext('reconcileDailyView()',c);assert.equal(c.screen,'daily-choice');assert.equal(c.pickerOpen,false);
 c.screen='game';c.session='unlimited';c.active='emoji';vm.runInContext('reconcileDailyView()',c);assert.equal(c.active,'emoji');assert.equal(c.screen,'game');
});
test('background rerenders preserve the active text field and selection without focusing unrelated controls',()=>{
 const saved=captureInputFocus({activeElement:{id:'trivia-written-answer',selectionStart:2,selectionEnd:4,selectionDirection:'forward'}});const calls=[];
 restoreInputFocus({getElementById:()=>({focus:o=>calls.push(o),setSelectionRange:(...v)=>calls.push(v)})},saved);assert.deepEqual(calls,[{preventScroll:true},[2,4,'forward']]);
 assert.equal(captureInputFocus({activeElement:{id:'submit-button'}}),null);restoreInputFocus({getElementById:()=>null},saved);
});
