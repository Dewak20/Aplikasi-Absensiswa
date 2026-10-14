import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db, { getUploadDir } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const { id } = await params;
  const row = db.prepare("SELECT photo_file AS photoFile FROM attendance WHERE id = ?").get(Number(id)) as { photoFile: string } | undefined;
  if (!row) return Response.json({ error: "Foto tidak ditemukan." }, { status: 404 });
  const file = path.join(getUploadDir(), path.basename(row.photoFile));
  if (!fs.existsSync(file)) return Response.json({ error: "Berkas foto tidak ditemukan." }, { status: 404 });
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}
