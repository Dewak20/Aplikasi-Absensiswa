"use client";

import Image from "next/image";
import {
  CalendarDays, CheckCircle2, Clock3, Copy, Download, ExternalLink, Eye, Link2,
  LocateFixed, LockKeyhole, MapPin, Moon, Plus, RefreshCw, Sun,
  Trash2, UserRoundCheck, UsersRound, X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Student = { id: number; nis: string; name: string };
type RecordRow = { id: number; studentId: number; name: string; nis: string; submittedAt: string; status: string; accuracy: number; distanceM: number | null; latitude: number; longitude: number };
type SessionState = "Aktif" | "Terjadwal" | "Selesai" | "Ditutup";
type Session = { code: string; subject: string; className: string; period: string; teacher: string; startsAt: string; lateAt: string; endsAt: string; active: boolean; state: SessionState; radiusM: number };
type SessionListItem = Pick<Session, "code" | "subject" | "className" | "period" | "startsAt" | "endsAt" | "active" | "state"> & { attendanceCount: number; lateCount: number };
type DashboardData = { session: Session | null; sessions: SessionListItem[]; students: Student[]; records: RecordRow[] };

function baliToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<DashboardData>({ session: null, sessions: [], students: [], records: [] });
  const [selectedCode, setSelectedCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [period, setPeriod] = useState<"Pagi" | "Siang">("Pagi");
  const [subject, setSubject] = useState("Absen Pagi");
  const [className, setClassName] = useState("9J");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [lateTime, setLateTime] = useState("07:10");
  const [endTime, setEndTime] = useState("07:20");
  const [useLocation, setUseLocation] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<RecordRow | null>(null);

  const load = useCallback(async (code?: string) => {
    const query = code ? `?code=${encodeURIComponent(code)}` : "";
    const response = await fetch(`/api/admin/dashboard${query}`, { cache: "no-store" });
    if (response.status === 401) { setAuthorized(false); return; }
    if (response.ok) {
      const result = await response.json() as DashboardData;
      setData(result);
      if (result.session) setSelectedCode(result.session.code);
      setAuthorized(true);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { setDate(baliToday()); void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!authorized) return; const timer = window.setInterval(() => void load(selectedCode || undefined), 5000); return () => window.clearInterval(timer); }, [authorized, load, selectedCode]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoginError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const result = await response.json();
    if (!response.ok) { setLoginError(result.error); return; }
    setPin(""); await load();
  }

  function choosePeriod(value: "Pagi" | "Siang") {
    setPeriod(value); setSubject(`Absen ${value}`);
    if (value === "Pagi") { setStartTime("07:00"); setLateTime("07:10"); setEndTime("07:20"); }
    else { setStartTime("13:00"); setLateTime("13:10"); setEndTime("13:20"); }
  }

  function pickLocation() {
    if (!navigator.geolocation) { setMessage("Perangkat tidak mendukung GPS."); return; }
    navigator.geolocation.getCurrentPosition(({ coords: current }) => { setCoords({ latitude: current.latitude, longitude: current.longitude }); setMessage("Lokasi pusat berhasil diambil."); }, () => setMessage("Lokasi tidak dapat diambil."), { enableHighAccuracy: true });
  }

  async function createSession(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/admin/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, className, period, date, startTime, lateTime, endTime, latitude: useLocation ? coords?.latitude : null, longitude: useLocation ? coords?.longitude : null, radiusM: 150 }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error); return; }
    setShowCreate(false); setMessage(`Sesi ${period.toLowerCase()} berhasil dijadwalkan.`); setSelectedCode(result.code); await load(result.code);
  }

  async function closeSession() {
    if (!data.session || !confirm("Tutup sesi ini sekarang? Siswa tidak bisa mengirim lagi.")) return;
    await fetch("/api/admin/sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: data.session.code, active: false }) });
    await load(data.session.code);
  }

  async function deleteRecord(record: RecordRow) {
    if (!confirm(`Hapus absensi ${record.name}? Foto dan datanya akan dihapus permanen, lalu siswa dapat absen ulang.`)) return;
    const response = await fetch(`/api/admin/attendance/${record.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error); return; }
    setSelectedPhoto(null); setMessage(`Record ${record.name} berhasil dihapus.`); await load(selectedCode);
  }

  async function deleteSession() {
    if (!data.session || !confirm(`Hapus sesi ${data.session.period} tanggal ${formatDate(data.session.startsAt)}? Sesi hanya dapat dihapus jika tidak memiliki record.`)) return;
    const response = await fetch(`/api/admin/sessions?code=${encodeURIComponent(data.session.code)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error); return; }
    setMessage("Sesi kosong berhasil dihapus."); setSelectedCode(""); await load();
  }

  async function changeStatus(id: number, status: string) {
    await fetch(`/api/admin/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load(selectedCode);
  }

  const sessionUrl = data.session && typeof window !== "undefined" ? `${window.location.origin}/hadir/${data.session.code}` : "";
  const attended = data.records.length;
  const late = data.records.filter((record) => record.status === "Terlambat").length;
  const outside = data.records.filter((record) => record.status === "Di luar area").length;
  const missing = Math.max(0, data.students.length - attended);
  const actualState = data.session?.state || "Ditutup";

  if (authorized === null) return <div className="admin-login-page"><RefreshCw className="student-spin" /></div>;
  if (!authorized) return <div className="admin-login-page"><form className="admin-login-card" onSubmit={login}><span className="admin-login-icon"><LockKeyhole /></span><p className="eyebrow">HADIRIN ADMIN</p><h1>Masuk ke dashboard</h1><p>Masukkan PIN untuk mengelola sesi dan melihat kehadiran.</p><label>PIN Admin<input type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="••••••" autoFocus /></label>{loginError && <div className="admin-form-error">{loginError}</div>}<button className="primary-button">Masuk</button></form></div>;

  return <AppShell>
    <header className="topbar"><div><p className="eyebrow">ABSENSI KELAS 9J</p><h1>Absensi harian</h1><p className="subtitle">Sesi pagi dan siang tersimpan rapi berdasarkan tanggal.</p></div><div className="admin-header-actions"><button className="outline-button" onClick={() => void load(selectedCode)}><RefreshCw size={16} /> Segarkan</button><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16} /> Jadwalkan sesi</button></div></header>
    <main className="dashboard-content admin-organized">
      {message && <div className="admin-message">{message}<button onClick={() => setMessage("")}><X size={14} /></button></div>}

      <section className="admin-history-panel">
        <div className="admin-history-head"><div><CalendarDays size={19} /><span><strong>Riwayat sesi</strong><small>{data.sessions.length} sesi tersimpan</small></span></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={15} /> Baru</button></div>
        <div className="admin-session-list">{data.sessions.map((item) => {
          const state = item.state;
          return <button key={item.code} className={item.code === selectedCode ? "selected" : ""} onClick={() => { setSelectedCode(item.code); void load(item.code); }}><span className={`admin-period-icon ${item.period.toLowerCase()}`}>{item.period === "Siang" ? <Moon size={17} /> : <Sun size={17} />}</span><span className="admin-session-list-copy"><strong>{item.period} • {formatDate(item.startsAt)}</strong><small>{formatTime(item.startsAt)}–{formatTime(item.endsAt)} WITA • {item.attendanceCount}/42 hadir</small></span><span className={`admin-session-state ${state.toLowerCase()}`}>{state}</span></button>;
        })}{data.sessions.length === 0 && <div className="admin-history-empty">Belum ada sesi. Jadwalkan absensi pagi pertama.</div>}</div>
      </section>

      {data.session ? <>
        <section className="session-banner admin-current-session"><div className="session-icon">{data.session.period === "Siang" ? <Moon size={24} /> : <Sun size={24} />}</div><div className="session-copy"><div className="session-heading"><span>Absen {data.session.period} • {formatDate(data.session.startsAt)}</span><span className={`admin-session-state ${actualState.toLowerCase()}`}>{actualState}</span></div><p>{formatTime(data.session.startsAt)}–{formatTime(data.session.endsAt)} WITA • Terlambat setelah {formatTime(data.session.lateAt)} WITA</p></div><div className="session-code"><small>Kode sesi</small><strong>{data.session.code}</strong></div><div className="admin-session-actions"><button className="outline-button" onClick={() => navigator.clipboard.writeText(sessionUrl)}><Copy size={15} /> Salin link</button><a className="outline-button admin-link-button" href={`/hadir/${data.session.code}`} target="_blank"><ExternalLink size={15} /> Buka</a>{actualState === "Aktif" && <button className="admin-danger-button" onClick={closeSession}>Tutup</button>}<button className="admin-delete-session" title="Hapus sesi kosong" onClick={deleteSession}><Trash2 size={15} /></button></div></section>
        <section className="stats-grid" aria-label="Ringkasan"><article className="stat-card"><div className="stat-icon green"><UserRoundCheck size={22} /></div><p>Sudah absen</p><strong>{attended} <span>/ {data.students.length} siswa</span></strong><div className="progress"><i style={{ width: `${data.students.length ? attended / data.students.length * 100 : 0}%` }} /></div></article><article className="stat-card"><div className="stat-icon amber"><Clock3 size={22} /></div><p>Terlambat</p><strong>{late} <span>siswa</span></strong></article><article className="stat-card"><div className="stat-icon red"><UsersRound size={22} /></div><p>Belum absen</p><strong>{missing} <span>siswa</span></strong></article><article className="stat-card"><div className="stat-icon blue"><MapPin size={22} /></div><p>Di luar area</p><strong>{outside} <span>siswa</span></strong></article></section>
        <section className="panel attendance-panel"><div className="panel-head table-head"><div><h2>Hasil absen {data.session.period.toLowerCase()}</h2><p>{formatDate(data.session.startsAt)} • {attended} dari {data.students.length} siswa</p></div><a className="outline-button admin-link-button" href={`/api/admin/export?code=${data.session.code}`}><Download size={16} /> Ekspor CSV</a></div><div className="table-wrap"><table><thead><tr><th>Siswa</th><th>Waktu</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id}><td><div className="student-cell"><span className="avatar blue">{initials(record.name)}</span><div><strong>{record.name}</strong><small>NIS {record.nis}</small></div></div></td><td>{formatTime(record.submittedAt)} WITA</td><td>{record.distanceM === null ? `Akurasi ±${Math.round(record.accuracy)} m` : `${Math.round(record.distanceM)} m dari titik`}</td><td><select className="admin-status-select" value={record.status} onChange={(event) => changeStatus(record.id, event.target.value)}><option>Hadir</option><option>Terlambat</option><option>Di luar area</option><option>Izin</option><option>Sakit</option></select></td><td><div className="admin-row-actions"><button className="admin-view-button" onClick={() => setSelectedPhoto(record)}><Eye size={14} /> Bukti</button><button className="admin-record-delete" onClick={() => void deleteRecord(record)} title="Hapus record"><Trash2 size={14} /></button></div></td></tr>)}{data.records.length === 0 && <tr><td colSpan={5} className="admin-no-data">Belum ada siswa yang mengirim absensi pada sesi ini.</td></tr>}</tbody></table></div></section>
        {missing > 0 && <section className="panel admin-missing"><div className="panel-head"><div><h2>Belum absen ({missing})</h2><p>Daftar siswa yang belum tercatat pada sesi ini</p></div></div><div className="admin-missing-list">{data.students.filter((student) => !data.records.some((record) => record.studentId === student.id)).map((student) => <span key={student.id}>{student.name}<small>{student.nis}</small></span>)}</div></section>}
      </> : <section className="admin-empty"><Link2 /><h2>Belum ada sesi</h2><p>Jadwalkan sesi pagi atau siang untuk mulai mencatat kehadiran.</p><button className="primary-button" onClick={() => setShowCreate(true)}>Jadwalkan sesi</button></section>}
    </main>

    {showCreate && <div className="admin-modal-backdrop"><form className="admin-modal admin-schedule-modal" onSubmit={createSession}><button type="button" className="admin-modal-close" onClick={() => setShowCreate(false)}><X /></button><h2>Jadwalkan absensi</h2><p>Atur jam WITA. Link dapat dibagikan sekarang dan otomatis aktif sesuai jadwal.</p><div className="admin-period-picker"><button type="button" className={period === "Pagi" ? "active" : ""} onClick={() => choosePeriod("Pagi")}><Sun size={19} /><span><strong>Pagi</strong><small>Rekomendasi 07.00–07.20</small></span></button><button type="button" className={period === "Siang" ? "active" : ""} onClick={() => choosePeriod("Siang")}><Moon size={19} /><span><strong>Siang</strong><small>Atur sesuai jam pulang</small></span></button></div><div className="admin-form-grid"><label>Nama sesi<input value={subject} onChange={(event) => setSubject(event.target.value)} required /></label><label>Kelas<input value={className} onChange={(event) => setClassName(event.target.value)} required /></label><label className="admin-full-field">Tanggal<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Mulai<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></label><label>Batas terlambat<input type="time" value={lateTime} onChange={(event) => setLateTime(event.target.value)} required /></label><label>Berakhir<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required /></label></div><div className="admin-time-summary"><Clock3 size={17} /><span>Siswa dapat mengirim pada <strong>{date ? new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" }) : "tanggal terpilih"}, {startTime}–{endTime} WITA</strong></span></div><label className="admin-checkbox"><input type="checkbox" checked={useLocation} onChange={(event) => setUseLocation(event.target.checked)} /> Batasi radius 150 meter dari lokasi guru</label>{useLocation && <button type="button" className="outline-button admin-location-button" onClick={pickLocation}><LocateFixed size={16} /> {coords ? "Lokasi pusat siap" : "Ambil lokasi pusat"}</button>}<button className="primary-button admin-create-submit" disabled={useLocation && !coords}><CheckCircle2 size={17} /> Simpan jadwal</button></form></div>}
    {selectedPhoto && <div className="admin-modal-backdrop" onClick={() => setSelectedPhoto(null)}><div className="admin-photo-modal" onClick={(event) => event.stopPropagation()}><button onClick={() => setSelectedPhoto(null)}><X /></button><Image src={`/api/admin/photos/${selectedPhoto.id}`} alt={`Foto ${selectedPhoto.name}`} width={800} height={700} unoptimized /><strong>{selectedPhoto.name}</strong><a href={`https://www.google.com/maps?q=${selectedPhoto.latitude},${selectedPhoto.longitude}`} target="_blank">Lihat lokasi di Google Maps</a><button className="admin-delete-from-photo" onClick={() => void deleteRecord(selectedPhoto)}><Trash2 size={15} /> Hapus record tes</button></div></div>}
  </AppShell>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)).replace(".", ":"); }
function initials(name: string) { return name.split(" ").map((word) => word[0]).slice(0, 2).join(""); }
