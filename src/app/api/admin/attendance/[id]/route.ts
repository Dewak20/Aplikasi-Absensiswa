import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import { getUploadDir } from "@/lib/db";

const validStatuses = ["Hadir", "Terlambat", "Di luar area", "Izin", "Sakit"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const { id } = await params;
  const { status } = await request.json() as { status?: string };
  if (!status || !validStatuses.includes(status)) return Response.json({ error: "Status tidak valid." }, { status: 400 });
  db.prepare("UPDATE attendance SET status = ? WHERE id = ?").run(status, Number(id));
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const { id } = await params;
  const record = db.prepare("SELECT photo_file AS photoFile FROM attendance WHERE id = ?").get(Number(id)) as { photoFile: string } | undefined;
  if (!record) return Response.json({ error: "Record tidak ditemukan." }, { status: 404 });
  db.prepare("DELETE FROM attendance WHERE id = ?").run(Number(id));
  const file = path.join(getUploadDir(), path.basename(record.photoFile));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return Response.json({ ok: true });
}
