-- Coach privacy: per-message flag so the patient can mark a turn as
-- not-shared-with-provider. Default false preserves existing behavior
-- (everything visible to clinician dashboard) for already-stored rows.

alter table chat_messages
  add column private boolean not null default false;

-- Partial index for the common "show only shareable messages" query path.
create index chat_messages_patient_nonprivate_idx
  on chat_messages (patient_id, created_at desc)
  where private = false;
