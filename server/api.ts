import express, { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured,
} from './cloudinary';

export const apiRouter = Router();

// Server secret key for HMAC token signing (falls back to secure runtime random if not set)
const TOKEN_SECRET = process.env.AUTH_SECRET || process.env.APP_SECRET || 'evoting_secret_salt_' + (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(-10) : 'kpu_osis_secure_2026');

// Helpers for secure HMAC-signed tokens
function signToken(prefix: 'adm' | 'std', id: string): string {
  const timestamp = Date.now().toString();
  const payload = `${prefix}:${id}:${timestamp}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').substring(0, 32);
  const raw = `${payload}:${signature}`;
  return `${prefix}_${Buffer.from(raw).toString('base64')}`;
}

function verifyToken(prefix: 'adm' | 'std', token: string): { valid: boolean; id?: string } {
  try {
    if (!token.startsWith(`${prefix}_`)) return { valid: false };
    const raw = Buffer.from(token.replace(`${prefix}_`, ''), 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length < 4) return { valid: false };
    const [tokenPrefix, id, timestamp, signature] = parts;
    if (tokenPrefix !== prefix) return { valid: false };
    
    // Verify signature
    const payload = `${prefix}:${id}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').substring(0, 32);
    if (signature !== expectedSig) return { valid: false };

    // Check expiration (Admin: 24h, Student: 4h)
    const tokenTime = parseInt(timestamp, 10);
    const maxAge = prefix === 'adm' ? 24 * 3600 * 1000 : 4 * 3600 * 1000;
    if (Date.now() - tokenTime > maxAge) return { valid: false };

    return { valid: true, id };
  } catch (err) {
    return { valid: false };
  }
}

// In-Memory Rate Limiter for Login Attempts
interface RateLimitEntry {
  attempts: number;
  blockedUntil: number;
}
const loginRateLimits = new Map<string, RateLimitEntry>();

// Middleware to extract client IP
const getClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
};

// Security Middleware: Require Admin Authorization
const requireAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer adm_')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token Administrator tidak valid atau tidak disertakan.' });
  }
  try {
    const rawToken = authHeader.replace('Bearer ', '');
    const verified = verifyToken('adm', rawToken);
    if (!verified.valid || !verified.id) {
      return res.status(401).json({ success: false, message: 'Token Administrator kadaluarsa atau tidak valid.' });
    }
    const admin = db.getAdminById(verified.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Akun Administrator tidak ditemukan.' });
    }
    (req as any).adminUser = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Format token Administrator tidak valid.' });
  }
};

// Security Middleware: Require Student Authorization
const requireStudent = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer std_')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login sebagai pemilih terlebih dahulu.' });
  }
  try {
    const rawToken = authHeader.replace('Bearer ', '');
    const verified = verifyToken('std', rawToken);
    if (!verified.valid || !verified.id) {
      return res.status(401).json({ success: false, message: 'Sesi login pemilih telah berakhir atau tidak valid.' });
    }
    const student = db.getStudents().find((s) => s.id === verified.id);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Data siswa pemilih tidak ditemukan.' });
    }
    (req as any).studentUser = student;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Format token pemilih tidak valid.' });
  }
};

// 0. UPLOAD ENDPOINT (CLOUDINARY) - Admin Only
apiRouter.post('/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'File/String Gambar wajib diunggah.' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary belum dikonfigurasi di server. Harap atur variabel CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET.',
      });
    }

    const uploaded = await uploadToCloudinary(image, folder || 'evoting');
    db.logAudit('admin', `Upload gambar ke Cloudinary berhasil: ${uploaded.public_id}`, getClientIp(req));
    return res.json({
      success: true,
      message: 'Gambar berhasil diunggah ke Cloudinary.',
      url: uploaded.url,
      public_id: uploaded.public_id,
    });
  } catch (err: any) {
    console.error('Error uploading to Cloudinary:', err);
    return res.status(500).json({
      success: false,
      message: `Gagal mengunggah ke Cloudinary: ${err.message || 'Terjadi kesalahan internal'}`,
    });
  }
});

apiRouter.post('/upload/delete', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL gambar tidak valid.' });
    }
    const deleted = await deleteFromCloudinary(url);
    db.logAudit('admin', `Penghapusan gambar Cloudinary: ${url}`, getClientIp(req));
    return res.json({ success: true, deleted, message: 'Gambar berhasil dihapus dari Cloudinary.' });
  } catch (err: any) {
    console.error('Error deleting from Cloudinary:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal menghapus dari Cloudinary' });
  }
});

// 1. AUTHENTICATION
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { role, username, password, pin, identifier } = req.body;
  const ip = getClientIp(req);

  // Rate Limiter Check per IP
  const now = Date.now();
  const rateLimitKey = `${ip}`;
  const currentLimit = loginRateLimits.get(rateLimitKey);
  if (currentLimit && currentLimit.blockedUntil > now) {
    const remainingSec = Math.ceil((currentLimit.blockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak percobaan login gagal. Mohon tunggu ${remainingSec} detik sebelum mencoba kembali.`,
    });
  }

  const loginUser = (identifier || username || '').trim();
  const loginPass = (password || pin || '').trim();

  if (!loginUser || !loginPass) {
    return res.status(400).json({
      success: false,
      message: 'Username dan Password/PIN wajib diisi.',
    });
  }

  // 1. Check if user matches an administrator account
  const admin = db.getAdminByUsername(loginUser);
  if (admin) {
    const isMatch = bcrypt.compareSync(loginPass, admin.password_hash);
    if (isMatch) {
      // Clear rate limit on successful login
      loginRateLimits.delete(rateLimitKey);
      db.logAudit(admin.username, 'Admin berhasil login ke sistem', ip, 'Login Admin');
      const token = signToken('adm', admin.id);
      const { password_hash, ...safeAdmin } = admin;

      return res.json({
        success: true,
        message: 'Login berhasil sebagai Administrator.',
        token,
        role: admin.role || 'admin',
        user: safeAdmin,
      });
    }
  }

  // 2. Check if user matches a student voter account
  const student = db.getStudentByLogin(loginUser, loginPass);
  if (student) {
    const statusInfo = db.getEffectiveElectionStatus();

    if (!statusInfo.canVote) {
      db.logAudit('Akses Ditolak', `Percobaan login siswa NIS ${student.nis} (${student.name}) ditolak karena voting belum dibuka/sudah selesai`, ip, 'Login Siswa Ditolak');
      return res.status(403).json({
        success: false,
        message: 'Pemilihan suara belum dibuka atau telah berakhir. Akses login pemilih saat ini ditutup.',
      });
    }

    // Clear rate limit on successful login
    loginRateLimits.delete(rateLimitKey);
    db.logAudit(student.name, `Siswa NIS ${student.nis} (${student.name}) login ke bilik suara`, ip, 'Login Siswa');
    const token = signToken('std', student.id);

    return res.json({
      success: true,
      message: `Selamat datang, ${student.name}`,
      token,
      role: 'student',
      student,
    });
  }

  // 3. Increment Rate Limit on Failed Login
  const attempts = (currentLimit ? currentLimit.attempts : 0) + 1;
  const blockedUntil = attempts >= 5 ? now + 30000 : 0; // Block for 30s after 5 consecutive failures
  loginRateLimits.set(rateLimitKey, { attempts, blockedUntil });

  db.logAudit('Gagal Login', `Percobaan login gagal untuk akun: ${loginUser}`, ip, 'Gagal Login');
  return res.status(401).json({
    success: false,
    message: attempts >= 5
      ? 'Terlalu banyak percobaan gagal. Akses dibatasi selama 30 detik.'
      : 'Username atau Password/PIN tidak valid. Silakan periksa kembali data login Anda.',
  });
});

apiRouter.post('/auth/change-admin-password', requireAdmin, (req: Request, res: Response) => {
  const { current_password, new_password, admin_id } = req.body;
  const ip = getClientIp(req);

  const admin = (req as any).adminUser || db.getAdminById(admin_id || 'usr_admin_01');
  if (!admin) {
    return res.status(404).json({ success: false, message: 'Data akun admin tidak ditemukan.' });
  }

  const fullAdmin = db.getAdminByUsername(admin.username);
  if (!fullAdmin || !bcrypt.compareSync(current_password, fullAdmin.password_hash)) {
    return res.status(400).json({ success: false, message: 'Password saat ini salah.' });
  }

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
  }

  db.updateAdminPassword(admin.id, new_password);
  db.logAudit(admin.username, 'Password akun administrator berhasil diperbarui', ip);

  res.json({ success: true, message: 'Password admin berhasil diubah.' });
});

// 2. DASHBOARD STATS
apiRouter.get('/stats', (req: Request, res: Response) => {
  const stats = db.getDashboardStats();
  res.json({ success: true, data: stats });
});

// 3. SETTINGS
apiRouter.get('/settings', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const effective = db.getEffectiveElectionStatus();
  res.json({
    success: true,
    data: settings,
    effective_status: effective.status,
    can_vote: effective.canVote,
    remaining_seconds: effective.remainingSeconds,
  });
});

const handleUpdateSettings = async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const currentSettings = db.getSettings();
  const newLogo = req.body.school_logo;

  // If school_logo was changed or removed, and old logo was hosted on Cloudinary, delete old logo from Cloudinary
  if (
    newLogo !== undefined &&
    currentSettings.school_logo &&
    newLogo !== currentSettings.school_logo &&
    currentSettings.school_logo.includes('cloudinary.com')
  ) {
    console.log('[Cloudinary] Deleting old logo image:', currentSettings.school_logo);
    await deleteFromCloudinary(currentSettings.school_logo);
  }

  const payload = { ...req.body };
  const now = new Date();

  if (payload.start_datetime || payload.start_time) {
    const s = payload.start_datetime || payload.start_time;
    payload.start_datetime = s;
    payload.start_time = s;
  }
  if (payload.end_datetime || payload.end_time) {
    const e = payload.end_datetime || payload.end_time;
    payload.end_datetime = e;
    payload.end_time = e;
  }

  const startIso = payload.start_datetime || currentSettings.start_datetime || currentSettings.start_time;
  const endIso = payload.end_datetime || currentSettings.end_datetime || currentSettings.end_time;

  if (payload.election_status === 'ongoing') {
    const sTime = startIso ? new Date(startIso).getTime() : NaN;
    if (isNaN(sTime) || sTime > now.getTime()) {
      payload.start_datetime = now.toISOString();
      payload.start_time = now.toISOString();
    }
    const eTime = endIso ? new Date(endIso).getTime() : NaN;
    if (isNaN(eTime) || eTime <= now.getTime()) {
      const tomorrow = new Date(now.getTime() + 86400000).toISOString();
      payload.end_datetime = tomorrow;
      payload.end_time = tomorrow;
    }
  } else if (payload.election_status === 'ended') {
    const eTime = endIso ? new Date(endIso).getTime() : NaN;
    if (isNaN(eTime) || eTime > now.getTime()) {
      payload.end_datetime = now.toISOString();
      payload.end_time = now.toISOString();
    }
  } else if (payload.election_status === 'draft') {
    const sTime = startIso ? new Date(startIso).getTime() : NaN;
    if (isNaN(sTime) || sTime <= now.getTime()) {
      const tomorrow = new Date(now.getTime() + 86400000).toISOString();
      payload.start_datetime = tomorrow;
      payload.start_time = tomorrow;
    }
  } else if (payload.start_datetime || payload.end_datetime) {
    const sTime = payload.start_datetime ? new Date(payload.start_datetime).getTime() : NaN;
    const eTime = payload.end_datetime ? new Date(payload.end_datetime).getTime() : NaN;

    if (!isNaN(eTime) && now.getTime() >= eTime) {
      payload.election_status = 'ended';
    } else if (!isNaN(sTime) && now.getTime() >= sTime) {
      payload.election_status = 'ongoing';
    } else if (!isNaN(sTime) && now.getTime() < sTime) {
      payload.election_status = 'draft';
    }
  }

  const updatedSettings = db.updateSettings(payload, 'admin', ip);
  res.json({ success: true, message: 'Pengaturan sistem berhasil disimpan.', data: updatedSettings });
};

apiRouter.put('/settings', requireAdmin, handleUpdateSettings);
apiRouter.post('/settings', requireAdmin, handleUpdateSettings);

apiRouter.post('/settings/toggle-status', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  const ip = getClientIp(req);
  if (!['draft', 'ongoing', 'ended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status pemilihan tidak valid.' });
  }

  const currentSettings = db.getSettings();
  const now = new Date();
  const updates: Partial<typeof currentSettings> = { election_status: status };

  // Sync start_datetime / end_datetime if manual override disagrees with schedule
  if (status === 'ongoing') {
    const start = currentSettings.start_datetime ? new Date(currentSettings.start_datetime).getTime() : NaN;
    if (isNaN(start) || start > now.getTime()) {
      updates.start_datetime = now.toISOString();
      updates.start_time = now.toISOString();
    }
  } else if (status === 'ended') {
    const end = currentSettings.end_datetime ? new Date(currentSettings.end_datetime).getTime() : NaN;
    if (isNaN(end) || end > now.getTime()) {
      updates.end_datetime = now.toISOString();
      updates.end_time = now.toISOString();
    }
  }

  const updated = db.updateSettings(updates, 'admin', ip);
  const actionLabel =
    status === 'ongoing' ? 'MEMBUKA PEMILIHAN' : status === 'ended' ? 'MENUTUP PEMILIHAN' : 'MENGATUR DRAFT PEMILIHAN';
  db.logAudit('admin', `Admin mengubah status pemilihan menjadi: ${actionLabel}`, ip);

  res.json({
    success: true,
    message: `Status pemilihan berhasil diubah menjadi: ${status === 'ongoing' ? 'Sedang Berlangsung' : status === 'ended' ? 'Selesai' : 'Belum Dimulai'}.${status === 'ongoing' ? ' Waktu mulai otomatis disesuaikan ke saat ini.' : ''}`,
    data: updated,
  });
});

// 4. CANDIDATES
apiRouter.get('/candidates', (req: Request, res: Response) => {
  const includeVotes = req.query.include_votes === 'true';
  const candidates = db.getCandidates(includeVotes);
  res.json({ success: true, data: candidates });
});

apiRouter.post('/candidates', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const { candidate_number, chairman_name, chairman_photo, vice_chairman_name, vice_chairman_photo, vision, missions, work_programs, is_active } = req.body;

  if (!chairman_name || !vice_chairman_name) {
    return res.status(400).json({ success: false, message: 'Nama Ketua dan Wakil Ketua wajib diisi.' });
  }

  const newCand = db.createCandidate({
    candidate_number: Number(candidate_number) || 1,
    chairman_name,
    chairman_photo: chairman_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    vice_chairman_name,
    vice_chairman_photo: vice_chairman_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    vision: vision || '',
    missions: Array.isArray(missions) ? missions : [],
    work_programs: Array.isArray(work_programs) ? work_programs : [],
    is_active: is_active !== false,
  }, 'admin', ip);

  res.status(201).json({ success: true, message: 'Pasangan calon berhasil ditambahkan.', data: newCand });
});

const handleUpdateCandidate = async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const candidateId = req.params.id;
  const existingCand = db.getCandidateById(candidateId);

  if (!existingCand) {
    return res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan.' });
  }

  const newChairmanPhoto = req.body.chairman_photo;
  const newViceChairmanPhoto = req.body.vice_chairman_photo;

  // Replace chairman photo on Cloudinary if replaced or removed
  if (
    newChairmanPhoto !== undefined &&
    existingCand.chairman_photo &&
    newChairmanPhoto !== existingCand.chairman_photo &&
    existingCand.chairman_photo.includes('cloudinary.com')
  ) {
    console.log('[Cloudinary] Deleting old chairman photo on replace/delete:', existingCand.chairman_photo);
    await deleteFromCloudinary(existingCand.chairman_photo);
  }

  // Replace vice chairman photo on Cloudinary if replaced or removed
  if (
    newViceChairmanPhoto !== undefined &&
    existingCand.vice_chairman_photo &&
    newViceChairmanPhoto !== existingCand.vice_chairman_photo &&
    existingCand.vice_chairman_photo.includes('cloudinary.com')
  ) {
    console.log('[Cloudinary] Deleting old vice chairman photo on replace/delete:', existingCand.vice_chairman_photo);
    await deleteFromCloudinary(existingCand.vice_chairman_photo);
  }

  const updated = db.updateCandidate(candidateId, req.body, 'admin', ip);
  res.json({ success: true, message: 'Data kandidat berhasil diperbarui.', data: updated });
};

apiRouter.put('/candidates/:id', requireAdmin, handleUpdateCandidate);
apiRouter.post('/candidates/:id', requireAdmin, handleUpdateCandidate);

apiRouter.delete('/candidates/:id', requireAdmin, async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const candidateId = req.params.id;
  const candidate = db.getCandidateById(candidateId);

  if (!candidate) {
    return res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan.' });
  }

  // Delete both candidate photos from Cloudinary on candidate deletion
  if (candidate.chairman_photo && candidate.chairman_photo.includes('cloudinary.com')) {
    console.log('[Cloudinary] Deleting chairman photo on candidate delete:', candidate.chairman_photo);
    await deleteFromCloudinary(candidate.chairman_photo);
  }

  if (candidate.vice_chairman_photo && candidate.vice_chairman_photo.includes('cloudinary.com')) {
    console.log('[Cloudinary] Deleting vice chairman photo on candidate delete:', candidate.vice_chairman_photo);
    await deleteFromCloudinary(candidate.vice_chairman_photo);
  }

  const deleted = db.deleteCandidate(candidateId, 'admin', ip);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Gagal menghapus kandidat.' });
  }

  res.json({ success: true, message: 'Kandidat dan foto terkait berhasil dihapus.' });
});


// 5. STUDENTS
apiRouter.get('/students', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const isAdmin = Boolean(authHeader && authHeader.startsWith('Bearer adm_'));

  let list = db.getStudents();
  const { search, class_name, status } = req.query;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q)
    );
  }

  if (class_name && typeof class_name === 'string' && class_name !== 'ALL') {
    list = list.filter((s) => s.class_name === class_name);
  }

  if (status && typeof status === 'string') {
    if (status === 'voted') list = list.filter((s) => s.has_voted);
    if (status === 'unvoted') list = list.filter((s) => !s.has_voted);
  }

  // Omit sensitive PIN if not requesting as authenticated admin
  if (!isAdmin) {
    list = list.map(({ pin, ...safeStudent }) => safeStudent as any);
  }

  res.json({ success: true, total: list.length, data: list });
});

apiRouter.post('/students', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const { nis, name, class_name, major, username, pin } = req.body;

  if (!nis || !name || !class_name) {
    return res.status(400).json({ success: false, message: 'NIS, Nama, dan Kelas wajib diisi.' });
  }

  const existing = db.getStudents().find((s) => s.nis === String(nis).trim());
  if (existing) {
    return res.status(400).json({ success: false, message: `NIS ${nis} sudah terdaftar sebelumnya.` });
  }

  const student = db.createStudent({
    nis: String(nis),
    name,
    class_name,
    major: major || 'Umum',
    username: username || nis,
    pin: pin || Math.floor(100000 + Math.random() * 900000).toString(),
  }, 'admin', ip);

  res.status(201).json({ success: true, message: 'Data siswa berhasil disimpan.', data: student });
});

const handleUpdateStudent = (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const updated = db.updateStudent(req.params.id, req.body, 'admin', ip);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
  }
  res.json({ success: true, message: 'Data siswa berhasil diupdate.', data: updated });
};

apiRouter.put('/students/:id', requireAdmin, handleUpdateStudent);
apiRouter.post('/students/:id', requireAdmin, handleUpdateStudent);

apiRouter.delete('/students/:id', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const deleted = db.deleteStudent(req.params.id, 'admin', ip);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
  }
  res.json({ success: true, message: 'Siswa berhasil dihapus dari daftar DPT.' });
});

apiRouter.post('/students/import', requireAdmin, (req: Request, res: Response) => {
  const { students } = req.body;
  const ip = getClientIp(req);

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, message: 'Format data import siswa kosong atau tidak valid.' });
  }

  const result = db.importStudentsBatch(students, 'admin', ip);
  res.json({
    success: true,
    message: `Berhasil mengimpor data! ${result.addedCount} siswa baru ditambahkan, ${result.updatedCount} siswa diperbarui.`,
    data: result,
  });
});

apiRouter.post('/students/reset-vote/:id', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const success = db.resetStudentVote(req.params.id, 'admin', ip);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
  }
  res.json({ success: true, message: 'Status hak pilih siswa berhasil direset. Siswa dapat melakukan voting ulang.' });
});

apiRouter.post('/students/reset-all-votes', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  db.resetAllVotes('admin', ip);
  res.json({ success: true, message: 'Seluruh surat suara dan status pemilih telah berhasil direset.' });
});

// 6. CAST VOTE (STUDENT VOTING ACTION)
apiRouter.post('/vote', requireStudent, (req: Request, res: Response) => {
  const { student_id, candidate_id } = req.body;
  const authStudent = (req as any).studentUser;
  const ip = getClientIp(req);

  if (!student_id || !candidate_id) {
    return res.status(400).json({ success: false, message: 'ID Siswa dan Paslon pilihan wajib disertakan.' });
  }

  if (authStudent && authStudent.id !== student_id) {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Anda hanya diperbolehkan memberikan suara atas nama diri sendiri.' });
  }

  const result = db.castVote(student_id, candidate_id, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const updatedStudent = db.getStudentById(student_id);
  const receiptCode = updatedStudent ? db.getReceiptCodeForStudent(updatedStudent) : null;

  res.json({
    ...result,
    receipt_code: receiptCode,
  });
});

// 6.b VERIFY DIGITAL RECEIPT
apiRouter.post('/verify-receipt', (req: Request, res: Response) => {
  const { code, nis } = req.body;
  if (!code && !nis) {
    return res.status(400).json({ success: false, message: 'Kode tanda terima atau NIS wajib diisi.' });
  }

  const students = db.getStudents();
  const matchedStudent = students.find((s) => {
    if (!s.has_voted) return false;
    if (nis && s.nis.toLowerCase() === String(nis).trim().toLowerCase()) return true;
    if (code) {
      const expectedCode = db.getReceiptCodeForStudent(s);
      return expectedCode.toLowerCase() === String(code).trim().toLowerCase();
    }
    return false;
  });

  if (!matchedStudent || !matchedStudent.has_voted) {
    return res.status(404).json({
      success: false,
      message: 'Tanda terima digital tidak ditemukan atau pemilih belum menyalurkan suara.',
    });
  }

  const receiptCode = db.getReceiptCodeForStudent(matchedStudent);

  res.json({
    success: true,
    verified: true,
    data: {
      voter_name: matchedStudent.name,
      nis: matchedStudent.nis,
      class_name: matchedStudent.class_name,
      major: matchedStudent.major,
      voted_at: matchedStudent.voted_at,
      receipt_code: receiptCode,
      status: 'SUARA SAH TERVERIFIKASI',
      anonymity_guaranteed: true,
    },
    message: 'Tanda Terima Digital Sah dan Terverifikasi dalam Sistem e-Voting.',
  });
});

// 7. RESULTS
apiRouter.get('/results', (req: Request, res: Response) => {
  const role = (req.query.role as 'admin' | 'student') || 'student';
  const data = db.getResults(role);
  res.json({ success: true, data });
});

// 8. AUDIT LOGS
const handleGetLogs = (req: Request, res: Response) => {
  const logs = db.getAuditLogs();
  res.json({ success: true, data: logs });
};

const handleClearLogs = (req: Request, res: Response) => {
  const ip = getClientIp(req);
  db.clearAuditLogs('admin', ip);
  res.json({ success: true, message: 'Seluruh riwayat audit log aktivitas sistem telah berhasil dibersihkan.' });
};

apiRouter.get('/audit-logs', requireAdmin, handleGetLogs);
apiRouter.get('/logs', requireAdmin, handleGetLogs);
apiRouter.post('/audit-logs/clear', requireAdmin, handleClearLogs);
apiRouter.post('/logs/clear', requireAdmin, handleClearLogs);

// 9. SQL EXPORT
apiRouter.get('/export/sql', requireAdmin, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', 'attachment; filename="database.sql"');
  try {
    const sqlPath = process.cwd() + '/database.sql';
    res.sendFile(sqlPath);
  } catch (err) {
    res.status(500).send('-- Error reading database.sql');
  }
});

// 10. BACKUP & RESTORE JSON
apiRouter.get('/backup/export', requireAdmin, (req: Request, res: Response) => {
  const data = db.getExportData();
  const dateStr = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="evoting-backup-${dateStr}.json"`);
  res.json(data);
});

apiRouter.post('/backup/import', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const backupData = req.body;
  const result = db.importBackupData(backupData, 'admin', ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// 10. 404 Handler for undefined API routes (Prevents falling through to Vite HTML SPA fallback)
apiRouter.all('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});
