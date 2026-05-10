"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type FormEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { Prose } from "@/components/prose";
import { cn } from "@/lib/utils";
import FocusOverlay, { type FocusState } from "./FocusOverlay";
import DemoDisclaimer from "./DemoDisclaimer";
import type { ChatSessionSummary } from "@/lib/chat";

type Props = {
  patientId: string;
  patientSlug: string;
  patientName: string;
  sessions: ChatSessionSummary[];
  activeSessionId: string;
  initialMessages: UIMessage[];
};

const FOCUS_TRIGGERS = ["/focus", "i need to lock in", "hyperfocus mode"];
const SESSION_LENGTH_SEC = 25 * 60;

function isFocusTrigger(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return FOCUS_TRIGGERS.some((t) => lower === t || lower.includes(t));
}

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// Best-effort uuid v4 in browser (modern browsers have crypto.randomUUID).
function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CoachChat({
  patientId,
  patientSlug,
  patientName,
  sessions,
  activeSessionId,
  initialMessages,
}: Props) {
  const [input, setInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const [focusState, setFocusState] = useState<FocusState | null>(null);
  const [privateMode, setPrivateMode] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(activeSessionId);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Sync into refs for the transport body.
  const focusRef = useRef<FocusState | null>(null);
  focusRef.current = focusState;
  const privateRef = useRef(privateMode);
  privateRef.current = privateMode;
  const sessionRef = useRef(currentSessionId);
  sessionRef.current = currentSessionId;

  // If parent re-renders with a new activeSessionId (URL change), sync local state.
  useEffect(() => {
    setCurrentSessionId(activeSessionId);
  }, [activeSessionId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/coach",
        body: () => {
          const fs = focusRef.current;
          const focusMode = fs?.phase === "running";
          const focusTask = fs?.phase === "running" ? fs.task : null;
          return {
            patientId,
            sessionId: sessionRef.current,
            focus_mode: focusMode,
            focus_task: focusTask,
            private: privateRef.current,
          };
        },
      }),
    [patientId]
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    messages: initialMessages,
  });

  function startNewSession() {
    const sid = newSessionId();
    setCurrentSessionId(sid);
    setMessages([]);
    router.replace(`/coach/${patientSlug}?session=${sid}`);
  }

  function switchSession(id: string) {
    if (id === currentSessionId) return;
    router.push(`/coach/${patientSlug}?session=${id}`);
  }

  async function clearChat() {
    if (clearing || status === "streaming") return;
    if (messages.length === 0) return;
    if (!window.confirm("Clear this session? This deletes all messages in it.")) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/coach/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, sessionId: currentSessionId }),
      });
      if (res.ok) {
        setMessages([]);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        window.alert(`Failed to clear: ${json.error ?? res.status}`);
      }
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status === "streaming" || status === "submitted") return;
    if (isFocusTrigger(trimmed)) {
      setFocusState({ phase: "picking" });
      setInput("");
      return;
    }
    sendMessage({ text: trimmed });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  return (
    <>
      <DemoDisclaimer />
      {focusState && (
        <FocusOverlay
          state={focusState}
          onPick={(task) =>
            setFocusState({
              phase: "running",
              task,
              startedAt: Date.now(),
              sessionLength: SESSION_LENGTH_SEC,
            })
          }
          onComplete={() =>
            setFocusState((s) =>
              s?.phase === "running" ? { phase: "break", task: s.task } : s
            )
          }
          onExit={() => setFocusState(null)}
        />
      )}

      <div className="flex flex-1 gap-4">
        {/* Sessions sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col gap-3 md:flex">
          <button
            type="button"
            onClick={startNewSession}
            className="rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
          >
            + New chat
          </button>

          <div className="flex flex-col gap-1 overflow-y-auto rounded-xl border bg-card p-2 shadow-sm">
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </p>
            {sessions.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">No prior chats.</p>
            )}
            {sessions.map((s) => {
              const active = s.id === currentSessionId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => switchSession(s.id)}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="truncate font-medium">
                    {s.preview || "(empty)"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{formatRelative(s.last_at)}</span>
                    <span>·</span>
                    <span>{s.message_count} msg</span>
                    {s.all_private && (
                      <>
                        <span>·</span>
                        <span>🔒</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          {/* Privacy disclosure banner */}
          <div
            className={cn(
              "mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-[11px] transition-colors",
              privateMode
                ? "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300"
                : "border-border bg-muted/40 text-muted-foreground"
            )}
          >
            <span className="leading-snug">
              {privateMode ? (
                <>🔒 Private mode — these messages are <strong>not shared</strong> with your provider.</>
              ) : (
                <>Your provider can see a summary of these chats for clinical assessment.</>
              )}
            </span>
            <button
              type="button"
              onClick={() => setPrivateMode((p) => !p)}
              aria-pressed={privateMode}
              className={cn(
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                privateMode
                  ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                  : "border border-border text-foreground hover:bg-accent"
              )}
            >
              {privateMode ? "Private · ON" : "Make private"}
            </button>
          </div>

          <div
            ref={scrollerRef}
            className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card p-5 shadow-sm"
          >
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Hi {patientName.split(" ")[0]}, I&apos;m your coach. What&apos;s on your mind?
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("");
              const meta = (m as UIMessage & { metadata?: { source?: string } })
                .metadata;
              const isProvider = meta?.source === "provider";
              const isUser = m.role === "user";
              const align = isUser ? "justify-end" : "justify-start";
              return (
                <div key={m.id} className={cn("flex", align)}>
                  <div
                    className={cn(
                      "max-w-[80%] overflow-hidden rounded-2xl px-4 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] [word-break:break-word]",
                      isUser
                        ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                        : isProvider
                          ? "border border-emerald-500/30 bg-emerald-500/5 text-foreground"
                          : "bg-muted text-foreground"
                    )}
                  >
                    {isProvider && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Dr. Reyes · provider
                      </p>
                    )}
                    {!text ? (
                      <span className="opacity-50">
                        {status === "streaming" || status === "submitted" ? "…" : ""}
                      </span>
                    ) : isUser ? (
                      text
                    ) : (
                      <Prose>{text}</Prose>
                    )}
                  </div>
                </div>
              );
            })}

            {(status === "submitted" || status === "streaming") &&
              messages.at(-1)?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground">
                    <span className="inline-block animate-pulse">…</span>
                  </div>
                </div>
              )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {error.message || "Something went wrong. Try again."}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && status !== "streaming" && status !== "submitted") {
                    e.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              placeholder="Type a message..."
              disabled={status === "streaming" || status === "submitted"}
              className="flex-1 resize-none rounded-xl border bg-background px-4 py-2 text-sm leading-relaxed outline-none ring-ring [overflow-wrap:anywhere] [word-break:break-word] focus:ring-2 disabled:opacity-50"
              style={{ maxHeight: "160px", minHeight: "40px" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || status === "streaming" || status === "submitted"}
              className="h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              Send
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Not a substitute for medical advice. In crisis, call or text 988.</span>
            <button
              type="button"
              onClick={clearChat}
              disabled={clearing || status === "streaming" || messages.length === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {clearing ? "clearing…" : "clear chat"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
