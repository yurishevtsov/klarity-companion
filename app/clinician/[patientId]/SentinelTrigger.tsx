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
  | { kind: "web-connecting"; callId: string; deviceLabel: string | null }
  | { kind: "web-live"; callId: string; agentTalking: boolean; deviceLabel: string | null }
  | { kind: "ended"; callId: string }
  | { kind: "error"; message: string };

type AudioInput = {
  deviceId: string;
  label: string;
  isVirtual: boolean;
};

// Common virtual audio routing tools that appear as 'microphones' but capture
// nothing from a real microphone. We never auto-pick these.
const VIRTUAL_DEVICE_PATTERNS = [
  /blackhole/i,
  /soundflower/i,
  /loopback/i,
  /aggregate/i,
  /multi[- ]?output/i,
  /virtual/i,
  /vb-cable/i,
  /vb-audio/i,
];

function isVirtualDevice(label: string): boolean {
  return VIRTUAL_DEVICE_PATTERNS.some((re) => re.test(label));
}

async function listAudioInputs(): Promise<AudioInput[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  // Permissions must be granted *before* labels are populated. The caller
  // should request mic perm via getUserMedia first if they need real labels.
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "audioinput")
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
      isVirtual: d.label ? isVirtualDevice(d.label) : false,
    }));
}

function pickBestInput(inputs: AudioInput[], preferredId: string | null): AudioInput | null {
  if (inputs.length === 0) return null;
  if (preferredId) {
    const exact = inputs.find((i) => i.deviceId === preferredId);
    if (exact) return exact;
  }
  // Prefer real (non-virtual) devices, especially the system default.
  const real = inputs.filter((i) => !i.isVirtual);
  if (real.length > 0) return real[0];
  // Fall back to whatever is available.
  return inputs[0];
}

export default function SentinelTrigger({ patientId }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [micLevel, setMicLevel] = useState(0);
  const [inputs, setInputs] = useState<AudioInput[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
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

  async function ensureMicPermissionAndDevices(): Promise<{
    chosen: AudioInput | null;
    available: AudioInput[];
  }> {
    // Briefly grab mic to unlock device labels, then release.
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("[sentinel] getUserMedia failed", err);
      throw err;
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }

    const available = await listAudioInputs();
    setInputs(available);
    const chosen = pickBestInput(available, selectedInputId);
    if (chosen && chosen.deviceId !== selectedInputId) {
      setSelectedInputId(chosen.deviceId);
    }
    console.info(
      "[sentinel] audio inputs:",
      available.map((i) => `${i.label}${i.isVirtual ? " (virtual)" : ""}`)
    );
    if (chosen) console.info("[sentinel] selected input:", chosen.label);
    return { chosen, available };
  }

  async function trigger() {
    setState({ kind: "starting" });
    let chosen: AudioInput | null = null;
    try {
      const result = await ensureMicPermissionAndDevices();
      chosen = result.chosen;
    } catch (err) {
      setState({
        kind: "error",
        message:
          "Microphone permission denied or unavailable. Allow mic access for this site and retry.",
      });
      return;
    }

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
      setState({
        kind: "web-connecting",
        callId: json.call_id,
        deviceLabel: chosen?.label ?? null,
      });
      router.refresh();

      const client = new RetellWebClient();
      clientRef.current = client;

      client.on("call_started", () => {
        setState({
          kind: "web-live",
          callId: json.call_id,
          agentTalking: false,
          deviceLabel: chosen?.label ?? null,
        });
        startMicMeter(client);
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

      await client.startCall({
        accessToken: json.access_token,
        ...(chosen ? { captureDeviceId: chosen.deviceId } : {}),
      });
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
            <>
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
              {state.deviceLabel && (
                <p className="mt-1 truncate text-[10px] text-emerald-700/60 dark:text-emerald-400/60">
                  via {state.deviceLabel}
                </p>
              )}
            </>
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

  async function refreshInputs() {
    try {
      // Briefly request mic to unlock labels.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const available = await listAudioInputs();
      setInputs(available);
      if (!selectedInputId) {
        const best = pickBestInput(available, null);
        if (best) setSelectedInputId(best.deviceId);
      }
      setShowPicker(true);
    } catch (err) {
      console.warn("[sentinel] refreshInputs failed", err);
      setShowPicker(true); // still show picker so user can click 'allow'
    }
  }

  const currentInput = inputs.find((i) => i.deviceId === selectedInputId) ?? null;

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

      {/* Mic device picker — collapsed by default, expand if mic issues */}
      <div className="rounded-xl border bg-background/50 px-3 py-2 text-[11px]">
        {!showPicker ? (
          <button
            type="button"
            onClick={refreshInputs}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            🎤 Pick microphone
            {currentInput && (
              <span className="ml-1 text-muted-foreground/70">
                · using {currentInput.label}
              </span>
            )}
          </button>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Microphone
            </label>
            {inputs.length === 0 ? (
              <p className="text-muted-foreground">
                No mics found yet — click anywhere to grant permission, then reopen this picker.
              </p>
            ) : (
              <select
                value={selectedInputId ?? ""}
                onChange={(e) => setSelectedInputId(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1 text-[11px]"
              >
                {inputs.map((i) => (
                  <option key={i.deviceId} value={i.deviceId}>
                    {i.label}{i.isVirtual ? " (virtual — won't capture voice)" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-muted-foreground">
              Avoid &quot;BlackHole&quot;, &quot;Loopback&quot;, &quot;Aggregate&quot; — those are
              virtual routing devices, not actual microphones.
            </p>
          </div>
        )}
      </div>

      {state.kind === "error" && (
        <p className="text-[11px] text-red-700 dark:text-red-400">{state.message}</p>
      )}
    </div>
  );
}
