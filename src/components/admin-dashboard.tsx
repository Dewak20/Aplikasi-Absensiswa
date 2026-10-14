"use client";

import Image from "next/image";
import { Clock3, Copy, Download, ExternalLink, Link2, LocateFixed, LockKeyhole, MapPin, Plus, RefreshCw, ShieldCheck, UserRoundCheck, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Student = { id: number; nis: string; name: string };
type RecordRow = { id: number; studentId: number; name: string; nis: string; submittedAt: string; status: string; accuracy: number; distanceM: number | null; latitude: number; longitude: number };
type Session = { code: string; subject: string; className: string; teacher: string; startsAt: string; lateAt: string; endsAt: string; active: boolean; radiusM: number };
type DashboardData = { session: Session | null; students: Student[]; records: RecordRow[] };

export function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<DashboardData>({ session: null, students: [], records: [] });
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("Matematika");
  const [className, setClassName] = useState("9J");
  const [duration, setDuration] = useState(30);
  const [lateMinutes, setLateMinutes] = useState(10);
  const [useLocation, setUseLocation] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<RecordRow | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    if (response.status === 401) { setAuthorized(false); return; }
    if (response.ok) { setData(await response.json()); setAuthorized(true); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!authorized) return; const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [authorized, load]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoginError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const result = await response.json();
    if (!response.ok) { setLoginError(result.error); return; }
    setPin(""); await load();
  }

  function pickLocation() {
    if (!navigator.geolocation) { setMessage("Perangkat tidak mendukung GPS."); return; }
    navigator.geolocation.getCurrentPosition(({ coords: current }) => { setCoords({ latitude: current.latitude, longitude: current.longitude }); setMessage("Lokasi pusat berhasil diambil."); }, () => setMessage("Lokasi tidak dapat diambil."), { enableHighAccuracy: true });
  }

  async function createSession(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/admin/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, className, duration, lateMinutes, latitude: useLocation ? coords?.latitude : null, longitude: useLocation ? coords?.longitude : null, radiusM: 150 }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error); return; }
    setShowCreate(false); setMessage("Sesi baru berhasil dibuat."); await load();
  }

  async function closeSession() {
    if (!data.session || !confirm("Tutup sesi absensi ini?")) return;
    await fetch("/api/admin/sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: data.session.code, active: false }) });
    await load();
  }

  async function changeStatus(id: number, status: string) {
    await fetch(`/api/admin/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  const sessionUrl = data.session && typeof window !== "undefined" ? `${window.location.origin}/hadir/${data.session.code}` : "";
  const attended = data.records.length;
  const late = data.records.filter((record) => record.status === "Terlambat").length;
  const outside = data.records.filter((record) => record.status === "Di luar area").length;
  const missing = Math.max(0, data.students.length - attended);

  if (authorized === null) return <div className="admin-login-page"><RefreshCw className="student-spin" /></div>;
  if (!authorized) return <div className="admin-login-page"><form className="admin-login-card" onSubmit={login}><span className="admin-login-icon"><LockKeyhole /></span><p className="eyebrow">HADIRIN ADMIN</p><h1>Masuk ke dashboard</h1><p>Masukkan PIN untuk mengelola sesi dan melihat kehadiran.</p><label>PIN Admin<input type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="••••••" autoFocus /></label>{loginError && <div className="admin-form-error">{loginError}</div>}<button className="primary-button">Masuk</button><small>PIN awal pengujian: 123456</small></form></div>;

  return <AppShell><header className="topbar"><div><p className="eyebrow">DASHBOARD GURU</p><h1>Kelola absensi kelas</h1><p className="subtitle">Data diperbarui otomatis setiap 5 detik.</p></div><div className="admin-header-actions"><button className="outline-button" onClick={() => void load()}><RefreshCw size={16} /> Segarkan</button><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16} /> Buat sesi</button></div></header><main className="dashboard-content">
    {message && <div className="admin-message">{message}<button onClick={() => setMessage("")}><X size={14} /></button></div>}
    {data.session ? <section className="session-banner"><div className="session-icon"><ShieldCheck size={25} /></div><div className="session-copy"><div className="session-heading"><span>{data.session.subject} • Kelas {data.session.className}</span><span className={data.session.active ? "live-pill" : "status absent"}><i /> {data.session.active ? "LIVE" : "DITUTUP"}</span></div><p>Berakhir {new Date(data.session.endsAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p></div><div className="session-code"><small>Kode sesi</small><strong>{data.session.code}</strong></div><button className="outline-button" onClick={() => navigator.clipboard.writeText(sessionUrl)}><Copy size={15} /> Salin link</button><a className="outline-button admin-link-button" href={`/hadir/${data.session.code}`} target="_blank"><ExternalLink size={15} /> Buka</a>{data.session.active && <button className="admin-danger-button" onClick={closeSession}>Tutup sesi</button>}</section> : <section className="admin-empty"><Link2 /><h2>Belum ada sesi</h2><p>Buat sesi untuk memperoleh link absensi siswa.</p><button className="primary-button" onClick={() => setShowCreate(true)}>Buat sesi pertama</button></section>}
    <section className="stats-grid" aria-label="Ringkasan"><article className="stat-card"><div className="stat-icon green"><UserRoundCheck size={22} /></div><p>Sudah absen</p><strong>{attended} <span>/ {data.students.length} siswa</span></strong><div className="progress"><i style={{ width: `${data.students.length ? attended / data.students.length * 100 : 0}%` }} /></div></article><article className="stat-card"><div className="stat-icon amber"><Clock3 size={22} /></div><p>Terlambat</p><strong>{late} <span>siswa</span></strong></article><article className="stat-card"><div className="stat-icon red"><UsersRound size={22} /></div><p>Belum absen</p><strong>{missing} <span>siswa</span></strong></article><article className="stat-card"><div className="stat-icon blue"><MapPin size={22} /></div><p>Di luar area</p><strong>{outside} <span>siswa</span></strong></article></section>
    <section className="panel attendance-panel"><div className="panel-head table-head"><div><h2>Kehadiran sesi terbaru</h2><p>{data.session ? `${data.session.subject} • Kelas ${data.session.className}` : "Belum ada data"}</p></div>{data.session && <a className="outline-button admin-link-button" href={`/api/admin/export?code=${data.session.code}`}><Download size={16} /> Ekspor CSV</a>}</div><div className="table-wrap"><table><thead><tr><th>Siswa</th><th>Waktu</th><th>Lokasi</th><th>Status</th><th>Bukti</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id}><td><div className="student-cell"><span className="avatar blue">{record.name.split(" ").map((word) => word[0]).slice(0,2).join("")}</span><div><strong>{record.name}</strong><small>NIS {record.nis}</small></div></div></td><td>{new Date(record.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td><td>{record.distanceM === null ? `Akurasi ±${Math.round(record.accuracy)} m` : `${Math.round(record.distanceM)} m dari titik`}</td><td><select className="admin-status-select" value={record.status} onChange={(event) => changeStatus(record.id, event.target.value)}><option>Hadir</option><option>Terlambat</option><option>Di luar area</option><option>Izin</option><option>Sakit</option></select></td><td><button className="admin-photo-button" onClick={() => setSelectedPhoto(record)}>Lihat foto</button></td></tr>)}{data.records.length === 0 && <tr><td colSpan={5} className="admin-no-data">Belum ada siswa yang mengirim absensi.</td></tr>}</tbody></table></div></section>
    {missing > 0 && <section className="panel admin-missing"><div className="panel-head"><div><h2>Belum absen ({missing})</h2><p>Siswa kelas {data.session?.className}</p></div></div><div className="admin-missing-list">{data.students.filter((student) => !data.records.some((record) => record.studentId === student.id)).map((student) => <span key={student.id}>{student.name}<small>{student.nis}</small></span>)}</div></section>}
  </main>
  {showCreate && <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={createSession}><button type="button" className="admin-modal-close" onClick={() => setShowCreate(false)}><X /></button><h2>Buat sesi absensi</h2><p>Link siswa akan dibuat otomatis setelah sesi disimpan.</p><div className="admin-form-grid"><label>Mata pelajaran<input value={subject} onChange={(event) => setSubject(event.target.value)} required /></label><label>Kelas<input value={className} onChange={(event) => setClassName(event.target.value)} required /></label><label>Durasi sesi (menit)<input type="number" min="5" max="180" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label><label>Batas terlambat (menit)<input type="number" min="0" value={lateMinutes} onChange={(event) => setLateMinutes(Number(event.target.value))} /></label></div><label className="admin-checkbox"><input type="checkbox" checked={useLocation} onChange={(event) => setUseLocation(event.target.checked)} /> Batasi radius 150 meter dari lokasi guru</label>{useLocation && <button type="button" className="outline-button admin-location-button" onClick={pickLocation}><LocateFixed size={16} /> {coords ? "Lokasi pusat siap" : "Ambil lokasi pusat"}</button>}<button className="primary-button admin-create-submit" disabled={useLocation && !coords}>Buat dan aktifkan sesi</button></form></div>}
  {selectedPhoto && <div className="admin-modal-backdrop" onClick={() => setSelectedPhoto(null)}><div className="admin-photo-modal" onClick={(event) => event.stopPropagation()}><button onClick={() => setSelectedPhoto(null)}><X /></button><Image src={`/api/admin/photos/${selectedPhoto.id}`} alt={`Foto ${selectedPhoto.name}`} width={800} height={700} unoptimized /><strong>{selectedPhoto.name}</strong><a href={`https://www.google.com/maps?q=${selectedPhoto.latitude},${selectedPhoto.longitude}`} target="_blank">Lihat lokasi di Google Maps</a></div></div>}
  </AppShell>;
}
