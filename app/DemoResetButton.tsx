"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; summary: Record<string, number> }
  | { kind: "err"; message: string };

export default function DemoResetButton() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const router = useRouter();

  async function reset() {
    if (status.kind === "running") return;
    setStatus({ kind: "running" });
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setStatus({ kind: "err", message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setStatus({ kind: "ok", summary: json.summary });
      router.refresh();
    } catch (err) {
      setStatus({ kind: "err", message: String(err) });
    }
  }

  const label =
    status.kind === "running" ? "Restoring…" : "↻ Restore demo state";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={reset}
        disabled={status.kind === "running"}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-colors",
          "hover:bg-accent disabled:opacity-50"
        )}
        title="Wipes Jane / Marcus / Jordan back to canonical demo state"
      >
        {label}
      </button>
      {status.kind === "ok" && (
        <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
          ✓ Restored ({status.summary.jane_messages ?? 0} jane · {status.summary.marcus_messages ?? 0} marcus)
        </span>
      )}
      {status.kind === "err" && (
        <span className="text-[11px] text-red-700 dark:text-red-400">{status.message}</span>
      )}
    </div>
  );
}
