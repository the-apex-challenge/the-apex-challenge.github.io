-- Read-only weekly aggregates; existing score rows and ranking functions are unchanged.
-- Explicitly expose the same public score fields as the existing ranking RPCs.
create or replace function public.get_weekly_leaderboard(p_day date,p_limit integer default 25)
returns table("position" bigint,player_name text,score bigint,days_played bigint,best_streak integer)
language sql stable security definer set search_path='' as $function$
 with bounds as (select date_trunc('week',p_day::timestamp)::date as start_day),
 totals as (
 select d.user_id,sum(d.total_score)::bigint score,count(*)::bigint days_played,max(d.streak)::integer best_streak
 from public.gtp_daily_scores d,bounds b where d.day>=b.start_day and d.day<b.start_day+7 group by d.user_id
 ), named as (
 select t.*,(select d.display_name from public.gtp_daily_scores d where d.user_id=t.user_id order by d.day desc limit 1) display_name from totals t
 )
 select row_number() over(order by x.score desc,x.days_played desc,x.user_id),tac_private.rank_name(x.user_id,x.display_name)::text,x.score,x.days_played,x.best_streak
 from (select * from named order by score desc,days_played desc,user_id limit greatest(1,least(coalesce(p_limit,25),50))) x;
$function$;
revoke all on function public.get_weekly_leaderboard(date,integer) from public;
grant execute on function public.get_weekly_leaderboard(date,integer) to anon,authenticated;

create or replace function public.get_trivia_weekly_leaderboard(p_day date,p_limit integer default 25)
returns table("position" bigint,player_name text,score bigint,days_played bigint,perfect_days bigint)
language sql stable security definer set search_path='' as $function$
 with bounds as (select date_trunc('week',p_day::timestamp)::date as start_day),
 totals as (
 select d.user_id,sum(d.score)::bigint score,count(*)::bigint days_played,count(*) filter(where d.score=100)::bigint perfect_days
 from public.gtp_trivia_runs d,bounds b where d.mode='daily' and d.finished and d.day>=b.start_day and d.day<b.start_day+7 group by d.user_id
 ), named as (
 select t.*,(select d.display_name from public.gtp_trivia_runs d where d.user_id=t.user_id and d.mode='daily' and d.finished order by d.day desc limit 1) display_name from totals t
 )
 select row_number() over(order by x.score desc,x.days_played desc,x.user_id),tac_private.rank_name(x.user_id,x.display_name)::text,x.score,x.days_played,x.perfect_days
 from (select * from named order by score desc,days_played desc,user_id limit greatest(1,least(coalesce(p_limit,25),50))) x;
$function$;
revoke all on function public.get_trivia_weekly_leaderboard(date,integer) from public;
grant execute on function public.get_trivia_weekly_leaderboard(date,integer) to anon,authenticated;
