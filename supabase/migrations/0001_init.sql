-- DueToday production schema v1
-- Multi-tenant: every operational row belongs to a business owned by a user.
-- RLS enforced on every table. Assessment funnel tables are written only by
-- the server (service role); no anonymous client access.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ businesses
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  industry text,
  team_size text,
  settings jsonb not null default '{
    "lead_response_hours": 4,
    "quote_followup_days": 3,
    "quote_expiry_days": 30,
    "invoice_chase_days": [1, 7, 14]
  }'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.businesses enable row level security;

create policy "owner full access" on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index businesses_owner_idx on public.businesses (owner_id);

-- --------------------------------------------------- assessment funnel
create table public.assessment_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.assessment_leads enable row level security;
-- no policies: service-role only.

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  answers jsonb not null,
  scores jsonb not null,
  industry text not null,
  team_size text not null,
  lead_id uuid references public.assessment_leads (id) on delete set null,
  claimed_business uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.assessments enable row level security;
-- no policies: service-role only (reports served by tokenized server routes).

create index assessments_token_idx on public.assessments (token);

-- ------------------------------------------------------------- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;

create index customers_business_idx on public.customers (business_id);

-- ----------------------------------------------------------------- leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null,
  phone text,
  email text,
  source text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'responded', 'quoted', 'won', 'lost')),
  received_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;

create index leads_business_idx on public.leads (business_id, status);

-- ---------------------------------------------------------------- quotes
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  number text not null,
  description text,
  amount numeric(14, 2) not null default 0,
  status text not null default 'sent'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  sent_at timestamptz,
  valid_until date,
  last_followup_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.quotes enable row level security;

create index quotes_business_idx on public.quotes (business_id, status);

-- -------------------------------------------------------------- invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  kind text not null default 'customer' check (kind in ('customer', 'supplier')),
  counterparty text, -- supplier name for kind = 'supplier'
  number text not null,
  description text,
  amount numeric(14, 2) not null default 0,
  status text not null default 'sent'
    check (status in ('draft', 'sent', 'approved', 'paid', 'void')),
  issued_at date not null default current_date,
  due_date date,
  paid_at timestamptz,
  last_chase_at timestamptz,
  recurring_interval text check (recurring_interval in ('monthly')),
  next_issue_date date,
  created_at timestamptz not null default now()
);
alter table public.invoices enable row level security;

create index invoices_business_idx on public.invoices (business_id, kind, status);

-- ------------------------------------------------------ payment promises
create table public.payment_promises (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  promised_date date not null,
  amount numeric(14, 2),
  kept boolean,
  note text,
  created_at timestamptz not null default now()
);
alter table public.payment_promises enable row level security;

create index promises_business_idx on public.payment_promises (business_id, promised_date);

-- ---------------------------------------------------------------- actions
create table public.actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  key text not null,
  kind text not null,
  title text not null,
  detail text,
  priority int not null default 0,
  entity_table text,
  entity_id uuid,
  contact_phone text,
  due_date date not null default current_date,
  status text not null default 'open'
    check (status in ('open', 'done', 'snoozed', 'dismissed')),
  snoozed_until date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, key)
);
alter table public.actions enable row level security;

create index actions_business_idx on public.actions (business_id, status, due_date);

-- --------------------------------------------- shared business-scope RLS
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'leads', 'quotes', 'invoices', 'payment_promises', 'actions'
  ]
  loop
    execute format(
      'create policy "business scope" on public.%I for all using (
         exists (
           select 1 from public.businesses b
           where b.id = %I.business_id and b.owner_id = auth.uid()
         )
       ) with check (
         exists (
           select 1 from public.businesses b
           where b.id = %I.business_id and b.owner_id = auth.uid()
         )
       )', t, t, t);
  end loop;
end
$$;
