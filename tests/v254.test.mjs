import {chooseDaily as chooseDaily265,chosenDaily as chosenDaily265} from '../src/daily265.mjs';import {legends as roster265} from '../src/data.mjs';import {COMMUNITY_INTEL as community265} from '../src/community_intel265.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {loadStore,saveStore,STORE_KEY} from '../src/store.mjs';
import {INTEL_POOL,intelFor} from '../src/daily218.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('rebranding preserves existing practice, daily results, nickname and receipt',()=>{
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const state=loadStore(storage);
 state.settings.session='unlimited';state.profile.nickname='ExistingPlayer';
 state.days['2026-10-19']={daily218:{full:{finished:true,won:true}}};
 state.practice.pixel={answer:'Mirage',guesses:['Wraith'],finished:false};
 state.submittedDays['2026-10-18']={totalScore:500};saveStore(state,storage);
 assert.equal(STORE_KEY,'guess-the-predator-2:daybreak-v1');
 assert.deepEqual(loadStore(storage),state);
});

test('approved scene assets are full-sized WebP files and independent of gameplay geometry',()=>{
 const css=read('styles-v245.css');
 for(const mode of ['ability','pixel','quote','emoji','trivia']){
  const bytes=readFileSync(new URL('../assets/game-bg/'+mode+(mode==='quote'?'-v259.webp':'-v254.webp'),import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert.ok(bytes.length>100000&&bytes.length<600000,mode);
  assert.ok(css.includes(mode+(mode==='quote'?'-v259.webp':'-v254.webp')));
 }
 assert.ok(css.includes('pointer-events:none!important;contain:strict;z-index:0!important'));
 assert.ok(existsSync(new URL('../assets/decor/mythic-bin-real-v239.webp',import.meta.url)));
});

test('Intel rotates deterministic practical notes without falsely claiming EA verification',()=>{assert.doesNotMatch(read('src/app.mjs'),/MECHANIC REFERENCE · EA/);assert.ok(read('src/app.mjs').includes('tip.sourceName'));assert.ok(read('src/app.mjs').includes('COMMON MISTAKE'));});

// Test the actual leaderboard module with a controlled SDK; no production score is submitted.
async function leaderboardWith(sdk){
 const config=read('src/leaderboard_config.mjs');
 const configUrl='data:text/javascript;base64,'+Buffer.from(config).toString('base64');
 const key='__tac_test_'+Math.random().toString(36).slice(2);globalThis[key]=sdk;
 const sdkUrl='data:text/javascript;base64,'+Buffer.from('export const createClient=()=>globalThis['+JSON.stringify(key)+'];').toString('base64');
 const source=read('src/leaderboard.mjs').replace("'./leaderboard_config.mjs'",JSON.stringify(configUrl)).replace("'https://esm.sh/@supabase/supabase-js@2.57.0'",JSON.stringify(sdkUrl));
 const mod=await import('data:text/javascript;base64,'+Buffer.from(source+'\n//'+key).toString('base64'));
 return {mod,dispose:()=>delete globalThis[key]};
}

test('simultaneous Daily and Trivia requests share one anonymous identity',async()=>{
 let session=null,signins=0,release;
 const pending=new Promise(resolve=>{release=resolve;});
 const sdk={auth:{getSession:async()=>({data:{session},error:null}),signInAnonymously:async()=>{signins++;await pending;session={access_token:'retained-player'};return {data:{session},error:null};}},functions:{invoke:async()=>({data:{ok:true},error:null})},rpc:async()=>({data:{ok:true},error:null})};
 const {mod,dispose}=await leaderboardWith(sdk);
 try{const daily=mod.submitDaily({});const trivia=mod.triviaRequest({});await new Promise(resolve=>setTimeout(resolve,10));release();await Promise.all([daily,trivia]);assert.equal(signins,1);await mod.triviaRequest({});assert.equal(signins,1);}finally{dispose();}
});

test('an existing player session is reused without creating another identity',async()=>{
 let signins=0;
 const sdk={auth:{getSession:async()=>({data:{session:{access_token:'existing'}},error:null}),signInAnonymously:async()=>{signins++;throw Error('must not create user');}},functions:{invoke:async()=>({data:{ok:true},error:null})}};
 const {mod,dispose}=await leaderboardWith(sdk);
 try{await mod.submitDaily({});assert.equal(signins,0);}finally{dispose();}
});

test('failed public ranking RPC surfaces an error without presenting an empty successful board',async()=>{
 const sdk={rpc:async name=>name==='get_daily_leaderboard'?{data:null,error:{message:'Temporarily offline'}}:{data:[],error:null}};
 const {mod,dispose}=await leaderboardWith(sdk);
 try{await assert.rejects(mod.getBoards('2026-10-19'),/Temporarily offline/);}finally{dispose();}
});
test('weekly ranking RPCs keep separate Daily and Trivia totals and pass the requested UTC date',async()=>{
 const calls=[];const sdk={rpc:async(name,args)=>{calls.push({name,args});return {data:[{score:name.includes('trivia')?80:1000}],error:null};}};
 const {mod,dispose}=await leaderboardWith(sdk);try{const daily=await mod.getBoards('2026-10-25'),trivia=await mod.getTriviaBoards('2026-10-25');assert.equal(daily.weekly[0].score,1000);assert.equal(trivia.weekly[0].score,80);assert.equal(calls.find(c=>c.name==='get_weekly_leaderboard').args.p_day,'2026-10-25');assert.equal(calls.find(c=>c.name==='get_trivia_weekly_leaderboard').args.p_day,'2026-10-25');}finally{dispose();}
});
