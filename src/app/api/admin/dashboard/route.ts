import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import db, { type SessionRow } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return Response.json({ error: "Silakan masuk sebagai admin." }, { status: 401 });
  const session = db.prepare("SELECT * FROM sessions ORDER BY id DESC LIMIT 1").get() as SessionRow | undefined;
  if (!session) return Response.json({ session: null, students: [], records: [] });
  const students = db.prepare("SELECT id, nis, name FROM students WHERE class_name = ? AND active = 1 ORDER BY name").all(session.class_name);
  const records = db.prepare(`SELECT a.id, a.student_id AS studentId, s.name, s.nis,
    a.submitted_at AS submittedAt, a.status, a.accuracy, a.distance_m AS distanceM,
    a.latitude, a.longitude FROM attendance a JOIN students s ON s.id = a.student_id
    WHERE a.session_id = ? ORDER BY a.submitted_at DESC`).all(session.id);
  return Response.json({
    session: { code: session.code, subject: session.subject, className: session.class_name, teacher: session.teacher, startsAt: session.starts_at, lateAt: session.late_at, endsAt: session.ends_at, active: Boolean(session.active), radiusM: session.radius_m },
    students, records,
  });
}
