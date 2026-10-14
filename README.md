# Hadirin — Absensi Siswa

Aplikasi absensi sederhana untuk satu sekolah/guru. Guru membuat sesi dan membagikan link. Siswa memilih nama, mengambil foto, mengirim lokasi, lalu hasil muncul di dashboard.

## Fitur versi live

- Dashboard dilindungi PIN admin
- Buat dan tutup sesi absensi
- Link unik per sesi
- Siswa memilih nama dari daftar kelas
- Foto kamera dan lokasi GPS
- Status otomatis hadir/terlambat/di luar area
- Pencegahan absensi ganda per siswa dan sesi
- Pembaruan dashboard setiap 5 detik
- Guru dapat melihat foto dan lokasi
- Guru dapat mengubah status
- Ekspor laporan CSV
- SQLite dan penyimpanan foto lokal di VPS

## Menjalankan secara lokal

```powershell
copy .env.example .env.local
npm install
npm run dev
```

Buka `http://localhost:3000`. PIN awal dari `.env.example` adalah `123456`. Ganti PIN dan `AUTH_SECRET` sebelum live.

## Data siswa

Data awal berisi 42 siswa kelas 9J dari workbook daftar hadir sekolah. Daftarnya disimpan di `src/data/students-9j.ts`. Untuk mengganti data sebelum database dipakai, perbarui file tersebut, hapus folder `data`, lalu jalankan aplikasi kembali.

## Deployment VPS

Persyaratan: Ubuntu 22.04/24.04, Node.js 20 atau lebih baru, Nginx, domain, dan HTTPS.

```bash
npm ci
cp .env.example .env.production
npm run build
npm run start
```

Gunakan PM2 agar aplikasi terus berjalan:

```bash
npm install -g pm2
pm2 start npm --name hadirin -- start
pm2 save
pm2 startup
```

Contoh Nginx:

```nginx
server {
  server_name absen.domainsekolah.id;

  client_max_body_size 4M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Aktifkan HTTPS dengan Certbot. Kamera dan GPS siswa tidak akan bekerja melalui HTTP biasa (kecuali `localhost`).

## Data dan backup

Semua data berada di direktori `DATA_DIR`:

- `hadirin.db` — database
- `uploads/` — foto siswa

Backup seluruh folder tersebut secara rutin. Folder harus dapat ditulis oleh user yang menjalankan aplikasi. Jangan menjalankan lebih dari satu instance aplikasi terhadap satu file SQLite.

## Catatan keamanan

- Wajib mengganti `ADMIN_PIN` dan `AUTH_SECRET`.
- Wajib menggunakan HTTPS.
- Jangan membagikan link dashboard/PIN kepada siswa.
- Pemilihan nama dibuat sesuai kebutuhan versi sederhana; foto digunakan guru untuk memeriksa identitas.
- Tentukan kebijakan penghapusan foto sesuai aturan privasi sekolah.
