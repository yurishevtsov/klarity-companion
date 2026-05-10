import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";

const DEMO_PATIENTS = ["jane", "marcus", "jordan"] as const;

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function patientIdsBySlug(): Promise<Record<string, string>> {
  const { data, error } = await insforgeServer.database
    .from("patients")
    .select("id, slug")
    .in("slug", DEMO_PATIENTS as unknown as string[]);
  if (error) throw new Error(`patients lookup failed: ${error.message}`);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ id: string; slug: string }>) {
    if (row.slug) out[row.slug] = row.id;
  }
  return out;
}

export async function POST() {
  let ids: Record<string, string>;
  try {
    ids = await patientIdsBySlug();
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }

  const allIds = Object.values(ids);
  if (allIds.length === 0) {
    return NextResponse.json({ ok: false, error: "No demo patients found" }, { status: 404 });
  }

  // Wipe in dependency order (clinician_notes → calls → chat_messages).
  // Cascades on patients FK handle most of this, but we want to keep patient rows.
  await insforgeServer.database
    .from("clinician_notes")
    .delete()
    .in("patient_id", allIds);
  await insforgeServer.database
    .from("calls")
    .delete()
    .in("patient_id", allIds);
  await insforgeServer.database
    .from("chat_messages")
    .delete()
    .in("patient_id", allIds);

  const summary: Record<string, number> = {};

  // Jane — clean low-risk demo exchange (per PLAN.md runbook).
  // Includes a provider reply so the demo also shows the human-in-the-loop
  // turn alongside the AI coach reply.
  if (ids.jane) {
    const janeSessionId = randomUUID();
    const janeMsgs = [
      {
        patient_id: ids.jane,
        session_id: janeSessionId,
        role: "user",
        content: "I literally cannot start these emails. Been staring at my screen for 40 min.",
        created_at: isoMinutesAgo(20),
      },
      {
        patient_id: ids.jane,
        session_id: janeSessionId,
        role: "assistant",
        content:
          "Lower the bar to laughable. Three rules:\n\n- Pick the **shortest** email — easiest sender wins.\n- Type the messiest reply you can. Typos welcome.\n- *90 seconds max.* Hit send.\n\nOnce one is gone the rest unstick themselves. Want me to set a 5-min timer when you start?",
        created_at: isoMinutesAgo(19),
      },
      {
        patient_id: ids.jane,
        session_id: janeSessionId,
        role: "provider",
        content:
          "Hi Jane — Dr. Reyes. I reviewed your coach session. The 'lower the bar' approach is a recognized behavioral activation strategy and consistent with our treatment plan. Try it for the next few days. If you notice the avoidance pattern spreading to other tasks, message back so we can adjust before your next visit.",
        created_at: isoMinutesAgo(8),
      },
    ];
    const { error } = await insforgeServer.database.from("chat_messages").insert(janeMsgs);
    if (error) {
      return NextResponse.json(
        { ok: false, error: `seed jane failed: ${error.message}` },
        { status: 500 }
      );
    }
    summary.jane_messages = janeMsgs.length;
  }

  // Marcus — high-risk flagged exchange for the safety demo contrast
  if (ids.marcus) {
    const marcusSessionId = randomUUID();
    const flags = ["suicidal_ideation", "medication_misuse", "risk:high"];
    const marcusMsgs = [
      {
        patient_id: ids.marcus,
        session_id: marcusSessionId,
        role: "user",
        content:
          "Honestly I haven't been doing well. I've been thinking about hurting myself and I've been hoarding pills.",
        flags,
        created_at: isoMinutesAgo(34),
      },
      {
        patient_id: ids.marcus,
        session_id: marcusSessionId,
        role: "assistant",
        content:
          "I'm flagging this for your provider Dr. Reyes right now. This is urgent — please call or text 988 if you're in crisis. I'm here with you, and Dr. Reyes will reach out today.",
        flags,
        created_at: isoMinutesAgo(33),
      },
    ];
    const { error } = await insforgeServer.database.from("chat_messages").insert(marcusMsgs);
    if (error) {
      return NextResponse.json(
        { ok: false, error: `seed marcus failed: ${error.message}` },
        { status: 500 }
      );
    }
    summary.marcus_messages = marcusMsgs.length;
  }

  // Jordan — left clean (no chat activity). Demonstrates a fresh "OK / quiet" state.
  if (ids.jordan) {
    summary.jordan_messages = 0;
  }

  return NextResponse.json({
    ok: true,
    patients: Object.keys(ids),
    summary,
    note: "Demo data restored: Jane clean coach exchange + provider reply, Marcus high-risk flagged, Jordan quiet.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "demo/reset",
    method: "POST to restore demo state",
  });
}
