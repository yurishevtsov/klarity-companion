"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RetellWebClient } from "retell-client-js-sdk";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  patientHasPhone: boolean;
};

type State =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "phone-dialing"; callId: string }
  | { kind: "web-connecting"; callId: string }
  | { kind: "web-live"; callId: string; agentTalking: boolean }
  | { kind: "ended"; callId: string }
  | { kind: "error"; message: string };

export default function SentinelTrigger({ patientId }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [micLevel, setMicLevel] = useState(0);
  const clientRef = useRef<RetellWebClient | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Cleanup: hang up + stop polling on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.stopCall();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (micPollRef.current) clearInterval(micPollRef.current);
    };
  }, []);

  function startMicMeter(client: RetellWebClient) {
    if (micPollRef.current) clearInterval(micPollRef.current);
    micPollRef.current = setInterval(() => {
      try {
        const v = client.analyzerComponent?.calculateVolume?.() ?? 0;
        setMicLevel(v);
      } catch {
        // analyzer not ready yet — ignore
      }
    }, 80);
  }

  function stopMicMeter() {
    if (micPollRef.current) {
      clearInterval(micPollRef.current);
      micPollRef.current = null;
    }
    setMicLevel(0);
  }

  // After a call ends, poll for ~30s waiting for the SOAP note to arrive.
  // SOAP gen takes ~6s server-side; polling every 3s lands the update in <10s
  // without requiring true realtime infrastructure.
  function startPostCallPolling() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);

    router.refresh(); // immediate refresh so the 'in_progress' row flips to 'completed'

    pollIntervalRef.current = setInterval(() => {
      router.refresh();
    }, 3000);

    pollTimeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 30_000);
  }

  async function trigger() {
    setState({ kind: "starting" });
    try {
      const res = await fetch("/api/sentinel/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setState({ kind: "error", message: json.error || `HTTP ${res.status}` });
        return;
      }

      if (json.mode === "phone") {
        setState({ kind: "phone-dialing", callId: json.call_id });
        router.refresh();
        return;
      }

      // web mode — connect via browser
      setState({ kind: "web-connecting", callId: json.call_id });
      router.refresh();

      const client = new RetellWebClient();
      clientRef.current = client;

      client.on("call_started", () => {
        setState({ kind: "web-live", callId: json.call_id, agentTalking: false });
        startMicMeter(client);
        // Log selected device for debugging mic capture issues
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().then((devices) => {
            const inputs = devices.filter((d) => d.kind === "audioinput");
            console.info(
              "[sentinel] available audio inputs:",
              inputs.map((d) => `${d.label || "(unnamed)"} [${d.deviceId.slice(0, 8)}]`)
            );
          });
        }
      });
      client.on("agent_start_talking", () => {
        setState((s) =>
          s.kind === "web-live" ? { ...s, agentTalking: true } : s
        );
      });
      client.on("agent_stop_talking", () => {
        setState((s) =>
          s.kind === "web-live" ? { ...s, agentTalking: false } : s
        );
      });
      client.on("call_ended", () => {
        setState({ kind: "ended", callId: json.call_id });
        clientRef.current = null;
        stopMicMeter();
        startPostCallPolling();
      });
      client.on("error", (err: unknown) => {
        console.error("[retell-web-client] error", err);
        setState({ kind: "error", message: String(err) });
        try { client.stopCall(); } catch {}
        clientRef.current = null;
      });

      await client.startCall({ accessToken: json.access_token });
    } catch (err) {
      setState({ kind: "error", message: String(err) });
    }
  }

  function hangUp() {
    clientRef.current?.stopCall();
    clientRef.current = null;
    stopMicMeter();
    setState((s) =>
      s.kind === "web-live" || s.kind === "web-connecting"
        ? { kind: "ended", callId: "callId" in s ? s.callId : "" }
        : { kind: "idle" }
    );
    startPostCallPolling();
  }

  // Render
  if (state.kind === "web-live" || state.kind === "web-connecting") {
    // Mic level scaled into 8 bars. calculateVolume() typically returns 0..1
    // (sometimes higher with loud peaks). Clamp + bin into bars.
    const bars = 8;
    const filled = Math.min(bars, Math.max(0, Math.round(micLevel * bars * 1.4)));
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
            </span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {state.kind === "web-connecting" ? "Connecting…" : "Live call"}
            </span>
            {state.kind === "web-live" && state.agentTalking && (
              <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
                · agent speaking
              </span>
            )}
          </div>
          {state.kind === "web-live" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
                mic
              </span>
              <div className="flex flex-1 items-end gap-[2px]">
                {Array.from({ length: bars }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "block w-[3px] rounded-sm transition-all",
                      i < filled
                        ? "bg-emerald-500"
                        : "bg-emerald-500/15"
                    )}
                    style={{ height: `${4 + i * 1.5}px` }}
                  />
                ))}
              </div>
              <span className="text-[10px] tabular-nums text-emerald-700/60 dark:text-emerald-400/60">
                {filled === 0 ? "—" : `${Math.round(micLevel * 100)}`}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={hangUp}
          className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
        >
          Hang up
        </button>
        <p className="text-[10px] text-muted-foreground">
          Speak into your mic. If the bar above stays flat while you talk, your browser captured the wrong input device.
        </p>
      </div>
    );
  }

  if (state.kind === "phone-dialing") {
    return (
      <div className="space-y-2">
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          📞 Dialing… (your phone should ring)
        </p>
      </div>
    );
  }

  if (state.kind === "ended") {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Call ended. SOAP note generating below…
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium hover:bg-accent"
        >
          New call
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={trigger}
        disabled={state.kind === "starting"}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {state.kind === "starting" ? "Starting…" : "Trigger Sentinel check-in"}
      </button>
      {state.kind === "error" && (
        <p className="text-[11px] text-red-700 dark:text-red-400">{state.message}</p>
      )}
    </div>
  );
}
