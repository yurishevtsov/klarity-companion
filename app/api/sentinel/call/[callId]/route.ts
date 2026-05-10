import { NextResponse } from "next/server";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";

type RouteCtx = {
  params: Promise<{ callId: string }>;
};

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { callId } = await ctx.params;
  if (!callId) {
    return NextResponse.json({ ok: false, error: "Missing call id" }, { status: 400 });
  }

  // Delete the linked SOAP/clinician_note first (no FK cascade configured).
  const { error: noteErr } = await insforgeServer
    .database
    .from("clinician_notes")
    .delete()
    .eq("source_ref", callId);
  if (noteErr) {
    console.warn("[call/delete] note cleanup failed", noteErr);
  }

  const { error: callErr } = await insforgeServer
    .database
    .from("calls")
    .delete()
    .eq("id", callId);
  if (callErr) {
    return NextResponse.json(
      { ok: false, error: callErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, deleted: callId });
}
