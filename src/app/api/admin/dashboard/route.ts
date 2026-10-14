import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db, { type SessionRow } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Silakan masuk sebagai admin." }, { status: 401 });
  const requestedCode = request.nextUrl.searchParams.get("code");
  const sessions = db.prepare(`SELECT s.*,
    COUNT(a.id) AS attendance_count,
    SUM(CASE WHEN a.status = 'Terlambat' THEN 1 ELSE 0 END) AS late_count
    FROM sessions s LEFT JOIN attendance a ON a.session_id = s.id
    GROUP BY s.id ORDER BY s.starts_at DESC`).all() as (SessionRow & { attendance_count: number; late_count: number })[];
  const session = (requestedCode ? sessions.find((item) => item.code === requestedCode) : sessions[0]) as (SessionRow & { attendance_count: number; late_count: number }) | undefined;
  const sessionList = sessions.map((item) => ({
    code: item.code, subject: item.subject, className: item.class_name, period: item.period,
    startsAt: item.starts_at, endsAt: item.ends_at, active: Boolean(item.active),
    state: !item.active ? "Ditutup" : Date.now() < Date.parse(item.starts_at) ? "Terjadwal" : Date.now() > Date.parse(item.ends_at) ? "Selesai" : "Aktif",
    attendanceCount: item.attendance_count || 0, lateCount: item.late_count || 0,
  }));
  if (!session) return Response.json({ session: null, sessions: sessionList, students: [], records: [] });
  const students = db.prepare("SELECT id, nis, name, attendance_no AS attendanceNo FROM students WHERE class_name = ? AND active = 1 ORDER BY attendance_no, name").all(session.class_name);
  const records = db.prepare(`SELECT a.id, a.student_id AS studentId, s.name, s.nis, s.attendance_no AS attendanceNo,
    a.submitted_at AS submittedAt, a.status, a.accuracy, a.distance_m AS distanceM,
    a.latitude, a.longitude FROM attendance a JOIN students s ON s.id = a.student_id
    WHERE a.session_id = ? ORDER BY a.submitted_at DESC`).all(session.id);
  return Response.json({
    session: { code: session.code, subject: session.subject, className: session.class_name, period: session.period, teacher: session.teacher, startsAt: session.starts_at, lateAt: session.late_at, endsAt: session.ends_at, active: Boolean(session.active), state: !session.active ? "Ditutup" : Date.now() < Date.parse(session.starts_at) ? "Terjadwal" : Date.now() > Date.parse(session.ends_at) ? "Selesai" : "Aktif", radiusM: session.radius_m },
    sessions: sessionList, students, records,
  });
}
