import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {legends} from './_shared/data.mjs';
import {MODES,hash,puzzleAnswers} from './_shared/engine.mjs';

/** Deploy separately from GitHub Pages; single Daily Easy scores use a 70% weight.
 * Supports V2.18 dual challenges and legacy five-puzzle submissions during transition.
 */
const allowedOrigins=new Set(['https://the-apex-challenge.github.io','https://negoitasebastian.github.io','https://guessthepredator.github.io','http://localhost:8000','http://127.0.0.1:8000']);
const fields=new Set(['role','gender','form','age','debut','origin']);
const names=new Set(legends.map(l=>l.name));
const json=(body:unknown,status=200,origin='https://guessthepredator.github.io')=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}
});
const yesterday=day=>new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
function validRankedTimer(r,now=Date.now()){
 if(!Number.isFinite(r.startedAt)||!Number.isFinite(r.finishedAt))return false;
 const dayStart=Math.floor(now/86400000)*86400000;
 if(r.startedAt<dayStart||r.finishedAt<r.startedAt||r.finishedAt>now+2000||r.finishedAt>=dayStart+86400000)return false;
 if(r.timeLimit===0)return true;
 if(r.timeLimit!==120)return false;
 const elapsed=r.finishedAt-r.startedAt;
 return r.loss==='time'?!r.won&&elapsed===120000:elapsed<120000;
}
Deno.serve(async(req:Request)=>{
 const incoming=req.headers.get('Origin');if(incoming&&!allowedOrigins.has(incoming))return json({error:'Origin not allowed'},403);
 const origin=incoming||'https://guessthepredator.github.io';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}});
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 const bearer=req.headers.get('Authorization')||'';if(!bearer.startsWith('Bearer '))return json({error:'Authentication required'},401,origin);
 const endpoint=Deno.env.get('SUPABASE_URL')||'',secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(!endpoint||!secret)return json({error:'Server configuration unavailable'},503,origin);
 let raw:string;try{raw=await req.text();}catch{return json({error:'Invalid request'},400,origin);}
 if(raw.length>16000)return json({error:'Payload too large'},413,origin);
 let payload:any;try{payload=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400,origin);}
 if(typeof payload?.displayName==='string')payload.displayName=payload.displayName.trim().replace(/\s+/g,' ');
 const day=new Date().toISOString().slice(0,10),isDual=payload?.protocol==='v218',isClassic=payload?.protocol==='v278',isSingle=isClassic||payload?.protocol==='v265';
 const tracks=isSingle&&['full','signal'].includes(payload.difficulty)?[payload.difficulty]:isDual?['full','signal']:MODES;
 if(isSingle&&!['full','signal'].includes(payload.difficulty))return json({error:'Choose Full Scan or One Signal'},400,origin);
 if(typeof payload?.displayName!=='string'||!/^[A-Za-z0-9 _-]{3,18}$/.test(payload.displayName)||payload.day!==day||!payload.rounds||typeof payload.rounds!=='object'||Object.keys(payload.rounds).length!==tracks.length||tracks.some(track=>!Object.hasOwn(payload.rounds,track)))return json({error:'Invalid nickname, date or rounds'},400,origin);
 const client=createClient(endpoint,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(bearer.slice(7).trim());
 if(authError||!user||user.is_anonymous!==true)return json({error:'Invalid anonymous session'},401,origin);
 const answers=puzzleAnswers(day,legends),pivot=hash('gtp:v218:daily:'+day)%MODES.length;
 const schedule={full:MODES[pivot],signal:MODES[(pivot+2)%MODES.length]};
 if(isSingle){const r=payload.rounds[payload.difficulty];if(!r||r.mode!==payload.difficulty||r.gameMode!==(isClassic?'classic':payload.legacyMigration===true?schedule[payload.difficulty]:schedule.full)||(isClassic?r.timeLimit!==120:![0,120].includes(r.timeLimit)))return json({error:'Daily difficulty configuration mismatch'},400,origin);}
 if(isDual&&(!payload.rounds.full||!payload.rounds.signal||payload.rounds.full.mode!=='full'||payload.rounds.signal.mode!=='signal'||payload.rounds.full.gameMode!==schedule.full||payload.rounds.signal.gameMode!==schedule.signal||![0,120].includes(payload.rounds.full.timeLimit)||![0,120].includes(payload.rounds.signal.timeLimit)))return json({error:'Daily track configuration mismatch'},400,origin);
 if(isDual&&(!Number.isFinite(payload.rounds.full.finishedAt)||!Number.isFinite(payload.rounds.signal.startedAt)||payload.rounds.signal.startedAt<payload.rounds.full.finishedAt))return json({error:'Daily track order invalid'},400,origin);
 let base=0,allWon=true;const details:Record<string,unknown>={};
 for(const track of tracks){
  const gameMode=isSingle?payload.rounds[track].gameMode:isDual?schedule[track]:track,r=payload.rounds[track],guesses=r?.guesses;
  if(!r||!Array.isArray(guesses)||guesses.length>6||!guesses.every((guess:unknown)=>typeof guess==='string'&&names.has(guess as string))||new Set(guesses).size!==guesses.length||!Array.isArray(r.hints)||r.hints.length>2||r.hints.some((field:unknown)=>typeof field!=='string'||!fields.has(field as string))||new Set(r.hints).size!==r.hints.length||!['signal','full'].includes(r.mode)||![0,120,180].includes(r.timeLimit)||r.finished!==true||typeof r.won!=='boolean')return json({error:`Invalid ${track} round`},400,origin);
  const limit=r.mode==='full'?5:6;if(guesses.length>limit)return json({error:'Too many guesses'},400,origin);
  const hit=guesses.indexOf(answers[gameMode]),won=hit===guesses.length-1&&hit!==-1;
  if((hit!==-1&&!won)||r.won!==won||(!won&&!(guesses.length===limit||([120,180].includes(r.timeLimit)&&r.loss==='time'))))return json({error:`Round verification failed: ${track}`},400,origin);
  if(r.loss==='time'&&![120,180].includes(r.timeLimit))return json({error:'Invalid timer'},400,origin);
  if((isDual||isSingle)&&!validRankedTimer(r))return json({error:"Invalid ranked timing"},400,origin);
  let remain=0;if([120,180].includes(r.timeLimit)&&Number.isFinite(r.startedAt)&&Number.isFinite(r.finishedAt)){
   const duration=(r.finishedAt-r.startedAt)/1000;if(duration<0||duration>86400)return json({error:'Invalid timing'},400,origin);
   remain=Math.max(0,Math.min(r.timeLimit,Math.ceil(r.timeLimit-duration)));
  }
  const points=won?Math.max(100,Math.round(1460-(guesses.length-1)*180-r.hints.length*145+remain*4)):0;
  base+=points;allWon&&=won;details[track]={gameMode,won,guesses:guesses.length,hints:r.hints.length,score:points};
 }
 if(isDual)base=Math.round(base*2.5);if(isSingle)base=Math.round(base*5*(payload.difficulty==='full'?0.7:1));
 const {data:prior,error:priorError}=await client.from('gtp_daily_scores').select('user_id').eq('user_id',user.id).eq('day',day).maybeSingle();
 if(priorError)return json({error:'Unable to check existing scores'},503,origin);
 if(prior)return json({error:"Today's score is already registered"},409,origin);
 const {data:prev,error:prevError}=await client.from('gtp_daily_scores').select('streak,all_won').eq('user_id',user.id).eq('day',yesterday(day)).maybeSingle();
 if(prevError)return json({error:'Unable to check streak'},503,origin);
 const streak=allWon?(prev?.all_won?prev.streak+1:1):0,bonus=Math.round(base*Math.min(streak,10)*.05);
 const {error:insertError}=await client.from('gtp_daily_scores').insert({user_id:user.id,day,display_name:payload.displayName,base_score:base,streak_bonus:bonus,streak,all_won:allWon,round_results:details});
 if(insertError)return json({error:insertError.message?.includes('Nickname already taken')?'Nickname already taken. Choose another nickname.':insertError.code==='23505'?'Already submitted':'Score storage failed'},insertError.code==='23505'?409:500,origin);
 return json({ok:true,baseScore:base,streakBonus:bonus,totalScore:base+bonus,streak},200,origin);
});
