import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  console.log("[retell-webhook] received", JSON.stringify(body).slice(0, 500));
  return NextResponse.json({ ok: true, stub: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "retell-webhook",
    status: "stub",
  });
}
