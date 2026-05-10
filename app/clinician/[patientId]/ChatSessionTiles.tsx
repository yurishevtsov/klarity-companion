"use client";

import { useState, useMemo, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Prose } from "@/components/prose";
import { cn } from "@/lib/utils";
import type { ChatRow, ChatSessionSummary } from "@/lib/chat";

type Props = {
  patientId: string;
  sessions: ChatSessionSummary[];
  // History rows (already filtered for excludePrivate on the server)
  messages: ChatRow[];
};

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function isFlaggedRow(row: ChatRow): boolean {
  return (row.flags ?? []).some((f) => f.startsWith("risk:") && f !== "risk:low");
}

export default function ChatSessionTiles({
  patientId,
  sessions,
  messages,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group non-private messages by session_id once.
  const messagesBySession = useMemo(() => {
    const map = new Map<string, ChatRow[]>();
    for (const m of messages) {
      if (!m.session_id) continue;
      const list = map.get(m.session_id) ?? [];
      list.push(m);
      map.set(m.session_id, list);
    }
    return map;
  }, [messages]);

  if (sessions.length === 0) {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        No chat activity yet. Patient hasn&apos;t started a session.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {sessions.map((s) => {
        const expanded = expandedId === s.id;
        const visible = messagesBySession.get(s.id) ?? [];
        return (
          <SessionTile
            key={s.id}
            patientId={patientId}
            session={s}
            messages={visible}
            expanded={expanded}
            onToggle={() =>
              setExpandedId((cur) => (cur === s.id ? null : s.id))
            }
          />
        );
      })}
    </ul>
  );
}

function SessionTile({
  patientId,
  session,
  messages,
  expanded,
  onToggle,
}: {
  patientId: string;
  session: ChatSessionSummary;
  messages: ChatRow[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fullyPrivate = session.all_private;
  const hiddenCount = session.message_count - messages.length;
  const cardFlagged = session.has_flags;

  async function submitReply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/clinician/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, sessionId: session.id, text }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setReply("");
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <li
      className={cn(
        "rounded-xl border bg-background/40 transition-colors",
        cardFlagged && "border-red-500/40 bg-red-500/5"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-xs hover:bg-accent/50"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {fullyPrivate && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
                title="Patient marked this entire session private — content is hidden from providers."
              >
                🔒 Private
              </span>
            )}
            {!fullyPrivate && hiddenCount > 0 && (
              <span
                className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
                title={`${hiddenCount} message${hiddenCount === 1 ? "" : "s"} marked private and hidden from this view.`}
              >
                {hiddenCount} hidden
              </span>
            )}
            {cardFlagged && (
              <span className="inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Risk
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-medium text-foreground">
            {fullyPrivate ? "Session content hidden by patient" : session.preview}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {formatRelative(session.last_at)} · {session.message_count} msg
          </p>
        </div>
        <span className="ml-2 text-muted-foreground">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && !fullyPrivate && (
        <div className="space-y-3 border-t bg-background/60 p-3">
          {messages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No visible messages in this session.
            </p>
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => {
                const flagged = isFlaggedRow(m);
                const userFlags = (m.flags ?? []).filter((f) => !f.startsWith("risk:"));
                const role = m.role;
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-lg border bg-background p-2.5 text-[11px] leading-relaxed",
                      flagged && "border-red-500/40 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "font-medium uppercase tracking-wide text-[10px]",
                          role === "provider"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {role === "provider" ? "Dr. Reyes (you)" : role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelative(m.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 text-foreground">
                      {role === "user" ? (
                        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</p>
                      ) : (
                        <Prose>{m.content}</Prose>
                      )}
                    </div>
                    {userFlags.length > 0 && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400">
                        flags: {userFlags.join(", ").replace(/_/g, " ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Provider reply box */}
          <form onSubmit={submitReply} className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reply as provider
            </p>
            <textarea
              ref={inputRef}
              rows={2}
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              placeholder="Send a note to this patient — appears in their next coach view."
              disabled={sending}
              className="w-full resize-none rounded-lg border bg-background px-2.5 py-2 text-[11px] outline-none ring-ring [overflow-wrap:anywhere] focus:ring-2 disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">
                Sent as <strong>Dr. Reyes</strong>. Visible to the patient on next reload.
              </p>
              <button
                type="submit"
                disabled={!reply.trim() || sending}
                className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-700 dark:text-red-400">{error}</p>
            )}
          </form>
        </div>
      )}
    </li>
  );
}
