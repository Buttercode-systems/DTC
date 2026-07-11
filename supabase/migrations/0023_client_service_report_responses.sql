-- Client review state for managed-service weekly reports.

alter table public.service_reports
  add column if not exists client_viewed_at timestamptz,
  add column if not exists client_response text
    check (client_response is null or client_response in ('continue', 'change', 'stop')),
  add column if not exists client_response_note text,
  add column if not exists client_responded_by uuid references auth.users(id) on delete set null,
  add column if not exists client_responded_at timestamptz;

create index if not exists service_reports_client_response_idx
  on public.service_reports(business_id, client_response, period_end desc);
