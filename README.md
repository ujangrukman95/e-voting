# 🗳️ SI-VOTE OSIS — Sistem E-Voting Pemilihan Ketua & Wakil Ketua OSIS

Aplikasi E-Voting Modern, Aman, Cepat, dan Berintegritas tinggi untuk Pemilihan Ketua & Wakil Ketua OSIS / MPK di tingkat SMP, SMA, SMK, dan Madrasah.

Dibangun dengan arsitektur **Full-Stack TypeScript** (React 19 + Tailwind CSS + Express.js), mendukung penyimpanan **Hybrid (Local JSON & Cloud Supabase PostgreSQL)** serta **Cloudinary Image Hosting**.

---

## 🌟 Fitur Utama Sistem

### 1. 🔒 Keamanan & Kerahasiaan Hak Suara (LUBER & JURDIL)
- **Asas Anonimitas Mutlak (Secret Ballot)**: Identitas pemilih dipisahkan secara struktural dari tabel surat suara (`votes`). Tidak ada pihak (termasuk Administrator) yang dapat melacak paslon mana yang dipilih oleh siswa tertentu.
- **Perlindungan Anti Double-Vote**: Server memvalidasi status pemilih secara *atomic* dan transaksional. Satu akun pemilih hanya memiliki satu kesempatan memberikan suara.
- **Autentikasi Token HMAC & Password Hash**: Password administrator dan PIN pemilih dienkripsi dengan algoritma bcrypt & HMAC.

### 2. 👥 Manajemen Pemilih / DPT Fleksibel
- **Format Bersih (Username & Password)**: Siswa, Guru, atau Staf masuk secara seragam menggunakan kredensial yang telah diterbitkan panitia.
- **Import / Export Excel (.xlsx / .csv)**: Tersedia template import otomatis untuk mengunggah ribuan data pemilih dalam hitungan detik.
- **Cetak Kartu Login / Hak Pilih**: Dilengkapi fitur cetak kartu pemilih siap gunting yang memuat nama, kelas, username, password, dan QR Code untuk login instan.
- **Filter & Pencarian Cepat**: Filter berdasarkan tingkatan kelas, jurusan, kategori (Siswa / Dewan Guru), dan status memilih.

### 3. 🎯 Manajemen Paslon & Cloudinary Media Hosting
- Nomor urut paslon, foto profil Ketua & Wakil Ketua.
- Visi, Misi berbasis daftar terstruktur, dan Program Kerja Unggulan.
- **Penyimpanan Foto 100% Cloudinary (Bukan Lokal)**: Seluruh foto paslon & logo sekolah diunggah langsung ke Cloudinary via Server API. Berkas foto tidak pernah disimpan di folder kode lokal, sehingga repository tetap ringan dan teratur.

### 4. 🗳️ Dua Metode Pelaksanaan Pemilihan (Voting Mode)
- **Metode 1: Di Bilik Suara (TPS Sekolah - Default)**: Siswa mendatangi bilik suara fisik di sekolah. QR Code link voting dipasang di bilik suara menggunakan **Poster Resmi A4 Siap Cetak** (lengkap dengan Kop Sekolah, logo, QR code besar, dan 4 tata cara memilih).
- **Metode 2: Online Mandiri (Bisa di Mana Saja)**: Siswa dapat memindai QR code unik pada Kartu Pemilih masing-masing untuk memberikan suara secara langsung dari mana saja.

### 4. 📊 Dashboard Rekapitulasi & Quick Count
- **Perolehan Suara Real-time**: Grafik perolehan suara paslon dan persentase partisipasi pemilih.
- **Pengaturan Visibilitas Suara**: Panitia dapat memilih hasil ditampilkan secara langsung (*Realtime*) atau disembunyikan sampai waktu pemilihan berakhir (*After Ended*).
- **Statistik Demografis**: Grafik partisipasi per kelas dan per jurusan.

### 5. 📑 Laporan & Berita Acara Resmi (Standar Kemendikbudristek)
- Cetak Berita Acara Pemilihan resmi lengkap dengan Kop Sekolah, Rekapitulasi Suara, persentase kehadiran, dan kolom tanda tangan Kepala Sekolah, Pembina OSIS, Ketua Panitia, serta Saksi Paslon.
- Ekspor seluruh laporan rekapitulasi ke format Excel dan PDF.

### 6. 📜 Audit Trail & Log Keamanan
- Pencatatan aktivitas administratif (buka/tutup bilik suara, tambah paslon, reset pemilihan) beserta alamat IP dan stempel waktu (*timestamp*).

---

## 🚀 Kredensial Default Administrator (Setelah Install)

| Role | Username | Password Default |
| :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` |

> ⚠️ **PENTING**: Segera perbarui password administrator pada menu **Pengaturan** setelah berhasil login pertama kali.

---

## 💻 Panduan Menjalankan Secara Lokal (Development)

### Prasyarat
- Node.js versi 18 ke atas
- npm atau yarn / bun

### Langkah Instalasi
```bash
# 1. Clone repository
git clone https://github.com/USERNAME_ANDA/NAMA_REPO.git
cd NAMA_REPO

# 2. Install dependensi
npm install

# 3. Jalankan server lokal
npm run dev
```
Akses aplikasi melalui peramban di `http://localhost:3000`.

---

## 🌐 Panduan Deployment (Hosting Produksi)

### Opsi 1: Deploy ke Vercel (Rekomendasi Terbaik)
1. Buat repository di GitHub dan push project ini ke GitHub.
2. Buka [Vercel Dashboard](https://vercel.com) dan pilih **Add New Project**.
3. Hubungkan repository GitHub Anda.
4. Di bagian **Environment Variables**, tambahkan:
   - `ADMIN_PASSWORD`: Password admin kustom (opsional)
   - `CLOUDINARY_CLOUD_NAME`: (Opsional jika menggunakan foto Cloud)
   - `CLOUDINARY_API_KEY`: (Opsional)
   - `CLOUDINARY_API_SECRET`: (Opsional)
   - `SUPABASE_URL`: (Opsional jika menghubungkan database PostgreSQL Supabase)
   - `SUPABASE_SERVICE_ROLE_KEY`: (Opsional)
5. Klik **Deploy**. File `vercel.json` yang disertakan akan otomatis mengonfigurasi routing serverless Express & Vite.

---

### Opsi 2: Deploy ke VPS / Railway / Render / Cloud Run (Docker / Node.js)
1. Siapkan server Ubuntu/Linux dengan Node.js.
2. Upload berkas project atau clone via Git.
3. Jalankan build:
   ```bash
   npm install
   npm run build
   ```
4. Jalankan menggunakan Process Manager (PM2):
   ```bash
   npm install -g pm2
   pm2 start "npm run start" --name "evoting-osis"
   pm2 save
   pm2 startup
   ```
5. Konfigurasi Nginx Reverse Proxy ke port `3000`.

---

### Opsi 3: Deploy ke Shared Hosting / cPanel (Database MySQL)
Bagi yang ingin menggunakan database MySQL tradisional:
1. Buat database baru di cPanel (**MySQL Databases**).
2. Buka **phpMyAdmin** dan Import berkas `database.sql` yang ada di root project ini.
3. Struktur tabel, trigger, dan relasi akan otomatis terbuat.

---

## 📁 Struktur Folder Project

```
├── data/
│   └── evoting_database.json   # Penyimpanan database lokal default
├── server/
│   ├── api.ts                  # REST API Express (Auth, Paslon, Siswa, Voting, Laporan)
│   ├── cloudinary.ts           # Integrasi upload & delete media Cloudinary
│   └── db.ts                   # Database driver (JSON/Supabase Hybrid)
├── src/
│   ├── components/             # Komponen UI React (Admin, Voting, Countdown, Login)
│   ├── utils/                  # Helper API, Supabase client, Print generator
│   ├── App.tsx                 # Root Component & Route switcher
│   └── types.ts                # TypeScript Interfaces & Data Models
├── database.sql                # Skema SQL untuk cPanel / MySQL / PostgreSQL
├── server.ts                   # Entrypoint Express + Vite Middleware
└── vercel.json                 # Konfigurasi deploy serverless Vercel
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Bebas digunakan dan dikembangkan untuk keperluan sekolah dan organisasi non-profit.
