-- Keep public invitation previews minimal. Possession of the bearer token may reveal
-- the service name, invited email, role, state and expiry, but never internal UUIDs.
create or replace function public.get_managed_client_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_invitation public.managed_client_invitations%rowtype;
  v_business public.businesses%rowtype;
begin
  if char_length(trim(coalesce(p_token, ''))) < 32 then return null; end if;

  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  limit 1;

  if v_invitation.id is null then return null; end if;
  select * into v_business from public.businesses where id = v_invitation.business_id;

  return jsonb_build_object(
    'business_name', v_business.name,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'status', case
      when v_invitation.status = 'pending' and v_invitation.expires_at <= now() then 'expired'
      else v_invitation.status
    end,
    'expires_at', v_invitation.expires_at
  );
end;
$$;

revoke all on function public.get_managed_client_invitation(text) from public;
grant execute on function public.get_managed_client_invitation(text) to anon, authenticated;
