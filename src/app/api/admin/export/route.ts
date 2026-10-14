import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db, { type SessionRow } from "@/lib/db";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  const code = request.nextUrl.searchParams.get("code");
  const session = db.prepare("SELECT * FROM sessions WHERE code = ?").get(code) as SessionRow | undefined;
  if (!session) return Response.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  const rows = db.prepare(`SELECT s.attendance_no AS attendanceNo, s.nis, s.name, s.class_name AS className, a.status, a.submitted_at AS submittedAt,
    a.accuracy, a.distance_m AS distanceM, a.latitude, a.longitude FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id AND a.session_id = ?
    WHERE s.class_name = ? AND s.active = 1 ORDER BY s.attendance_no, s.name`).all(session.id, session.class_name) as Record<string, unknown>[];
  const headers = ["No. Absen", "NIS", "Nama", "Kelas", "Status", "Waktu", "Akurasi GPS (m)", "Jarak (m)", "Latitude", "Longitude"];
  const content = [headers.map(csv).join(","), ...rows.map((row) => [row.attendanceNo, row.nis, row.name, row.className, row.status || "Belum absen", row.submittedAt || "", row.accuracy || "", row.distanceM || "", row.latitude || "", row.longitude || ""].map(csv).join(","))].join("\r\n");
  return new Response(`\uFEFF${content}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="absensi-${session.code}.csv"` } });
}
