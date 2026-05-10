import type { UIMessage } from "ai";
import { insforgeServer } from "@/lib/insforge";

export type ChatRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  flags: string[];
  created_at: string;
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
  opts: LoadHistoryOptions = {}
): Promise<ChatRow[]> {
  let query = insforgeServer
    .database
    .from("chat_messages")
    .select("id, role, content, flags, created_at")
    .eq("patient_id", patientId);

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

export function rowsToUIMessages(rows: ChatRow[]): UIMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      parts: [{ type: "text", text: r.content }],
    }));
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
