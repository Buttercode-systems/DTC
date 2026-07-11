-- Return the latest assessment claimed by the signed-in user's business.
-- Assessment tables remain closed to direct client reads.

create or replace function public.get_my_assessment()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'token', a.token,
    'scores', a.scores,
    'industry', a.industry,
    'team_size', a.team_size,
    'created_at', a.created_at,
    'claimed', true
  )
  from public.assessments a
  join public.businesses b on b.id = a.claimed_business
  where b.owner_id = auth.uid()
  order by a.created_at desc
  limit 1;
$$;

revoke all on function public.get_my_assessment() from public;
revoke all on function public.get_my_assessment() from anon;
grant execute on function public.get_my_assessment() to authenticated;
