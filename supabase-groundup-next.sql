-- GroundUp Estimating Pro next-step schema
-- Run this in Supabase SQL Editor after reviewing it.
-- It adds estimate JSON storage, cost library tables, starter seed items, and RLS templates.

alter table public.project_workspace
add column if not exists estimate_json jsonb;

create table if not exists public.cost_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  trade text not null,
  scope text not null,
  unit text not null,
  base_qty numeric not null default 1,
  labor_hours numeric not null default 0,
  material_cost numeric not null default 0,
  equipment_sub_cost numeric not null default 0,
  source_type text not null default 'seed',
  confidence text not null default 'starter',
  source_note text,
  region text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assemblies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  trade text not null,
  description text,
  source_type text not null default 'seed',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assembly_items (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  cost_item_id uuid not null references public.cost_items(id) on delete cascade,
  quantity_factor numeric not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.regional_labor_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  region text not null,
  trade text not null,
  occupation text not null,
  base_wage numeric not null default 0,
  burden_percent numeric not null default 0,
  loaded_rate numeric not null default 0,
  source_type text not null default 'manual',
  source_note text,
  effective_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.material_indexes (
  id uuid primary key default gen_random_uuid(),
  item_category text not null,
  index_name text not null,
  index_value numeric,
  source_type text not null default 'public_index',
  source_note text,
  effective_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  vendor_name text,
  trade text,
  scope text,
  quoted_amount numeric not null default 0,
  quote_date date,
  file_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.contractor_cost_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cost_item_id uuid references public.cost_items(id) on delete cascade,
  labor_hours numeric,
  material_cost numeric,
  equipment_sub_cost numeric,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.cost_items
  (organization_id, trade, scope, unit, base_qty, labor_hours, material_cost, equipment_sub_cost, source_type, confidence, source_note)
values
  (null, 'Electrical', 'EMT conduit 3/4 in exposed', 'LF', 100, 8, 260, 0, 'seed', 'starter', 'Includes layout, anchors, bends, couplings. Adjust for height/congestion.'),
  (null, 'Electrical', 'PVC conduit 2 in underground', 'LF', 100, 10, 420, 0, 'seed', 'starter', 'Conduit only. Trenching/backfill separate.'),
  (null, 'Electrical', 'THHN copper feeder pull #2', 'LF', 500, 18, 1850, 0, 'seed', 'starter', 'Adjust for conductor count, bends, distance, crew size.'),
  (null, 'Electrical', 'Panelboard install and terminate', 'EA', 1, 24, 2800, 0, 'seed', 'starter', 'Small/medium panel. Gear price must be vendor-quoted.'),
  (null, 'Electrical', 'Transformer pad mount coordination', 'EA', 1, 18, 1200, 3500, 'seed', 'starter', 'Placeholder for coordination, terminations, and vendor/sub costs.'),
  (null, 'Electrical', 'Light pole base rough-in', 'EA', 1, 6, 380, 450, 'seed', 'starter', 'Electrical portion only. Concrete/augering may be civil/sub.'),
  (null, 'Utility', 'Trench excavation 24 in wide', 'LF', 100, 14, 0, 1800, 'seed_dot_target', 'starter', 'Use state DOT bid histories for regional excavation validation.'),
  (null, 'Utility', 'Sand bedding and warning tape', 'LF', 100, 5, 620, 250, 'seed', 'starter', 'Adjust bedding depth, haul distance, compaction requirements.'),
  (null, 'Utility', 'Precast pull box install', 'EA', 1, 8, 950, 450, 'seed', 'starter', 'Box size and traffic rating drive cost.'),
  (null, 'Utility', 'Duct bank concrete encasement', 'LF', 100, 18, 2200, 900, 'seed', 'starter', 'Rebar, spacers, inspection, and pump/truck access vary heavily.'),
  (null, 'Civil', 'Asphalt sawcut and patch', 'SF', 100, 6, 780, 950, 'seed_dot_target', 'starter', 'Best validated from local DOT/city bid tabs.'),
  (null, 'Civil', 'Concrete sidewalk remove and replace', 'SF', 100, 10, 900, 650, 'seed_dot_target', 'starter', 'Adjust for demo, haul-off, thickness, and reinforcement.'),
  (null, 'Civil', 'Traffic control allowance', 'DAY', 1, 4, 0, 1200, 'seed', 'starter', 'Highly local. Should become vendor/sub quote library item.'),
  (null, 'Civil', 'Mobilization / demobilization', 'LS', 1, 8, 0, 1500, 'seed', 'starter', 'Scale by project duration, crew size, and equipment moves.')
on conflict do nothing;

alter table public.cost_items enable row level security;
alter table public.assemblies enable row level security;
alter table public.assembly_items enable row level security;
alter table public.regional_labor_rates enable row level security;
alter table public.material_indexes enable row level security;
alter table public.vendor_quotes enable row level security;
alter table public.contractor_cost_overrides enable row level security;

-- Starter RLS policies.
-- These assume organizations.owner_user_id exists, which your app already uses.
-- Seed rows have organization_id is null and are readable by signed-in users.

create policy "Read seed and own org cost items"
on public.cost_items for select
to authenticated
using (
  organization_id is null
  or organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
);

create policy "Manage own org cost items"
on public.cost_items for all
to authenticated
using (
  organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
)
with check (
  organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
);

create policy "Read public material indexes"
on public.material_indexes for select
to authenticated
using (true);

create policy "Manage own org vendor quotes"
on public.vendor_quotes for all
to authenticated
using (
  organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
)
with check (
  organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
);

create policy "Manage own org overrides"
on public.contractor_cost_overrides for all
to authenticated
using (
  organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
)
with check (
  organization_id in (
    select id from public.organizations where owner_user_id = auth.uid()
  )
);
