"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  LogOut,
  MapPinned,
  Settings,
  UsersRound,
} from "lucide-react";

const menu = [
  { label: "Ringkasan", href: "/", icon: BarChart3 },
  { label: "Absen sekarang", href: "/absen", icon: ClipboardCheck },
  { label: "Siswa", href: "#siswa", icon: UsersRound },
  { label: "Jadwal kelas", href: "#jadwal", icon: CalendarDays },
  { label: "Area belajar", href: "#area", icon: MapPinned },
  { label: "Laporan", href: "#laporan", icon: BookOpenCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand"><span><GraduationCap size={24} /></span><strong>Hadir<span>in</span></strong></Link>
        <nav>
          <p className="nav-label">MENU UTAMA</p>
          {menu.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className={(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "active" : ""}><Icon size={19} /><span>{label}</span>{label === "Siswa" && <small>32</small>}</Link>
          ))}
          <p className="nav-label nav-secondary">PENGATURAN</p>
          <Link href="#pengaturan"><Settings size={19} /><span>Pengaturan</span></Link>
          <Link href="#bantuan"><CircleHelp size={19} /><span>Pusat bantuan</span></Link>
        </nav>
        <div className="sidebar-footer">
          <div className="school-card"><span className="school-logo">DW</span><div><strong>SMP Dharma Wiweka</strong><small>Tahun ajaran 2026/27</small></div></div>
          <button><LogOut size={18} /> Keluar</button>
        </div>
      </aside>
      <div className="page-area">{children}</div>
    </div>
  );
}
