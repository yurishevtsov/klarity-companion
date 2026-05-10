import { NextResponse } from "next/server";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";

type LogBody = {
  path: string;
  ip?: string;
  user_agent?: string;
  referrer?: string;
};

/**
 * Receives access entries from the routing middleware. Best-effort write —
 * any error is logged server-side but never surfaced.
 */
export async function POST(req: Request) {
  let body: LogBody;
  try {
    body = (await req.json()) as LogBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.path) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await insforgeServer.database.from("access_log").insert([
    {
      path: body.path,
      ip: body.ip ?? null,
      user_agent: body.user_agent ?? null,
      referrer: body.referrer ?? null,
    },
  ]);

  if (error) {
    // Best-effort — log but always return 200 so middleware retries don't pile up.
    console.error("[log-access] insert failed", error);
  }

  return NextResponse.json({ ok: true });
}
