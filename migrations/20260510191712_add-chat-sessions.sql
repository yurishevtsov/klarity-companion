-- Chat sessions: group chat_messages into discrete conversations.
-- Also extend the role check to allow 'provider' (clinician replies into chat).

-- 1. Add session_id column (nullable for backfill)
alter table chat_messages
  add column session_id uuid;

-- 2. Backfill: every existing message for a given patient gets the same
--    session_id. Effectively: 'all prior history is one continuous session.'
update chat_messages cm
set session_id = sub.session_id
from (
  select patient_id, gen_random_uuid() as session_id
  from chat_messages
  group by patient_id
) sub
where cm.patient_id = sub.patient_id
  and cm.session_id is null;

-- 3. Make NOT NULL
alter table chat_messages
  alter column session_id set not null;

-- 4. Index for grouping queries
create index chat_messages_patient_session_idx
  on chat_messages (patient_id, session_id, created_at);

-- 5. Allow 'provider' as a role (clinician replies)
alter table chat_messages
  drop constraint if exists chat_messages_role_check;
alter table chat_messages
  add constraint chat_messages_role_check
  check (role in ('user', 'assistant', 'system', 'provider'));
