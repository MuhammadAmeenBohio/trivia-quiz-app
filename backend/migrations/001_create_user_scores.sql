create table if not exists user_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  highest_score integer not null default 0,
  updated_at timestamptz not null default now()
);