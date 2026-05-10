-- Klarity Companion — demo seed data
-- 3 fixed patients for demo. Slug + name stable across reseeds.
-- Demo phone goes on Sarah only — she's the live-call demo subject.

insert into patients (slug, name, dob, conditions, current_meds, phone)
values
  (
    'sarah',
    'Sarah Chen',
    '1998-05-09',
    array['ADHD'],
    '[{"name":"Adderall XR","dose":"20mg","started_at":"2026-04-25"}]'::jsonb,
    '+12162011191'
  ),
  (
    'marcus',
    'Marcus Reed',
    '1992-05-09',
    array['ADHD','GAD'],
    '[{"name":"Vyvanse","dose":"30mg","started_at":"2026-01-15"},{"name":"Lexapro","dose":"10mg","started_at":"2025-09-01"}]'::jsonb,
    null
  ),
  (
    'jordan',
    'Jordan Patel',
    '2004-05-09',
    array['MDD'],
    '[{"name":"Wellbutrin XL","dose":"150mg","started_at":"2026-05-02"}]'::jsonb,
    null
  )
on conflict (slug) do nothing;
