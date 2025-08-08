-- supabase.sql
-- Run this in Supabase SQL editor before deploying to Vercel.

-- extensions (uuid v4)
create extension if not exists "pgcrypto";

-- groups
create table if not exists public.groups (
  id text primary key,
  nome text not null,
  descricao text,
  imagem text,
  created_at timestamptz default now()
);

-- products
create table if not exists public.products (
  id text primary key,
  nome text not null,
  descricao text,
  preco numeric,
  imagem text,
  grupo text references public.groups(id) on delete set null,
  desconto numeric default 0,
  link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- downloads
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  description text,
  imagem text,
  created_at timestamptz default now()
);

-- rules (admin)
create table if not exists public.rules (
  id text primary key,
  type text check (type in ('message','keyword','regex')) not null,
  pattern text not null,
  reply text not null,
  active_hours jsonb,
  external_webhook text,
  integration_action text,
  enabled boolean default true
);

-- webhooks (admin)
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  name text,
  url text,
  headers jsonb,
  enabled boolean default true
);

-- access analytics
create table if not exists public.access (
  day date primary key,
  total int default 0
);

-- RLS
alter table public.groups enable row level security;
alter table public.products enable row level security;
alter table public.downloads enable row level security;
alter table public.rules enable row level security;
alter table public.webhooks enable row level security;
alter table public.access enable row level security;

-- Public read policies for client (only SELECT)
create policy "public_select_groups" on public.groups for select to anon using (true);
create policy "public_select_products" on public.products for select to anon using (true);
create policy "public_select_downloads" on public.downloads for select to anon using (true);

-- No public modifications:
create policy "service_all_groups" on public.groups for all to service_role using (true) with check (true);
create policy "service_all_products" on public.products for all to service_role using (true) with check (true);
create policy "service_all_downloads" on public.downloads for all to service_role using (true) with check (true);
create policy "service_all_rules" on public.rules for all to service_role using (true) with check (true);
create policy "service_all_webhooks" on public.webhooks for all to service_role using (true) with check (true);
create policy "service_all_access" on public.access for all to service_role using (true) with check (true);

-- STORAGE
-- Create bucket 'images' and set it public if you want public URLs:
-- In the Storage UI: New Bucket -> name: images -> Public: Yes.
-- Or use SQL (if necessary):
-- select storage.create_bucket('images', true, 'public');
