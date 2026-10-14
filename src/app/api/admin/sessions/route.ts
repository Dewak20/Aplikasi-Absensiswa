import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db from "@/lib/db";
import { HOMEROOM_TEACHER } from "@/data/students-9j";

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const body = await request.json() as { subject?: string; className?: string; period?: string; date?: string; startTime?: string; lateTime?: string; endTime?: string; latitude?: number | null; longitude?: number | null; radiusM?: number };
  if (!body.subject?.trim() || !body.className?.trim() || !body.date || !body.startTime || !body.endTime) return Response.json({ error: "Nama, kelas, tanggal, serta waktu sesi wajib diisi." }, { status: 400 });
  const startsAt = new Date(`${body.date}T${body.startTime}:00+08:00`);
  const endsAt = new Date(`${body.date}T${body.endTime}:00+08:00`);
  const lateAt = new Date(`${body.date}T${body.lateTime || body.endTime}:00+08:00`);
  if ([startsAt, lateAt, endsAt].some((date) => Number.isNaN(date.getTime())) || endsAt <= startsAt || lateAt < startsAt || lateAt > endsAt) return Response.json({ error: "Urutan waktu tidak valid." }, { status: 400 });
  const now = new Date();
  const period = body.period === "Siang" ? "Siang" : "Pagi";
  const dateCode = body.date.replaceAll("-", "").slice(2);
  const code = `${period === "Pagi" ? "PG" : "SG"}-${body.className.toUpperCase()}-${dateCode}-${crypto.randomBytes(1).toString("hex").toUpperCase()}`;
  db.prepare(`INSERT INTO sessions (code, subject, class_name, teacher, starts_at, late_at, ends_at, latitude, longitude, radius_m, created_at, period)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, body.subject.trim(), body.className.trim(), HOMEROOM_TEACHER, startsAt.toISOString(), lateAt.toISOString(), endsAt.toISOString(), body.latitude ?? null, body.longitude ?? null, Math.max(20, Number(body.radiusM) || 150), now.toISOString(), period);
  return Response.json({ ok: true, code });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return Response.json({ error: "Kode sesi wajib diisi." }, { status: 400 });
  const session = db.prepare("SELECT id FROM sessions WHERE code = ?").get(code) as { id: number } | undefined;
  if (!session) return Response.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  const count = db.prepare("SELECT COUNT(*) AS count FROM attendance WHERE session_id = ?").get(session.id) as { count: number };
  if (count.count > 0) return Response.json({ error: "Hapus semua record absensi pada sesi ini terlebih dahulu." }, { status: 409 });
  db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
  return Response.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const { code, active } = await request.json() as { code?: string; active?: boolean };
  if (!code) return Response.json({ error: "Kode sesi wajib diisi." }, { status: 400 });
  db.prepare("UPDATE sessions SET active = ? WHERE code = ?").run(active ? 1 : 0, code);
  return Response.json({ ok: true });
}
