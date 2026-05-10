import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    ok: true,
    stub: true,
    received: body,
    note: "Coach LLM streaming wires up in Phase 1.",
  });
}
