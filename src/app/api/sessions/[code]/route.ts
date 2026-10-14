import db, { type SessionRow } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = db.prepare("SELECT * FROM sessions WHERE code = ?").get(code.toUpperCase()) as SessionRow | undefined;
  if (!session) return Response.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  const students = db.prepare(`SELECT id, nis, name FROM students
    WHERE class_name = ? AND active = 1 ORDER BY name`).all(session.class_name);
  const now = Date.now();
  const state = !session.active ? "closed" : now < Date.parse(session.starts_at) ? "upcoming" : now > Date.parse(session.ends_at) ? "expired" : "active";
  return Response.json({
    session: {
      code: session.code, subject: session.subject, className: session.class_name, period: session.period,
      teacher: session.teacher, startsAt: session.starts_at, lateAt: session.late_at,
      endsAt: session.ends_at, radiusM: session.radius_m, usesRadius: session.latitude !== null,
      state,
    },
    students,
  });
}
