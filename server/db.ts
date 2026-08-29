import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Student,
  Candidate,
  Vote,
  Settings,
  AuditLog,
  ElectionStatus,
  DashboardStats,
  ResultsData,
  CandidateResult,
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'evoting_database.json');

interface DatabaseSchema {
  users: (User & { password_hash: string })[];
  students: Student[];
  candidates: Candidate[];
  votes: Vote[];
  settings: Settings;
  audit_logs: AuditLog[];
}

function getInitialData(): DatabaseSchema {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const now = new Date();
  
  // Set default election window: today from 07:00 to 17:00
  const todayStr = now.toISOString().split('T')[0];
  const startDate = `${todayStr}T07:00:00`;
  const endDate = `${todayStr}T17:00:00`;

  return {
    users: [
      {
        id: 'usr_admin_01',
        username: 'admin',
        name: 'Administrator OSIS',
        role: 'superadmin',
        password_hash: adminHash,
        created_at: new Date().toISOString(),
      },
    ],
    settings: {
      school_name: 'SMAN 1 Sukabumi',
      school_logo: '',
      school_address: 'Jl. Ir. H. Djuanda No. 16, Cikole, Kota Sukabumi, Jawa Barat 43113',
      academic_year: '2026/2027',
      event_title: 'PEMILIHAN KETUA & WAKIL KETUA OSIS',
      primary_color: '#0891b2', // cyan-600
      footer_text: '© 2026 Komisi Pemilihan Umum OSIS. Asas Luber & Jurdil.',
      election_status: 'draft',
      voting_mode: 'booth', // 'booth' (Bilik Suara) or 'anywhere' (Online Mandiri)
      booth_count: 5,
      start_datetime: startDate,
      end_datetime: endDate,
      result_visibility: 'after_ended',
      enable_sound_effects: true,
      principal_name: 'Drs. H. Rachmat Hidayat, M.Pd.',
      principal_nip: '19680514 199403 1 004',
      committee_chair: 'Ketua Panitia OSIS',
      chair_nis: '',
      osis_advisor: 'Pembina OSIS',
      advisor_nip: '',
      committee_secretary: 'Sekretaris Panitia',
      secretary_nis: '',
      witness_1_name: '',
      witness_2_name: '',
    },
    candidates: [],
    students: [],
    votes: [],
    audit_logs: [
      {
        id: 'log_01',
        user_name: 'System',
        action: 'System Init',
        description: 'Inisialisasi sistem E-Voting OSIS siap digunakan',
        activity: 'Inisialisasi sistem E-Voting OSIS siap digunakan',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

class Database {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.error('Error reading database file, using initial data:', err);
    }
    const initial = getInitialData();
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      this.ensureDataDirectory();
      const serialized = JSON.stringify(data, null, 2);
      
      // Atomic write pattern: write to temporary file first, then rename atomically
      const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
      fs.writeFileSync(tempFile, serialized, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);

      // Periodic backup copy (every 25 writes or whenever a vote is cast)
      try {
        const backupFile = path.join(DATA_DIR, 'evoting_database.backup.json');
        fs.copyFileSync(DB_FILE, backupFile);
      } catch (backupErr) {
        // Silent ignore backup fail
      }
    } catch (err) {
      console.error('Error writing database to disk:', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  // Audit Logger
  public logAudit(user_name: string, activity: string, ip_address = '127.0.0.1', action = 'System') {
    const log: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      user_name,
      action: action || 'Activity',
      description: activity,
      activity,
      ip_address,
      timestamp: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(log);
    // Keep last 100 logs
    if (this.data.audit_logs.length > 100) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 100);
    }
    this.save();
  }

  // Users / Admin
  public getAdminByUsername(username: string) {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  public getAdminById(id: string) {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  public updateAdminPassword(adminId: string, newPasswordPlain: string) {
    const user = this.data.users.find((u) => u.id === adminId);
    if (!user) return false;
    user.password_hash = bcrypt.hashSync(newPasswordPlain, 10);
    this.save();
    return true;
  }

  // Settings
  public getSettings(): Settings {
    return { ...this.data.settings };
  }

  public updateSettings(newSettings: Partial<Settings>, updatedBy = 'admin', ip = '127.0.0.1') {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    this.logAudit(updatedBy, 'Memperbarui konfigurasi & identitas sekolah / pemilihan', ip);
    return this.data.settings;
  }

  public getEffectiveElectionStatus(): {
    status: ElectionStatus;
    canVote: boolean;
    remainingSeconds: number;
  } {
    const settings = this.data.settings;
    if (settings.election_status === 'ended') {
      return { status: 'ended', canVote: false, remainingSeconds: 0 };
    }

    const now = new Date().getTime();
    const start = settings.start_datetime ? new Date(settings.start_datetime).getTime() : NaN;
    const end = settings.end_datetime ? new Date(settings.end_datetime).getTime() : NaN;

    // 1. Ended by schedule
    if (!isNaN(end) && now >= end) {
      return { status: 'ended', canVote: false, remainingSeconds: 0 };
    }

    // 2. Draft / Not started yet by schedule AND admin didn't manually force 'ongoing'
    if (!isNaN(start) && now < start && settings.election_status !== 'ongoing') {
      return {
        status: 'draft',
        canVote: false,
        remainingSeconds: Math.max(0, Math.floor((start - now) / 1000)),
      };
    }

    // 3. Ongoing: either schedule has arrived (now >= start) OR admin forced 'ongoing'
    const remaining = !isNaN(end) ? Math.max(0, Math.floor((end - now) / 1000)) : 0;
    return { status: 'ongoing', canVote: true, remainingSeconds: remaining };
  }

  // Candidates
  public getCandidates(includeVotes = false): Candidate[] {
    const candidates = this.data.candidates.map((c) => ({ ...c }));
    candidates.sort((a, b) => a.candidate_number - b.candidate_number);

    if (includeVotes) {
      const voteCounts = new Map<string, number>();
      for (const vote of this.data.votes) {
        voteCounts.set(vote.candidate_id, (voteCounts.get(vote.candidate_id) || 0) + 1);
      }
      return candidates.map((c) => ({
        ...c,
        vote_count: voteCounts.get(c.id) || 0,
      }));
    }

    return candidates;
  }

  public getCandidateById(id: string): Candidate | undefined {
    return this.data.candidates.find((c) => c.id === id);
  }

  public createCandidate(candidateData: Omit<Candidate, 'id'>, createdBy = 'admin', ip = '127.0.0.1') {
    const newCandidate: Candidate = {
      id: 'cnd_' + Date.now(),
      ...candidateData,
    };
    this.data.candidates.push(newCandidate);
    this.save();
    this.logAudit(
      createdBy,
      `Menambahkan Paslon No. ${newCandidate.candidate_number} (${newCandidate.chairman_name} & ${newCandidate.vice_chairman_name})`,
      ip
    );
    return newCandidate;
  }

  public updateCandidate(id: string, updates: Partial<Candidate>, updatedBy = 'admin', ip = '127.0.0.1') {
    const index = this.data.candidates.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.data.candidates[index] = { ...this.data.candidates[index], ...updates };
    this.save();
    this.logAudit(
      updatedBy,
      `Mengubah data Paslon No. ${this.data.candidates[index].candidate_number} (${this.data.candidates[index].chairman_name})`,
      ip
    );
    return this.data.candidates[index];
  }

  public deleteCandidate(id: string, deletedBy = 'admin', ip = '127.0.0.1') {
    const index = this.data.candidates.findIndex((c) => c.id === id);
    if (index === -1) return false;
    const removed = this.data.candidates[index];
    this.data.candidates.splice(index, 1);
    this.save();
    this.logAudit(
      deletedBy,
      `Menghapus Paslon No. ${removed.candidate_number} (${removed.chairman_name})`,
      ip
    );
    return true;
  }

  // Students
  public getStudents(): Student[] {
    return [...this.data.students];
  }

  public getStudentById(id: string): Student | undefined {
    return this.data.students.find((s) => s.id === id);
  }

  public getStudentByLogin(identifier: string, pin: string): Student | null {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();
    const student = this.data.students.find(
      (s) =>
        (s.nis.toLowerCase() === cleanId || s.username.toLowerCase() === cleanId) &&
        s.pin === cleanPin
    );
    return student || null;
  }

  public createStudent(studentData: Omit<Student, 'id' | 'has_voted' | 'voted_at' | 'created_at'>, createdBy = 'admin', ip = '127.0.0.1') {
    const newStudent: Student = {
      id: 'std_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      nis: studentData.nis.trim(),
      name: studentData.name.trim(),
      class_name: studentData.class_name.trim(),
      major: studentData.major?.trim() || 'Umum',
      username: studentData.username?.trim() || studentData.nis.trim(),
      pin: studentData.pin.trim(),
      has_voted: false,
      voted_at: null,
      created_at: new Date().toISOString(),
    };
    this.data.students.push(newStudent);
    this.save();
    this.logAudit(createdBy, `Menambahkan data siswa: ${newStudent.name} (${newStudent.nis})`, ip);
    return newStudent;
  }

  public updateStudent(id: string, updates: Partial<Student>, updatedBy = 'admin', ip = '127.0.0.1') {
    const index = this.data.students.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.data.students[index] = { ...this.data.students[index], ...updates };
    this.save();
    this.logAudit(updatedBy, `Mengubah data siswa ID: ${id} (${this.data.students[index].name})`, ip);
    return this.data.students[index];
  }

  public deleteStudent(id: string, deletedBy = 'admin', ip = '127.0.0.1') {
    const index = this.data.students.findIndex((s) => s.id === id);
    if (index === -1) return false;
    const removed = this.data.students[index];
    this.data.students.splice(index, 1);
    this.save();
    this.logAudit(deletedBy, `Menghapus siswa: ${removed.name} (${removed.nis})`, ip);
    return true;
  }

  public importStudentsBatch(
    studentsList: { nis: string; name: string; class_name: string; major?: string; pin?: string }[],
    importedBy = 'admin',
    ip = '127.0.0.1'
  ) {
    let addedCount = 0;
    let updatedCount = 0;

    for (const item of studentsList) {
      if (!item.nis || !item.name || !item.class_name) continue;
      const cleanNis = String(item.nis).trim();
      const existing = this.data.students.find((s) => s.nis === cleanNis);
      const generatedPin = item.pin ? String(item.pin).trim() : Math.floor(100000 + Math.random() * 900000).toString();

      if (existing) {
        existing.name = String(item.name).trim();
        existing.class_name = String(item.class_name).trim();
        existing.major = item.major ? String(item.major).trim() : existing.major;
        if (item.pin) existing.pin = generatedPin;
        updatedCount++;
      } else {
        const newStudent: Student = {
          id: 'std_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
          nis: cleanNis,
          name: String(item.name).trim(),
          class_name: String(item.class_name).trim(),
          major: item.major ? String(item.major).trim() : 'Umum',
          username: cleanNis,
          pin: generatedPin,
          has_voted: false,
          voted_at: null,
          created_at: new Date().toISOString(),
        };
        this.data.students.push(newStudent);
        addedCount++;
      }
    }

    this.save();
    this.logAudit(
      importedBy,
      `Import Excel Siswa: ${addedCount} baru ditambahkan, ${updatedCount} diperbarui`,
      ip
    );
    return { addedCount, updatedCount, total: this.data.students.length };
  }

  public resetStudentVote(studentId: string, resetBy = 'admin', ip = '127.0.0.1') {
    const student = this.data.students.find((s) => s.id === studentId);
    if (!student) return false;
    student.has_voted = false;
    student.voted_at = null;
    this.save();
    this.logAudit(resetBy, `Mereset status hak suara siswa: ${student.name} (${student.nis})`, ip);
    return true;
  }

  public resetAllVotes(resetBy = 'admin', ip = '127.0.0.1') {
    for (const student of this.data.students) {
      student.has_voted = false;
      student.voted_at = null;
    }
    this.data.votes = [];
    this.save();
    this.logAudit(resetBy, 'Mereset SEMUA surat suara dan mengembalikan status voting seluruh siswa', ip);
    return true;
  }

  // VOTING TRANSACTION - ANTI DOUBLE VOTE & SECRET BALLOT ENFORCED
  public castVote(
    studentId: string,
    candidateId: string,
    ip = '127.0.0.1'
  ): { success: boolean; message: string; timestamp?: string } {
    // 1. Check Election Window
    const { canVote, status } = this.getEffectiveElectionStatus();
    if (!canVote) {
      if (status === 'draft') {
        return { success: false, message: 'Pemilihan belum dibuka oleh panitia.' };
      }
      return { success: false, message: 'Periode waktu pemilihan telah berakhir.' };
    }

    // 2. Check Candidate
    const candidate = this.data.candidates.find((c) => c.id === candidateId && c.is_active);
    if (!candidate) {
      return { success: false, message: 'Pasangan calon yang dipilih tidak valid atau dinonaktifkan.' };
    }

    // 3. Check Student Voting State
    const student = this.data.students.find((s) => s.id === studentId);
    if (!student) {
      return { success: false, message: 'Data identitas pemilih tidak ditemukan dalam DPT.' };
    }

    if (student.has_voted) {
      return {
        success: false,
        message: 'Anda sudah menggunakan hak pilih sebelumnya. Satu pemilih hanya dapat memberikan 1 suara.',
      };
    }

    // 4. ATOMIC TRANSACTION
    // Mark student as voted
    const timestamp = new Date().toISOString();
    student.has_voted = true;
    student.voted_at = timestamp;

    // Record ANONYMOUS ballot (NO student ID in vote record!)
    const voteRecord: Vote = {
      id: 'vt_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      candidate_id: candidateId,
      created_at: timestamp,
    };
    this.data.votes.push(voteRecord);

    // Save changes
    this.save();

    // Security Audit Log (Never stores candidate choice to protect secrecy!)
    this.logAudit('Sistem Voting', `Siswa NIS ${student.nis} (${student.class_name}) telah menyalurkan suara sah`, ip);

    return {
      success: true,
      message: 'Suara Anda telah berhasil dicatat dengan aman dan rahasia ke dalam sistem E-Voting.',
      timestamp,
    };
  }

  // Generate deterministic Receipt Code for Voter Proof without candidate info
  public getReceiptCodeForStudent(student: Student): string {
    if (!student.voted_at) return 'BELUM_MEMILIH';
    const str = `${student.id}:${student.voted_at}:${this.data.settings.school_name || 'EVOTING_2026'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    const timeHex = new Date(student.voted_at).getTime().toString(36).toUpperCase().slice(-4);
    return `VTR-2026-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${timeHex}`;
  }

  // Dashboard Stats
  public getDashboardStats(): DashboardStats {
    const total_students = this.data.students.length;
    const total_voted = this.data.students.filter((s) => s.has_voted).length;
    const total_unvoted = total_students - total_voted;
    const participation_percentage = total_students > 0
      ? Number(((total_voted / total_students) * 100).toFixed(2))
      : 0;
    const total_candidates = this.data.candidates.filter((c) => c.is_active).length;

    const { status, canVote, remainingSeconds } = this.getEffectiveElectionStatus();

    // Hourly votes aggregation
    const hourMap = new Map<string, number>();
    for (const vote of this.data.votes) {
      const date = new Date(vote.created_at);
      const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
      hourMap.set(hourKey, (hourMap.get(hourKey) || 0) + 1);
    }
    const hourly_votes = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Class breakdown
    const classMap = new Map<string, { total: number; voted: number }>();
    for (const student of this.data.students) {
      const cls = student.class_name || 'Lainnya';
      if (!classMap.has(cls)) {
        classMap.set(cls, { total: 0, voted: 0 });
      }
      const entry = classMap.get(cls)!;
      entry.total++;
      if (student.has_voted) entry.voted++;
    }

    const class_participation = Array.from(classMap.entries())
      .map(([class_name, stats]) => ({
        class_name,
        total: stats.total,
        voted: stats.voted,
        percentage: stats.total > 0 ? Number(((stats.voted / stats.total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.class_name.localeCompare(b.class_name));

    return {
      total_students,
      total_voted,
      total_unvoted,
      participation_percentage,
      total_candidates,
      election_status: this.data.settings.election_status,
      effective_status: status,
      time_remaining_seconds: remainingSeconds,
      can_vote_now: canVote,
      hourly_votes,
      class_participation,
    };
  }

  // Election Results
  public getResults(forRole: 'admin' | 'student' = 'student'): ResultsData {
    const total_voters = this.data.students.length;
    const total_voted = this.data.votes.length;
    const total_unvoted = Math.max(0, total_voters - total_voted);
    const participation_percentage = total_voters > 0
      ? Number(((total_voted / total_voters) * 100).toFixed(2))
      : 0;

    const visibility = this.data.settings.result_visibility;
    const effectiveStatus = this.getEffectiveElectionStatus().status;

    const is_visible_to_student =
      visibility === 'realtime' ||
      (visibility === 'after_ended' && effectiveStatus === 'ended');

    // Count votes per candidate
    const voteMap = new Map<string, number>();
    for (const vote of this.data.votes) {
      voteMap.set(vote.candidate_id, (voteMap.get(vote.candidate_id) || 0) + 1);
    }

    const candidateResults: CandidateResult[] = this.data.candidates
      .filter((c) => c.is_active)
      .map((cand) => {
        const count = voteMap.get(cand.id) || 0;
        const percentage = total_voted > 0 ? Number(((count / total_voted) * 100).toFixed(2)) : 0;
        return {
          candidate: cand,
          votes: count,
          percentage,
          rank: 0,
        };
      });

    // Sort by votes descending
    candidateResults.sort((a, b) => b.votes - a.votes);
    candidateResults.forEach((res, index) => {
      res.rank = index + 1;
    });

    const winner = candidateResults.length > 0 && candidateResults[0].votes > 0
      ? candidateResults[0]
      : null;

    if (forRole === 'student' && !is_visible_to_student) {
      return {
        visibility,
        is_visible_to_student: false,
        total_voters,
        total_voted,
        total_unvoted,
        participation_percentage,
        results: [],
        winner: null,
      };
    }

    return {
      visibility,
      is_visible_to_student: true,
      total_voters,
      total_voted,
      total_unvoted,
      participation_percentage,
      results: candidateResults,
      winner,
    };
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return [...this.data.audit_logs];
  }

  public clearAuditLogs(username: string = 'admin', ip: string = '127.0.0.1'): void {
    this.data.audit_logs = [];
    this.logAudit(username, 'Membersihkan seluruh catatan riwayat audit log sistem', ip, 'Pembersihan Log');
    this.save();
  }

  // Backup & Restore System
  public getExportData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  public importBackupData(backupData: any, username: string = 'admin', ip: string = '127.0.0.1'): { success: boolean; message: string } {
    if (!backupData || typeof backupData !== 'object') {
      return { success: false, message: 'Format data backup tidak valid.' };
    }
    if (!Array.isArray(backupData.candidates) || !Array.isArray(backupData.students) || !Array.isArray(backupData.votes)) {
      return { success: false, message: 'Struktur file backup tidak sesuai (missing candidates/students/votes).' };
    }

    this.data = {
      users: Array.isArray(backupData.users) && backupData.users.length > 0 ? backupData.users : this.data.users,
      settings: backupData.settings ? { ...this.data.settings, ...backupData.settings } : this.data.settings,
      candidates: backupData.candidates,
      students: backupData.students,
      votes: backupData.votes,
      audit_logs: Array.isArray(backupData.audit_logs) ? backupData.audit_logs : [],
    };

    this.save();
    this.logAudit(username, `Melakukan Pemulihan / Restore Data Sistem dari File Backup JSON`, ip);

    return { success: true, message: 'Data sistem berhasil dipulihkan dari file backup.' };
  }
}

export const db = new Database();
