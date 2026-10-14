import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import db, { distanceMeters, getUploadDir, type SessionRow } from "@/lib/db";

type AttendanceBody = {
  code?: string; studentId?: number; photo?: string;
  latitude?: number; longitude?: number; accuracy?: number;
};

export async function POST(request: Request) {
  const body = await request.json() as AttendanceBody;
  if (!body.code || !body.studentId || !body.photo || typeof body.latitude !== "number" || typeof body.longitude !== "number" || typeof body.accuracy !== "number") {
    return Response.json({ error: "Data absensi belum lengkap." }, { status: 400 });
  }
  const session = db.prepare("SELECT * FROM sessions WHERE code = ?").get(body.code.toUpperCase()) as SessionRow | undefined;
  if (!session) return Response.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  const now = new Date();
  if (!session.active || now < new Date(session.starts_at) || now > new Date(session.ends_at)) {
    return Response.json({ error: "Sesi absensi tidak sedang aktif." }, { status: 400 });
  }
  const student = db.prepare("SELECT id, name FROM students WHERE id = ? AND class_name = ? AND active = 1").get(body.studentId, session.class_name) as { id: number; name: string } | undefined;
  if (!student) return Response.json({ error: "Siswa tidak terdaftar pada kelas ini." }, { status: 400 });
  const duplicate = db.prepare("SELECT id FROM attendance WHERE session_id = ? AND student_id = ?").get(session.id, student.id);
  if (duplicate) return Response.json({ error: "Nama ini sudah melakukan absensi pada sesi ini." }, { status: 409 });

  const match = body.photo.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return Response.json({ error: "Format foto tidak valid." }, { status: 400 });
  const image = Buffer.from(match[1], "base64");
  if (image.length > 2_500_000) return Response.json({ error: "Ukuran foto terlalu besar." }, { status: 400 });

  let distance: number | null = null;
  if (session.latitude !== null && session.longitude !== null) {
    distance = distanceMeters(body.latitude, body.longitude, session.latitude, session.longitude);
  }
  let status = now > new Date(session.late_at) ? "Terlambat" : "Hadir";
  if (distance !== null && distance > session.radius_m) status = "Di luar area";
  const filename = `${session.id}-${student.id}-${crypto.randomUUID()}.jpg`;
  const photoPath = path.join(getUploadDir(), filename);
  fs.writeFileSync(photoPath, image);
  try {
    db.prepare(`INSERT INTO attendance
      (session_id, student_id, submitted_at, status, latitude, longitude, accuracy, distance_m, photo_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(session.id, student.id, now.toISOString(), status, body.latitude, body.longitude, body.accuracy, distance, filename);
  } catch (error) {
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    if (error instanceof Error && error.message.includes("UNIQUE")) return Response.json({ error: "Nama ini sudah melakukan absensi pada sesi ini." }, { status: 409 });
    throw error;
  }
  return Response.json({ ok: true, submittedAt: now.toISOString(), status, studentName: student.name });
}
