import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db from "@/lib/db";

const validStatuses = ["Hadir", "Terlambat", "Di luar area", "Izin", "Sakit"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const { id } = await params;
  const { status } = await request.json() as { status?: string };
  if (!status || !validStatuses.includes(status)) return Response.json({ error: "Status tidak valid." }, { status: 400 });
  db.prepare("UPDATE attendance SET status = ? WHERE id = ?").run(status, Number(id));
  return Response.json({ ok: true });
}
