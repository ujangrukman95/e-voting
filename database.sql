-- =========================================================================
-- SKRIP DATABASE E-VOTING PEMILIHAN KETUA & WAKIL KETUA OSIS
-- Sistem E-Voting Bersih, Aman, Cepat, LUBER & JURDIL
-- Kompatibel: PostgreSQL / Supabase SQL Editor & MySQL / MariaDB
-- =========================================================================

-- =========================================================================
-- BAGIAN 1: SKRIP POSTGRESQL & SUPABASE (Untuk Deploy Vercel + Supabase)
-- =========================================================================
-- Salin bagian ini ke SQL Editor di Dashboard Supabase Anda:

-- 1. TABEL: users (Administrator / Panitia KPU OSIS)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL: settings (Identitas Sekolah & Konfigurasi Pemilihan)
CREATE TABLE IF NOT EXISTS public.settings (
  id SERIAL PRIMARY KEY,
  school_name TEXT NOT NULL DEFAULT 'SMAN 1 Sukabumi',
  school_logo TEXT,
  school_address TEXT,
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  event_title TEXT NOT NULL DEFAULT 'PEMILIHAN KETUA & WAKIL KETUA OSIS',
  primary_color TEXT NOT NULL DEFAULT '#0891b2',
  footer_text TEXT,
  election_status TEXT NOT NULL DEFAULT 'ongoing' CHECK (election_status IN ('draft', 'ongoing', 'ended')),
  start_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_datetime TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 hour'),
  result_visibility TEXT NOT NULL DEFAULT 'realtime' CHECK (result_visibility IN ('hidden', 'after_ended', 'realtime')),
  enable_sound_effects BOOLEAN NOT NULL DEFAULT true,
  principal_name TEXT,
  principal_nip TEXT,
  committee_chair TEXT,
  chair_nis TEXT,
  osis_advisor TEXT,
  advisor_nip TEXT,
  committee_secretary TEXT,
  secretary_nis TEXT,
  witness_1_name TEXT,
  witness_2_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL: candidates (Pasangan Calon Ketua & Wakil Ketua OSIS)
CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  candidate_number INTEGER NOT NULL UNIQUE,
  chairman_name TEXT NOT NULL,
  chairman_photo TEXT,
  vice_chairman_name TEXT NOT NULL,
  vice_chairman_photo TEXT,
  vision TEXT NOT NULL,
  missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_programs JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL: students (Daftar Pemilih Tetap - Siswa & Dewan Guru)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nis TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  major TEXT NOT NULL DEFAULT 'Umum',
  username TEXT NOT NULL,
  pin TEXT NOT NULL,
  has_voted BOOLEAN NOT NULL DEFAULT false,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_has_voted ON public.students(has_voted);

-- 5. TABEL: votes (Surat Suara Masuk - RAHASIA / TANPA IDENTITAS SISWA)
-- PENTING: Untuk menjaga kerahasiaan hak pilih (Luber Jurdil), 
-- tabel votes TIDAK menyimpan id/nis siswa sama sekali.
CREATE TABLE IF NOT EXISTS public.votes (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_candidate ON public.votes(candidate_id);

-- 6. TABEL: audit_logs (Aktivitas Keamanan Sistem)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'Activity',
  description TEXT NOT NULL,
  activity TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON public.audit_logs(timestamp);

-- =========================================================================
-- SEED DATA AWAL (SUPABASE / POSTGRESQL)
-- =========================================================================

-- Admin Default (User: admin, Pass: admin123)
INSERT INTO public.users (id, username, name, password_hash, role, created_at)
VALUES ('usr_admin_01', 'admin', 'Administrator OSIS', '$2a$10$3n57053Xg9J4yUfR8z2N..B9V84p873eW4Ld7xLdFp3n57053Xg9J', 'superadmin', NOW())
ON CONFLICT (username) DO NOTHING;

-- Konfigurasi Sekolah Default
INSERT INTO public.settings (id, school_name, school_logo, school_address, academic_year, event_title, primary_color, footer_text, election_status, start_datetime, end_datetime, result_visibility, enable_sound_effects, principal_name, committee_chair, osis_advisor)
VALUES (1, 'SMAN 1 Sukabumi', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80', 'Jl. Ir. H. Djuanda No. 16, Cikole, Kota Sukabumi, Jawa Barat 43113', '2026/2027', 'PEMILIHAN KETUA & WAKIL KETUA OSIS', '#0891b2', '© 2026 Komisi Pemilihan Umum OSIS (KPU-OSIS) SMAN 1 Sukabumi. Luber & Jurdil.', 'ongoing', NOW() - INTERVAL '2 hour', NOW() + INTERVAL '8 hour', 'realtime', true, 'Drs. H. Rachmat Hidayat, M.Pd.', 'Muhammad Fajar Pratama', 'Dra. Hj. Siti Nurjanah, M.Pd.')
ON CONFLICT (id) DO NOTHING;

-- Data 3 Pasangan Calon Kandidat
INSERT INTO public.candidates (id, candidate_number, chairman_name, chairman_photo, vice_chairman_name, vice_chairman_photo, vision, missions, work_programs, is_active, created_at)
VALUES
('cnd_01', 1, 'Muhammad Arya Pratama', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400', 'Alya Syahrani Putri', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 'Mewujudkan OSIS yang berintegritas, adaptif teknologi digital, unggul prestasi, dan berkarakter budi pekerti.', '["Mengembangkan ekosistem organisasi transparan dan responsif.", "Menyelenggarakan kegiatan inovatif STEM dan seni budaya.", "Memperkuat kolaborasi ekstrakurikuler dan dewan guru.", "Digitalisasi aspirasi siswa."]'::jsonb, '["Smansa Digital Tech Fest", "Aplikasi Aspirasi Smansa Care", "Smansa Eco-School Movement", "Forum Kepemimpinan Muda"]'::jsonb, true, NOW()),
('cnd_02', 2, 'Rafi Aditya Kusuma', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Nabila Zahra Kirana', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'Menjadikan OSIS motor kreativitas siswa yang inklusif, berdaya saing global, dan peduli sosial.', '["Mewadahi bakat dan minat siswa melalui mentoring bertingkat.", "Membangun budaya literasi riset dan debat kritis.", "Menjalin kemitraan dengan institusi pendidikan tinggi.", "Menumbuhkan empati sosial dan pengabdian rutin."]'::jsonb, '["Youth Leadership Camp", "POSPEL Spektakuler", "Smansa Peduli Lingkungan", "Workshop Karier & UTBK"]'::jsonb, true, NOW()),
('cnd_03', 3, 'Dimas Anggara Putra', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'Cantika Dewi Lestari', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', 'Membangun karakter siswa yang berjiwa nasionalis, berwawasan global, unggul bahasa asing, dan solid.', '["Meningkatkan partisipasi ajang kejuaraan akademik nasional.", "Mempererat persaudaraan antar kelas via Classmeeting.", "Menciptakan ruang kreasi seni pertunjukan dan film pendek.", "Menjaga kelestarian lingkungan sekolah asri dan nyaman."]'::jsonb, '["Smansa Art & Music Festival", "English Public Speaking Masterclass", "Zero Waste Challenge", "Classmeeting Championship"]'::jsonb, true, NOW())
ON CONFLICT (candidate_number) DO NOTHING;

-- Data Contoh Pemilih Siswa & Dewan Guru
INSERT INTO public.students (id, nis, name, class_name, major, username, pin, has_voted, voted_at, created_at)
VALUES
('std_01', '102401', 'Ahmad Fauzi Rahman', 'XII MIPA 1', 'MIPA', '102401', '123456', true, NOW() - INTERVAL '2 hour', NOW()),
('std_02', '102402', 'Anisa Rahmawati', 'XII MIPA 1', 'MIPA', '102402', '234567', true, NOW() - INTERVAL '90 minute', NOW()),
('std_03', '102403', 'Bagas Aditya Pratama', 'XII MIPA 2', 'MIPA', '102403', '345678', true, NOW() - INTERVAL '70 minute', NOW()),
('std_04', '102404', 'Citra Kirana Lestari', 'XII MIPA 2', 'MIPA', '102404', '456789', false, NULL, NOW()),
('std_05', '102405', 'Daffa Rizky Ramadhan', 'XI IPS 1', 'IPS', '102405', '567890', true, NOW() - INTERVAL '50 minute', NOW()),
('std_06', '102406', 'Eka Putri Handayani', 'XI IPS 1', 'IPS', '102406', '678901', false, NULL, NOW()),
('std_07', '102407', 'Fikri Haikal Akbar', 'XI IPS 2', 'IPS', '102407', '789012', true, NOW() - INTERVAL '30 minute', NOW()),
('std_08', '102408', 'Gita Permata Sari', 'XI IPS 2', 'IPS', '102408', '890123', false, NULL, NOW()),
('std_09', '102409', 'Hadi Prasetyo', 'X MIPA 1', 'MIPA', '102409', '901234', true, NOW() - INTERVAL '15 minute', NOW()),
('std_10', '102410', 'Intan Nuraini', 'X MIPA 1', 'MIPA', '102410', '112233', false, NULL, NOW()),
('tch_01', '198503152010011002', 'Drs. H. Bambang Sudiro, M.Pd.', 'Dewan Guru', 'Guru / Tenaga Pendidik', '198503152010011002', '778899', false, NULL, NOW()),
('tch_02', '199004222019032008', 'Siti Nurjanah, S.Pd., M.Si.', 'Dewan Guru', 'Guru / Tenaga Pendidik', '199004222019032008', '990011', false, NULL, NOW())
ON CONFLICT (nis) DO NOTHING;

-- Suara Contoh Awal
INSERT INTO public.votes (id, candidate_id, created_at)
VALUES
('vt_001', 'cnd_01', NOW() - INTERVAL '2 hour'),
('vt_002', 'cnd_01', NOW() - INTERVAL '90 minute'),
('vt_003', 'cnd_02', NOW() - INTERVAL '70 minute'),
('vt_004', 'cnd_01', NOW() - INTERVAL '50 minute'),
('vt_005', 'cnd_03', NOW() - INTERVAL '30 minute'),
('vt_006', 'cnd_02', NOW() - INTERVAL '15 minute')
ON CONFLICT (id) DO NOTHING;
