import { insforgeServer } from "@/lib/insforge";

export type Med = { name: string; dose?: string; started_at?: string };

export type Patient = {
  id: string;
  slug: string | null;
  name: string;
  dob: string | null;
  conditions: string[];
  current_meds: Med[];
  phone: string | null;
  created_at: string;
};

const SLUG_RE = /^[a-z][a-z0-9-]{0,30}$/;

function isSlug(value: string): boolean {
  return SLUG_RE.test(value);
}

export async function getPatient(slugOrId: string): Promise<Patient | null> {
  const column = isSlug(slugOrId) ? "slug" : "id";
  const { data, error } = await insforgeServer
    .database
    .from("patients")
    .select("id, slug, name, dob, conditions, current_meds, phone, created_at")
    .eq(column, slugOrId)
    .limit(1);

  if (error) {
    console.error("[getPatient] insforge error", error);
    return null;
  }
  return (data?.[0] as Patient | undefined) ?? null;
}

export async function listPatients(): Promise<Patient[]> {
  const { data, error } = await insforgeServer
    .database
    .from("patients")
    .select("id, slug, name, dob, conditions, current_meds, phone, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("[listPatients] insforge error", error);
    return [];
  }
  return (data ?? []) as Patient[];
}
