-- v2: replace service-role access with narrow SECURITY DEFINER functions.
-- The app runs with only the anon/publishable key; these functions are the
-- sole doors into the assessment tables and self-provisioning.
-- (Already applied to the live project via MCP on 2026-07-08.)

-- 1) Public assessment submission (called server-side by the Next API route,
--    which validates and scores; guards here are defense in depth).
create or replace function public.submit_assessment(
  p_token text,
  p_full_name text,
  p_email text,
  p_company text,
  p_phone text,
  p_industry text,
  p_team_size text,
  p_answers jsonb,
  p_scores jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead uuid;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 64 then
    raise exception 'invalid token';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0
     or p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid lead';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object'
     or p_scores is null or jsonb_typeof(p_scores) <> 'object'
     or pg_column_size(p_answers) > 20000 or pg_column_size(p_scores) > 100000 then
    raise exception 'invalid payload';
  end if;

  insert into public.assessment_leads (full_name, email, company, phone)
  values (
    left(trim(p_full_name), 200),
    left(trim(p_email), 320),
    nullif(left(coalesce(p_company, ''), 200), ''),
    nullif(left(coalesce(p_phone, ''), 50), '')
  )
  returning id into v_lead;

  insert into public.assessments (token, answers, scores, industry, team_size, lead_id)
  values (p_token, p_answers, p_scores, left(p_industry, 50), left(p_team_size, 50), v_lead);
end
$$;

revoke all on function public.submit_assessment(text, text, text, text, text, text, text, jsonb, jsonb) from public;
grant execute on function public.submit_assessment(text, text, text, text, text, text, text, jsonb, jsonb) to anon, authenticated;

-- 2) Tokenized report read. Tokens are 144-bit random; effectively unguessable.
create or replace function public.get_assessment(p_token text)
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
    'claimed', a.claimed_business is not null
  )
  from public.assessments a
  where a.token = p_token;
$$;

revoke all on function public.get_assessment(text) from public;
grant execute on function public.get_assessment(text) to anon, authenticated;

-- 3) Self-provisioning: creates the caller's business, claims their
--    assessment, seeds starter actions. Idempotent.
create or replace function public.provision_my_business(
  p_business_name text,
  p_assessment_token text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_biz uuid;
  v_assessment uuid;
  v_industry text;
  v_team text;
  v_scores jsonb;
  v_actions jsonb;
  a jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id into v_biz from public.businesses where owner_id = v_uid limit 1;
  if v_biz is not null then
    return v_biz;
  end if;

  if p_business_name is null or length(trim(p_business_name)) = 0 then
    raise exception 'business name required';
  end if;

  if p_assessment_token is not null and length(p_assessment_token) >= 16 then
    select id, industry, team_size, scores
      into v_assessment, v_industry, v_team, v_scores
      from public.assessments
     where token = p_assessment_token
       and claimed_business is null;
  end if;

  insert into public.businesses (owner_id, name, industry, team_size)
  values (v_uid, left(trim(p_business_name), 200), v_industry, v_team)
  returning id into v_biz;

  if v_assessment is not null then
    update public.assessments set claimed_business = v_biz where id = v_assessment;
  end if;

  v_actions := coalesce(v_scores -> 'starterActions', '[]'::jsonb);
  if jsonb_typeof(v_actions) <> 'array' or jsonb_array_length(v_actions) = 0 then
    v_actions := jsonb_build_array(
      jsonb_build_object(
        'key', 'seed:collect:overdue',
        'title', 'List every overdue invoice',
        'detail', 'Add each unpaid invoice with its due date. They''ll be chased from here daily until they''re paid.'
      ),
      jsonb_build_object(
        'key', 'seed:convert:list',
        'title', 'List every quote older than 7 days',
        'detail', 'Add each open quote so it appears here with its age. Anything unanswered for a week is at risk.'
      ),
      jsonb_build_object(
        'key', 'seed:lead:morning',
        'title', 'Start tomorrow from this list',
        'detail', 'Open DueToday before your inbox. Finish the list. Go home.'
      )
    );
  end if;

  for a in select * from jsonb_array_elements(v_actions) limit 12 loop
    insert into public.actions (business_id, key, kind, title, detail, priority, due_date)
    values (
      v_biz,
      left(coalesce(a->>'key', 'seed:' || md5(a::text)), 200),
      'system',
      left(coalesce(a->>'title', 'Set up DueToday'), 300),
      left(a->>'detail', 1000),
      50,
      current_date
    )
    on conflict (business_id, key) do nothing;
  end loop;

  return v_biz;
end
$$;

revoke all on function public.provision_my_business(text, text) from public;
grant execute on function public.provision_my_business(text, text) to authenticated;
