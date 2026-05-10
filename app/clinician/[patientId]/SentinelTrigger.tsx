"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  patientId: string;
  patientHasPhone: boolean;
};

type Status =
  | { kind: "idle" }
  | { kind: "calling" }
  | { kind: "success"; callId: string }
  | { kind: "error"; message: string };

export default function SentinelTrigger({ patientId, patientHasPhone }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const router = useRouter();

  async function trigger() {
    setStatus({ kind: "calling" });
    try {
      const res = await fetch("/api/sentinel/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const json = (await res.json()) as
        | { ok: true; call_id: string }
        | { ok: false; error: string };

      if (!res.ok || !("ok" in json) || !json.ok) {
        const message = (!json.ok ? json.error : "Sentinel call failed") || "Sentinel call failed";
        setStatus({ kind: "error", message });
        return;
      }
      setStatus({ kind: "success", callId: json.call_id });
      // Refresh server data so the new 'in_progress' call row appears.
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", message: String(err) });
    }
  }

  if (!patientHasPhone) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No phone on file — Sentinel can&apos;t dial out.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={trigger}
        disabled={status.kind === "calling"}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {status.kind === "calling" ? "Dialing…" : "Trigger Sentinel check-in"}
      </button>
      {status.kind === "success" && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
          Calling… ({status.callId.slice(0, 16)}…)
        </p>
      )}
      {status.kind === "error" && (
        <p className="text-[11px] text-red-700 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
