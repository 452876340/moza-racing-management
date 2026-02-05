
create table if not exists logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  action text not null,
  details text,
  tournament_name text
);

-- Enable RLS
alter table logs enable row level security;

-- Create policy to allow authenticated users to read/insert
create policy "Allow authenticated read access" on logs for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert access" on logs for insert with check (auth.role() = 'authenticated');
