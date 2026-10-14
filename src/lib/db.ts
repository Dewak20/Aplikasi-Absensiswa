import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { CLASS_NAME, HOMEROOM_TEACHER, STUDENTS_9J } from "@/data/students-9j";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "hadirin.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nis TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    teacher TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    late_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    radius_m INTEGER NOT NULL DEFAULT 150,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    student_id INTEGER NOT NULL REFERENCES students(id),
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL NOT NULL,
    distance_m REAL,
    photo_file TEXT NOT NULL,
    note TEXT,
    UNIQUE(session_id, student_id)
  );
`);

const studentCount = db.prepare("SELECT COUNT(*) AS count FROM students").get() as { count: number };
if (studentCount.count === 0) {
  const insert = db.prepare("INSERT INTO students (nis, name, class_name) VALUES (?, ?, ?)");
  const seed = db.transaction(() => {
    STUDENTS_9J.forEach(({ nis, name }) => insert.run(nis, name, CLASS_NAME));
  });
  seed();
}

const sessionCount = db.prepare("SELECT COUNT(*) AS count FROM sessions").get() as { count: number };
if (sessionCount.count === 0) {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const late = new Date(now.getTime() + 10 * 60 * 1000);
  db.prepare(`INSERT INTO sessions
    (code, subject, class_name, teacher, starts_at, late_at, ends_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run("MTK-9J-241", "Matematika", CLASS_NAME, HOMEROOM_TEACHER, now.toISOString(), late.toISOString(), end.toISOString(), now.toISOString());
}

export type SessionRow = {
  id: number; code: string; subject: string; class_name: string; teacher: string;
  starts_at: string; late_at: string; ends_at: string; latitude: number | null;
  longitude: number | null; radius_m: number; active: number; created_at: string;
};

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getUploadDir() {
  const dir = path.join(dataDir, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export default db;
