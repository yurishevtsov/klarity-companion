-- Lightweight access log for dev visibility. Captures every page view
-- so we can see when stakeholders open the demo. No PII beyond IP + UA.

create table access_log (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,
  ip          text,
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

create index access_log_created_idx
  on access_log (created_at desc);
