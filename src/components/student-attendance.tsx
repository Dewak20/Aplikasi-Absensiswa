"use client";

import Image from "next/image";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  Info,
  LocateFixed,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SCHOOL_NAME } from "@/data/students-9j";

type LocationState = { latitude: number; longitude: number; accuracy: number } | null;
type Student = { id: number; nis: string; name: string; attendanceNo: number };
type Session = {
  code: string;
  subject: string;
  className: string;
  teacher: string;
  startsAt: string;
  lateAt: string;
  endsAt: string;
  radiusM: number;
  usesRadius: boolean;
  state: "active" | "closed" | "expired" | "upcoming";
};

type Result = { submittedAt: string; status: string; studentName: string };

export function StudentAttendance({ sessionCode }: { sessionCode: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const identityRef = useRef<HTMLElement>(null);
  const cameraRef = useRef<HTMLElement>(null);
  const locationRef = useRef<HTMLElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState("");
  const [location, setLocation] = useState<LocationState>(null);
  const [cameraError, setCameraError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${encodeURIComponent(sessionCode)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Sesi tidak dapat dibuka.");
        if (!cancelled) {
          setSession(data.session);
          setStudents(data.students);
          setSecondsLeft(Math.max(0, Math.floor((Date.parse(data.session.endsAt) - Date.now()) / 1000)));
          setLoading(false);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setPageError(error.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [sessionCode]);

  useEffect(() => {
    if (!session || session.state !== "active") return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [cameraActive]);

  const selectedStudent = students.find((student) => student.id === studentId);
  const sessionActive = session?.state === "active" && secondsLeft > 0;
  const canSubmit = Boolean(studentId && photo && location && sessionActive);
  const completedSteps = Number(Boolean(studentId)) + Number(Boolean(photo)) + Number(Boolean(location));
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }

  function chooseStudent(value: number) {
    setStudentId(value);
    setSubmitError("");
    if (value) scrollTo(cameraRef);
  }

  async function startCamera() {
    setCameraError("");
    if (!studentId) {
      scrollTo(identityRef);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser ini tidak mendukung kamera. Gunakan Chrome atau Safari terbaru.");
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = media;
      setCameraActive(true);
    } catch {
      setCameraError("Izin kamera belum diberikan. Tekan ikon gembok di browser, izinkan Kamera, lalu coba lagi.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      setCameraError("Kamera belum siap. Tunggu sebentar lalu tekan Ambil foto kembali.");
      return;
    }
    const scale = Math.min(1, 800 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.72));
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    scrollTo(locationRef);
  }

  function retakePhoto() {
    setPhoto("");
    void startCamera();
  }

  function getLocation() {
    setLocationError("");
    if (!photo) {
      scrollTo(cameraRef);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Perangkat ini tidak mendukung GPS.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
        setIsLocating(false);
      },
      () => {
        setLocationError("Lokasi belum dapat dibaca. Aktifkan GPS, izinkan Lokasi di browser, lalu coba lagi.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function submitAttendance() {
    if (!canSubmit || !location) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode, studentId, photo, ...location }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Absensi gagal dikirim.");
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Absensi gagal dikirim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <PortalFrame><section className="student-loading-card"><div className="student-loader" /><h1>Menyiapkan absensi</h1><p>Tunggu sebentar, data kelas sedang dimuat.</p></section></PortalFrame>;
  }

  if (pageError || !session) {
    return <PortalFrame><section className="student-unavailable-card"><span><AlertCircle /></span><h1>Link tidak dapat dibuka</h1><p>{pageError || "Sesi tidak ditemukan."}</p><small>Periksa kembali link dari guru atau minta link yang baru.</small></section></PortalFrame>;
  }

  if (result) {
    return <PortalFrame><SuccessScreen result={result} session={session} location={location} /></PortalFrame>;
  }

  const startLabel = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(session.startsAt));
  const endLabel = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(session.endsAt));

  return (
    <PortalFrame>
      <section className="student-mobile-hero">
        <div className="student-live-row">
          <span className={sessionActive ? "student-live-badge" : "student-closed-badge"}><i /> {sessionActive ? "Sesi aktif" : "Sesi ditutup"}</span>
          <span className="student-countdown"><Clock3 size={14} /> {sessionActive ? `Sisa ${countdown}` : "Waktu habis"}</span>
        </div>
        <p className="student-kicker">ABSENSI KELAS {session.className}</p>
        <h1>{session.subject}</h1>
        <p className="student-hero-meta">{startLabel}–{endLabel} WITA <i /> {session.teacher}</p>
        <div className="student-hero-code"><span>Kode sesi</span><strong>{session.code}</strong></div>
      </section>

      {!sessionActive && (
        <section className="student-session-warning"><AlertCircle size={21} /><div><strong>Absensi tidak dapat dikirim</strong><p>{session.state === "upcoming" ? "Sesi ini belum dimulai. Tunggu arahan guru." : "Waktu absensi sudah berakhir. Hubungi guru jika kamu belum absen."}</p></div></section>
      )}

      <section className="student-howto">
        <div className="student-howto-title"><Smartphone size={18} /><div><strong>Cara mengisi absensi</strong><p>Selesaikan 3 langkah berikut. Hanya membutuhkan sekitar 1 menit.</p></div></div>
        <div className="student-stepper" aria-label={`${completedSteps} dari 3 langkah selesai`}>
          <StepBubble number={1} label="Pilih nama" done={Boolean(studentId)} active={!studentId} />
          <i className={studentId ? "done" : ""} />
          <StepBubble number={2} label="Foto wajah" done={Boolean(photo)} active={Boolean(studentId && !photo)} />
          <i className={photo ? "done" : ""} />
          <StepBubble number={3} label="Ambil lokasi" done={Boolean(location)} active={Boolean(photo && !location)} />
        </div>
      </section>

      <div className="student-flow">
        <section ref={identityRef} className={`student-flow-card ${studentId ? "is-complete" : "is-active"}`}>
          <FlowHeading number={1} title="Pilih nama kamu" description="Cari namamu pada daftar siswa kelas 9J." done={Boolean(studentId)} />
          <div className="student-select-wrap">
            <UserRound size={19} />
            <select aria-label="Pilih nama siswa" value={studentId} onChange={(event) => chooseStudent(Number(event.target.value))} disabled={!sessionActive}>
              <option value={0}>Pilih nama lengkap...</option>
              {students.map((student) => <option key={student.id} value={student.id}>No. {String(student.attendanceNo).padStart(2, "0")} — {student.name}</option>)}
            </select>
            <ChevronDown size={18} />
          </div>
          {selectedStudent ? (
            <div className="student-identity-confirm"><span>{String(selectedStudent.attendanceNo).padStart(2, "0")}</span><div><small>PASTIKAN DATA INI BENAR</small><strong>{selectedStudent.name}</strong><p>No. Absen {String(selectedStudent.attendanceNo).padStart(2, "0")} • NIS {selectedStudent.nis} • Kelas {session.className}</p></div><CheckCircle2 size={22} /></div>
          ) : <p className="student-helper"><Info size={14} /> Jangan memilih nama teman. Foto akan diperiksa oleh guru.</p>}
        </section>

        <section ref={cameraRef} className={`student-flow-card ${photo ? "is-complete" : studentId ? "is-active" : "is-locked"}`}>
          <FlowHeading number={2} title="Ambil foto wajah" description="Posisikan wajah di tengah dan pastikan tempat cukup terang." done={Boolean(photo)} />
          {!studentId ? <LockedStep text="Pilih nama terlebih dahulu untuk mengaktifkan kamera." /> : (
            <>
              <div className="student-new-camera">
                {photo ? <Image src={photo} alt="Foto wajah untuk absensi" fill unoptimized /> : cameraActive ? <video ref={videoRef} playsInline muted /> : <div className="student-camera-empty"><span><Camera size={32} /></span><strong>Kamera siap digunakan</strong><p>Browser akan meminta izin akses kamera.</p></div>}
                {cameraActive && !photo && <div className="student-new-face-guide"><span>Posisikan wajah di sini</span></div>}
                {photo && <span className="student-photo-ok"><CheckCircle2 size={16} /> Foto siap</span>}
              </div>
              {cameraError && <ErrorMessage text={cameraError} />}
              {!cameraActive && !photo && <button className="student-action-button" onClick={startCamera}><Camera size={19} /> Buka kamera</button>}
              {cameraActive && <button className="student-action-button" onClick={takePhoto}><Camera size={19} /> Ambil foto sekarang</button>}
              {photo && <button className="student-outline-action" onClick={retakePhoto}><RotateCcw size={17} /> Ambil foto ulang</button>}
              <canvas ref={canvasRef} hidden />
            </>
          )}
        </section>

        <section ref={locationRef} className={`student-flow-card ${location ? "is-complete" : photo ? "is-active" : "is-locked"}`}>
          <FlowHeading number={3} title="Konfirmasi lokasi" description="Lokasi digunakan sekali sebagai bukti kehadiran." done={Boolean(location)} />
          {!photo ? <LockedStep text="Ambil foto terlebih dahulu untuk melanjutkan." /> : (
            <>
              <div className={`student-new-location ${location ? "has-location" : ""}`}>
                <span>{location ? <CheckCircle2 size={31} /> : <MapPin size={31} />}</span>
                {location ? <><strong>Lokasi berhasil ditemukan</strong><p>Akurasi GPS sekitar ±{Math.round(location.accuracy)} meter</p>{session.usesRadius && <small>Radius yang diizinkan: {session.radiusM} meter</small>}</> : <><strong>GPS belum diambil</strong><p>Aktifkan lokasi/GPS pada ponsel, kemudian tekan tombol di bawah.</p></>}
              </div>
              {locationError && <ErrorMessage text={locationError} />}
              <button className={location ? "student-outline-action" : "student-action-button"} onClick={getLocation} disabled={isLocating}>
                {isLocating ? <><RefreshCw className="student-spin" size={18} /> Sedang mencari lokasi...</> : <><LocateFixed size={19} /> {location ? "Perbarui lokasi" : "Ambil lokasi saya"}</>}
              </button>
              <p className="student-privacy-line"><ShieldCheck size={15} /> Lokasi tidak dilacak setelah absensi dikirim.</p>
            </>
          )}
        </section>
      </div>

      {submitError && <div className="student-submit-alert" role="alert"><AlertCircle size={18} /><div><strong>Absensi belum terkirim</strong><p>{submitError}</p></div></div>}

      <section className="student-final-card">
        <div className="student-final-copy"><span>{completedSteps}/3 langkah selesai</span><strong>{canSubmit ? "Semua data sudah lengkap" : "Lengkapi semua langkah"}</strong><p>{canSubmit ? "Periksa sekali lagi, lalu kirim absensi." : "Tombol kirim aktif setelah nama, foto, dan lokasi lengkap."}</p></div>
        <button className="student-send-button" disabled={!canSubmit || isSubmitting} onClick={submitAttendance}>
          {isSubmitting ? <><RefreshCw className="student-spin" size={19} /> Mengirim...</> : <><CheckCircle2 size={20} /> Kirim absensi</>}
        </button>
      </section>

      <p className="student-support"><ShieldCheck size={14} /> Data hanya dapat dilihat oleh guru • Butuh bantuan? Hubungi wali kelas.</p>
    </PortalFrame>
  );
}

function PortalFrame({ children }: { children: React.ReactNode }) {
  return <div className="student-portal-new"><header className="student-topnav"><div className="student-topnav-inner"><div className="student-new-brand"><span><GraduationCap size={22} /></span><div><strong>Hadirin</strong><small>{SCHOOL_NAME}</small></div></div><span className="student-safe"><ShieldCheck size={15} /> Aman & terenkripsi</span></div></header><main className="student-new-main">{children}</main><footer className="student-new-footer">© 2026 {SCHOOL_NAME} • Sistem Absensi Siswa</footer></div>;
}

function StepBubble({ number, label, done, active }: { number: number; label: string; done: boolean; active: boolean }) {
  return <div className={`${done ? "done" : ""} ${active ? "active" : ""}`}><span>{done ? <Check size={15} /> : number}</span><strong>{label}</strong></div>;
}

function FlowHeading({ number, title, description, done }: { number: number; title: string; description: string; done: boolean }) {
  return <div className="student-flow-heading"><span className="student-flow-number">{done ? <Check size={17} /> : number}</span><div><h2>{title}</h2><p>{description}</p></div>{done && <b><CheckCircle2 size={15} /> Selesai</b>}</div>;
}

function LockedStep({ text }: { text: string }) {
  return <div className="student-locked-step"><ShieldCheck size={21} /><p>{text}</p></div>;
}

function ErrorMessage({ text }: { text: string }) {
  return <div className="student-inline-error" role="alert"><AlertCircle size={16} /><p>{text}</p></div>;
}

function SuccessScreen({ result, session, location }: { result: Result; session: Session; location: LocationState }) {
  return <section className="student-new-success"><div className="student-success-check"><Check size={43} /></div><span className="student-success-label">ABSENSI BERHASIL</span><h1>Terima kasih, {result.studentName.split(" ")[0]}!</h1><p>Kehadiranmu sudah tercatat dan dapat dilihat oleh guru.</p><div className="student-success-ticket"><div className="student-success-person"><span>{initials(result.studentName)}</span><div><strong>{result.studentName}</strong><p>Kelas {session.className} • {session.subject}</p></div></div><div className="student-ticket-grid"><div><span>Status</span><strong className={result.status === "Hadir" ? "good" : "warning"}>{result.status}</strong></div><div><span>Waktu</span><strong>{new Date(result.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WITA</strong></div><div><span>Kode sesi</span><strong>{session.code}</strong></div><div><span>Lokasi</span><strong>{location ? `Akurasi ±${Math.round(location.accuracy)} m` : "Tersimpan"}</strong></div></div></div><div className="student-success-proof"><span><CheckCircle2 size={17} /> Foto tersimpan</span><span><CheckCircle2 size={17} /> Lokasi tersimpan</span></div><div className="student-success-note"><Info size={17} /><p>Simpan halaman ini sebagai bukti. Kamu sudah boleh menutup browser.</p></div></section>;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
}
