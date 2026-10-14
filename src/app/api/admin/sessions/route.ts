import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db from "@/lib/db";
import { HOMEROOM_TEACHER } from "@/data/students-9j";

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const body = await request.json() as { subject?: string; className?: string; duration?: number; lateMinutes?: number; latitude?: number | null; longitude?: number | null; radiusM?: number };
  if (!body.subject?.trim() || !body.className?.trim()) return Response.json({ error: "Mata pelajaran dan kelas wajib diisi." }, { status: 400 });
  const now = new Date();
  const duration = Math.min(180, Math.max(5, Number(body.duration) || 30));
  const lateMinutes = Math.min(duration, Math.max(0, Number(body.lateMinutes) || 10));
  const code = `${body.subject.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "SES"}-${body.className.toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  db.prepare("UPDATE sessions SET active = 0 WHERE active = 1").run();
  db.prepare(`INSERT INTO sessions (code, subject, class_name, teacher, starts_at, late_at, ends_at, latitude, longitude, radius_m, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, body.subject.trim(), body.className.trim(), HOMEROOM_TEACHER, now.toISOString(), new Date(now.getTime() + lateMinutes * 60000).toISOString(), new Date(now.getTime() + duration * 60000).toISOString(), body.latitude ?? null, body.longitude ?? null, Math.max(20, Number(body.radiusM) || 150), now.toISOString());
  return Response.json({ ok: true, code });
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const { code, active } = await request.json() as { code?: string; active?: boolean };
  if (!code) return Response.json({ error: "Kode sesi wajib diisi." }, { status: 400 });
  db.prepare("UPDATE sessions SET active = ? WHERE code = ?").run(active ? 1 : 0, code);
  return Response.json({ ok: true });
}
