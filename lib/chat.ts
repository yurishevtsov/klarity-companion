import type { UIMessage } from "ai";
import { insforgeServer } from "@/lib/insforge";

export type ChatRole = "user" | "assistant" | "system" | "provider";

export type ChatRow = {
  id: string;
  role: ChatRole;
  content: string;
  flags: string[];
  created_at: string;
  session_id?: string;
  private?: boolean;
};

type LoadHistoryOptions = {
  /**
   * If true, exclude messages the patient marked private. Use this for any
   * provider-facing surface (clinician dashboard, pre-visit brief). The
   * patient's own coach view should pass false so they always see their
   * full history.
   */
  excludePrivate?: boolean;
};

export async function loadHistory(
  patientId: string,
  limit = 50,
  opts: LoadHistoryOptions & { sessionId?: string } = {}
): Promise<ChatRow[]> {
  let query = insforgeServer
    .database
    .from("chat_messages")
    .select("id, role, content, flags, created_at, session_id, private")
    .eq("patient_id", patientId);

  if (opts.sessionId) {
    query = query.eq("session_id", opts.sessionId);
  }
  if (opts.excludePrivate) {
    query = query.eq("private", false);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[loadHistory] error", error);
    return [];
  }
  return (data ?? []) as ChatRow[];
}

export type ChatSessionSummary = {
  id: string;
  patient_id: string;
  started_at: string;
  last_at: string;
  message_count: number;
  preview: string;
  has_private: boolean;
  /** True only if EVERY message in the session is private. */
  all_private: boolean;
  has_flags: boolean;
};

/**
 * Lists sessions for a patient. Each session is a uuid grouping in
 * chat_messages — there's no separate sessions table. Summary fields
 * are computed by aggregating the messages.
 */
export async function loadSessions(patientId: string): Promise<ChatSessionSummary[]> {
  const { data, error } = await insforgeServer
    .database
    .from("chat_messages")
    .select("id, role, content, flags, created_at, session_id, private")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[loadSessions] error", error);
    return [];
  }

  const rows = (data ?? []) as ChatRow[];
  const bySession = new Map<string, ChatRow[]>();
  for (const r of rows) {
    if (!r.session_id) continue;
    const list = bySession.get(r.session_id) ?? [];
    list.push(r);
    bySession.set(r.session_id, list);
  }

  const sessions: ChatSessionSummary[] = [];
  for (const [sid, msgs] of bySession.entries()) {
    const firstUser = msgs.find((m) => m.role === "user");
    const last = msgs[msgs.length - 1];
    const allPrivate = msgs.every((m) => m.private);
    const hasPrivate = msgs.some((m) => m.private);
    const hasFlags = msgs.some(
      (m) => (m.flags ?? []).some((f) => f.startsWith("risk:") && f !== "risk:low")
    );
    const previewSource = firstUser ?? msgs[0];
    const preview = previewSource ? previewSource.content.slice(0, 80) : "(empty session)";
    sessions.push({
      id: sid,
      patient_id: patientId,
      started_at: msgs[0].created_at,
      last_at: last.created_at,
      message_count: msgs.length,
      preview,
      has_private: hasPrivate,
      all_private: allPrivate,
      has_flags: hasFlags,
    });
  }

  // Newest session first.
  sessions.sort((a, b) => b.last_at.localeCompare(a.last_at));
  return sessions;
}

export function rowsToUIMessages(rows: ChatRow[]): UIMessage[] {
  // Provider messages render in the patient's view as a special bubble (handled
  // by the client component) — we surface them as 'assistant' so they appear in
  // the conversation thread but tag them via metadata.
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant" || r.role === "provider")
    .map((r) => ({
      id: r.id,
      role: r.role === "user" ? "user" : "assistant",
      parts: [{ type: "text", text: r.content }],
      // Custom metadata so the renderer can tell provider replies from AI.
      metadata: { source: r.role },
    } as UIMessage));
}

export type RiskLevel = "low" | "medium" | "high";

export type RiskSummary = {
  level: RiskLevel;
  lastTouchpoint: string | null;
  totalMessages: number;
  recentRiskFlags: string[];
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getPatientRiskSummary(patientId: string): Promise<RiskSummary> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  // Risk summary surfaces in clinician dashboard — exclude private turns.
  const { data, error } = await insforgeServer
    .database
    .from("chat_messages")
    .select("flags, created_at")
    .eq("patient_id", patientId)
    .eq("private", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPatientRiskSummary] error", error);
    return { level: "low", lastTouchpoint: null, totalMessages: 0, recentRiskFlags: [] };
  }

  const rows = (data ?? []) as Array<{ flags: string[]; created_at: string }>;

  let level: RiskLevel = "low";
  const flagSet = new Set<string>();
  for (const r of rows) {
    for (const f of r.flags ?? []) {
      if (f.startsWith("risk:")) continue;
      flagSet.add(f);
    }
    const flags = r.flags ?? [];
    if (flags.includes("risk:high")) {
      level = "high";
      break; // can't get worse
    }
    if (flags.includes("risk:medium") && level === "low") {
      level = "medium";
    }
  }

  return {
    level,
    lastTouchpoint: rows[0]?.created_at ?? null,
    totalMessages: rows.length,
    recentRiskFlags: [...flagSet],
  };
}

export function isFlagged(flags: string[] | null | undefined): boolean {
  if (!flags) return false;
  return flags.some((f) => f.startsWith("risk:") && f !== "risk:low");
}
