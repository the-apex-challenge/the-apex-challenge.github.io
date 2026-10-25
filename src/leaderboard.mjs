/** Public leaderboard client. Dynamic import only when URL/key are configured. */
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './leaderboard_config.mjs';
let clientPromise;
let identityPromise;
export const leaderboardConfigured=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)&&SUPABASE_PUBLISHABLE_KEY.length>16;
async function client(){
 if(!leaderboardConfigured())throw Error('Leaderboard is not configured yet. See LEADERBOARD_SETUP.md');
 if(!clientPromise)clientPromise=import('https://esm.sh/@supabase/supabase-js@2.57.0').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}})).catch(error=>{clientPromise=undefined;throw error;});
 return clientPromise;
}
export async function getBoards(day){
 const sb=await client();
 const [{data:daily,error:a},{data:overall,error:b},{data:weekly,error:c}]=await Promise.all([
  sb.rpc('get_daily_leaderboard',{p_day:day,p_limit:25}),
  sb.rpc('get_overall_leaderboard',{p_limit:25}),
  sb.rpc('get_weekly_leaderboard',{p_day:day,p_limit:25}),
 ]);
 if(a||b||c)throw Error(a?.message||b?.message||c?.message||'Leaderboard unavailable');
 return {daily:daily||[],overall:overall||[],weekly:weekly||[]};
}
export async function submitDaily(payload){
 const sb=await signedInClient();
 const {data,error}=await sb.functions.invoke('submit-score',{body:payload});
 if(error){let detail='';try{const response=error.context;if(response?.json){const body=await response.json();detail=typeof body?.error==='string'?body.error:'';}}catch{}throw new Error(detail||error.message||'Score submission failed');}
 if(!data?.ok)throw new Error(data?.error||'Invalid score submission');
 return data;
}

/** Trivia uses the SAME signed-in anonymous identity, but an independent scoring service. */
export async function triviaRequest(payload){
 const sb=await signedInClient();
 const {data,error}=await sb.rpc('gtp_trivia_api',{p_payload:payload});
 if(error)throw Error(error.message||'Trivia server unavailable');
 if(!data?.ok)throw Error(data?.error||'Trivia request was not accepted');
 return data;
}
export async function getTriviaBoards(day){
 const sb=await client();
 const [{data:daily,error:a},{data:overall,error:b},{data:weekly,error:c}]=await Promise.all([
  sb.rpc('get_trivia_daily_leaderboard',{p_day:day,p_limit:25}),
  sb.rpc('get_trivia_overall_leaderboard',{p_limit:25}),
  sb.rpc('get_trivia_weekly_leaderboard',{p_day:day,p_limit:25})]);
 if(a||b||c)throw Error(a?.message||b?.message||c?.message||'Trivia leaderboard unavailable');
 return {daily:daily||[],overall:overall||[],weekly:weekly||[]};
}

/** Concurrent actions share one anonymous sign-in, retaining the existing player identity. */
async function signedInClient(){
 const sb=await client();
 if(!identityPromise)identityPromise=(async()=>{
  const {data:{session},error}=await sb.auth.getSession();
  if(error)throw error;
  if(!session){const response=await sb.auth.signInAnonymously();if(response.error)throw response.error;if(!response.data.session?.access_token)throw Error('Could not create player session');}
  return sb;
 })().finally(()=>{identityPromise=undefined;});
 return identityPromise;
}
