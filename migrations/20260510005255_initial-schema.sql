-- Klarity Companion — initial schema
-- 4 tables: patients, chat_messages, calls, clinician_notes
-- Hackathon scope: no RLS, no auth integration — backend uses service-role API key.

create table patients (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  name          text not null,
  dob           date,
  conditions    text[]   not null default '{}',
  current_meds  jsonb    not null default '[]'::jsonb,
  provider_id   uuid,
  phone         text,
  created_at    timestamptz not null default now()
);

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  flags       text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index chat_messages_patient_created_idx
  on chat_messages (patient_id, created_at desc);

create table calls (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  retell_call_id  text unique,
  scheduled_for   timestamptz,
  status          text not null default 'scheduled'
                  check (status in ('scheduled', 'in_progress', 'completed', 'failed')),
  transcript      text,
  recording_url   text,
  duration_sec    int,
  created_at      timestamptz not null default now()
);

create index calls_patient_created_idx
  on calls (patient_id, created_at desc);

create table clinician_notes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  source      text not null check (source in ('sentinel_call', 'coach_summary', 'pre_visit_brief')),
  source_ref  uuid,
  soap_note   jsonb not null,
  risk_level  text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  flags       text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index clinician_notes_patient_created_idx
  on clinician_notes (patient_id, created_at desc);
