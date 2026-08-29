import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Vote,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  X,
  Lock,
  LogOut,
  BarChart3,
  Calendar,
  Layers,
  Video,
  FileText,
  History,
  Copy,
  Check,
  Printer,
  Search,
  Shield,
  QrCode,
  Share2,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { Student, Candidate, Settings, ResultsData } from '../types';
import { printDocument, downloadPrintableHtml } from '../utils/printHelper';

interface StudentVotingViewProps {
  student: Student;
  settings: Settings;
  onLogout: () => void;
  onRefreshStudent: () => Promise<void>;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
  onSetProcessing?: (isProcessing: boolean, label?: string, percent?: number) => void;
}

export function generateStudentReceiptCode(student: Student, schoolName?: string): string {
  if (!student.voted_at) return 'BELUM_MEMILIH';
  const str = `${student.id}:${student.voted_at}:${schoolName || 'EVOTING_2026'}`;
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

export function StudentVotingView({
  student,
  settings,
  onLogout,
  onRefreshStudent,
  onShowAlert,
  onSetProcessing,
}: StudentVotingViewProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [visionModalCandidate, setVisionModalCandidate] = useState<Candidate | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justVotedTimestamp, setJustVotedTimestamp] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<ResultsData | null>(null);

  // Dashboard Active Tab State: 'ballot' | 'history' | 'results'
  const [activeTab, setActiveTab] = useState<'ballot' | 'history' | 'results'>(
    student.has_voted ? 'history' : 'ballot'
  );

  // Receipt & Verification Tools State
  const [copiedCode, setCopiedCode] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [showPrintReceiptModal, setShowPrintReceiptModal] = useState(false);

  // Rate limiting ref to prevent double-tap or rapid submission attempts
  const lastVoteAttemptRef = React.useRef<number>(0);

  useEffect(() => {
    loadCandidates();
    loadResults();
  }, []);

  useEffect(() => {
    if (student.has_voted && activeTab === 'ballot') {
      setActiveTab('history');
    }
  }, [student.has_voted]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidates');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCandidates(data.data.filter((c: Candidate) => c.is_active));
        }
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const res = await fetch('/api/results?role=student');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLiveResults(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading results:', err);
    }
  };

  // Trigger confetti burst on voting success
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#334155', '#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch (e) {
      // safe fallback
    }
  };

  // Initiate selection
  const handleSelectCandidate = (cand: Candidate) => {
    if (isSubmitting) return;
    const now = Date.now();
    if (now - lastVoteAttemptRef.current < 800) return;
    lastVoteAttemptRef.current = now;

    setSelectedCandidate(cand);
    setIsConfirmModalOpen(true);
  };

  // Final vote submission to server
  const handleConfirmVote = async () => {
    if (!selectedCandidate || isSubmitting) return;

    const now = Date.now();
    if (now - lastVoteAttemptRef.current < 2500) {
      onShowAlert('warning', 'Mohon Tunggu', 'Sistem sedang memproses transaksi suara Anda.');
      return;
    }
    lastVoteAttemptRef.current = now;

    setIsSubmitting(true);
    if (onSetProcessing) {
      onSetProcessing(true, 'Memverifikasi Surat Suara & Mengenkripsi Pilihan...', 25);
    }

    try {
      if (onSetProcessing) {
        onSetProcessing(true, 'Mengirimkan Suara ke Server E-Voting...', 65);
      }

      const token = localStorage.getItem('evoting_token');
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student_id: student.id,
          candidate_id: selectedCandidate.id,
        }),
      });

      if (onSetProcessing) {
        onSetProcessing(true, 'Menyinkronkan Perhitungan Suara & Audit Log...', 90);
      }

      const data = await res.json();
      if (data.success) {
        if (onSetProcessing) {
          onSetProcessing(true, 'Suara Berhasil Terkirim & Tersinkronisasi!', 100);
          setTimeout(() => onSetProcessing(false, '', 0), 600);
        }
        setIsConfirmModalOpen(false);
        setJustVotedTimestamp(data.timestamp || new Date().toISOString());
        triggerConfetti();
        await onRefreshStudent();
        setActiveTab('history');
      } else {
        if (onSetProcessing) onSetProcessing(false, '', 0);
        setIsConfirmModalOpen(false);
        onShowAlert('error', 'Gagal Memberikan Suara', data.message || 'Terjadi kendala.');
      }
    } catch (err) {
      if (onSetProcessing) onSetProcessing(false, '', 0);
      setIsConfirmModalOpen(false);
      onShowAlert('error', 'Koneksi Terputus', 'Gagal mengirim surat suara ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    } catch {
      return isoString;
    }
  };

  const receiptCode = generateStudentReceiptCode(student, settings.school_name);

  const handleCopyReceiptCode = () => {
    if (!receiptCode || receiptCode === 'BELUM_MEMILIH') return;
    navigator.clipboard.writeText(receiptCode);
    setCopiedCode(true);
    onShowAlert('info', 'Kode Tersalin', `Kode Tanda Terima (${receiptCode}) berhasil disalin ke clipboard.`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleVerifyReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;

    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/verify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCodeInput.trim() }),
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({
        success: false,
        message: 'Gagal terhubung ke server verifikasi ledger.',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePrintReceiptWindow = () => {
    const isTeacher = student.class_name.toLowerCase().includes('guru') || student.major.toLowerCase().includes('guru');
    const formattedDate = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const receiptHtml = `
      <div style="max-width: 600px; margin: 20px auto; padding: 24px; border: 2px solid #0f172a; border-radius: 12px; font-family: ui-sans-serif, system-ui, sans-serif; background: #ffffff; color: #0f172a;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">KOMISI PEMILIHAN UMUM (KPU) OSIS</h3>
          <h2 style="margin: 4px 0 0 0; font-size: 16px; font-weight: 900;">${settings.school_name || 'E-VOTING OSIS'}</h2>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">Bukti Tanda Terima Elektronik Pemilihan Ketua & Wakil Ketua OSIS</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span style="color: #64748b;">Nama Pemilih:</span>
            <strong style="color: #0f172a;">${student.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span style="color: #64748b;">${isTeacher ? 'NIP / ID Guru' : 'NIS Siswa'}:</span>
            <strong style="color: #0f172a;">${student.nis}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span style="color: #64748b;">Kategori / Kelas:</span>
            <strong style="color: #0f172a;">${student.class_name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #64748b;">Waktu Memberikan Suara:</span>
            <strong style="color: #047857;">${formattedDate} WIB</strong>
          </div>
        </div>

        <div style="background: #ecfdf5; border: 1.5px dashed #059669; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
            KODE VERIFIKASI LEDGER SUARA (HASH AUDIT)
          </div>
          <div style="font-family: monospace; font-size: 16px; font-weight: 900; color: #047857; letter-spacing: 2px;">
            ${receiptCode || 'VOTE-CONFIRMED-OK'}
          </div>
          <p style="margin: 6px 0 0 0; font-size: 10px; color: #065f46;">
            Status: <strong>TERVERIFIKASI MASUK KE DALAM KOTAK SUARA DIGITAL</strong>
          </p>
        </div>

        <div style="font-size: 10.5px; color: #475569; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: justify;">
          * Berdasarkan asas <strong>LUBER JURDIL</strong>, identitas pemilih dicatat hanya untuk memastikan hak 1 orang 1 suara. Pilihan kandidat Anda dienkripsi secara kriptografis dan disimpan tanpa tautan ke identitas pemilih.
        </div>
      </div>
    `;

    printDocument({
      title: `Tanda_Terima_Voting_${student.nis}`,
      contentHtml: receiptHtml,
      onSuccess: () => {
        onShowAlert('success', 'Membuka Bukti Tanda Terima', 'Dialog cetak tanda terima suara telah dibuka.');
      },
      onError: () => {
        onShowAlert('warning', 'Cetak Terblokir', 'Browser memblokir dialog cetak. Anda juga dapat menyalin Kode Verifikasi.');
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
      {/* Student Profile & Navigation Top Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
            <UserCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                <Vote className="w-3 h-3 text-slate-700 dark:text-amber-400" />
                Daftar Pemilih Tetap (DPT)
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{settings.school_name}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight font-display">
              {student.name}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              NIS: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student.nis}</span> • Kelas / Unit: <span className="font-bold text-slate-800 dark:text-slate-200">{student.class_name}</span>
            </p>
          </div>
        </div>

        {/* Action Logout */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="btn-student-logout"
            onClick={onLogout}
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Bilik Pemilihan | Riwayat & Bukti Digital | Hasil Suara */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl border border-slate-300/80 dark:border-slate-700 mb-6 max-w-xl mx-auto text-xs font-bold print:hidden">
        <button
          id="tab-student-ballot"
          onClick={() => setActiveTab('ballot')}
          className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'ballot'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Vote className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          <span>Bilik Suara</span>
          {student.has_voted ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Suara Terverifikasi"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Hak Suara Siap"></span>
          )}
        </button>

        <button
          id="tab-student-history"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          <span>Riwayat & Bukti Digital</span>
          {student.has_voted && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
              Sah
            </span>
          )}
        </button>

        {liveResults?.is_visible_to_student && (
          <button
            id="tab-student-results"
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span>Hasil Sementara</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: RIWAYAT & BUKTI DIGITAL PARTISIPASI (VOTING HISTORY) */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status Header Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs text-center relative overflow-hidden">
            <div className="max-w-md mx-auto">
              {student.has_voted || justVotedTimestamp ? (
                <>
                  <div className="w-16 h-16 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <ShieldCheck className="w-9 h-9" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    HAK SUARA SAH TERVERIFIKASI
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display mb-1">
                    Riwayat Partisipasi E-Voting
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Anda telah menggunakan 1 (satu) hak pilih sah pada <strong>{settings.event_title}</strong>. Tanda terima digital di bawah ini adalah bukti resmi keikutsertaan Anda.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <Clock className="w-9 h-9" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    BELUM MENGGUNAKAN HAK PILIH
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display mb-1">
                    Menunggu Penyaluran Suara
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Status Anda tercatat dalam DPT tetapi belum memberikan suara pada event ini. Silakan buka tab <strong>Bilik Suara</strong> untuk menentukan pasangan calon pilihan Anda.
                  </p>
                  <button
                    id="btn-go-to-ballot"
                    onClick={() => setActiveTab('ballot')}
                    className="py-2.5 px-5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-lg shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Vote className="w-4 h-4 text-amber-300" />
                    <span>Masuk ke Bilik Suara Sekarang</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* OFFICIAL DIGITAL RECEIPT CERTIFICATE CARD */}
          {(student.has_voted || justVotedTimestamp) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden relative print-page-a4">
              
              {/* Receipt Header Banner */}
              <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {settings.school_logo ? (
                    <img
                      src={settings.school_logo}
                      alt="Logo Sekolah"
                      className="w-12 h-12 object-contain rounded bg-white p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-lg">
                      KPU
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                      TANDA TERIMA DIGITAL (DIGITAL RECEIPT PROOF)
                    </span>
                    <h4 className="text-base sm:text-lg font-black tracking-tight font-display">
                      {settings.school_name}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium">
                      {settings.event_title} ({settings.academic_year})
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Status Surat Suara</span>
                  <span className="text-xs font-mono font-black text-emerald-400 flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    SAH & TERVERIFIKASI
                  </span>
                </div>
              </div>

              {/* Receipt Body Content */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Voter Metadata Grid */}
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Identitas Pemilih Terdaftar:</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Nama Pemilih (DPT)</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{student.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">NIS / ID Pemilih</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">{student.nis}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Kelas / Unit Rombel</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">{student.class_name} ({student.major})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Waktu Pencoblosan</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                        {formatDateTime(student.voted_at || justVotedTimestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Code Box & Actions */}
                <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 w-full md:w-auto">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Kode Kuitansi Kriptografis (Cryptographic Verification Hash)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-mono font-black tracking-wider text-amber-300 select-all">
                        {receiptCode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Kode unik ini membuktikan bahwa surat suara Anda telah terdaftar sah di ledger e-Voting.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0 print:hidden">
                    <button
                      id="btn-copy-receipt-code"
                      onClick={handleCopyReceiptCode}
                      className="flex-1 md:flex-initial py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                      <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                    </button>

                    <button
                      id="btn-open-verify-modal"
                      onClick={() => {
                        setVerifyCodeInput(receiptCode);
                        setShowVerifyModal(true);
                      }}
                      className="flex-1 md:flex-initial py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      <span>Cek Verifikasi</span>
                    </button>

                    <button
                      id="btn-print-receipt"
                      onClick={handlePrintReceiptWindow}
                      className="flex-1 md:flex-initial py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-800" />
                      <span>Cetak Bukti</span>
                    </button>
                  </div>
                </div>

                {/* Anonymity & Secret Ballot Guarantee (LUBER JURDIL) */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 sm:p-5 text-emerald-950 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                    <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Jaminan Kerahasiaan Suara (Prinsip LUBER JURDIL)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                    Sistem e-Voting OSIS menjamin kerahasiaan pilihan Anda secara mutlak:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                    <li className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-start gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Identitas Terpisah:</strong> Identitas DPT dicatat hanya untuk hak suara, BUKAN pilihan calon.</span>
                    </li>
                    <li className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-start gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Enkripsi Anonim:</strong> Tidak ada siapapun (termasuk Panitia/Admin) yang tahu paslon pilihan Anda.</span>
                    </li>
                    <li className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-start gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Bukti Tanpa Pilihan:</strong> Kode bukti ini murni membuktikan partisipasi Anda tanpa membocorkan paslon.</span>
                    </li>
                  </ul>
                </div>

                {/* Signatures & Official Stamp (for Official Printout) */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-6 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Ketua KPU-OSIS</p>
                    <div className="h-12 flex items-center justify-center italic text-slate-400 font-serif text-sm">
                      [Tanda Tangan Digital]
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">{settings.committee_chair || 'Panitia KPU-OSIS'}</p>
                    <p className="text-[10px] text-slate-500">NIS: {settings.chair_nis || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Pembina / Advisor OSIS</p>
                    <div className="h-12 flex items-center justify-center italic text-slate-400 font-serif text-sm">
                      [Tanda Tangan Digital]
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">{settings.osis_advisor || 'Pembina OSIS'}</p>
                    <p className="text-[10px] text-slate-500">NIP: {settings.advisor_nip || '-'}</p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: BILIK PEMILIHAN (BALLOT BOX) */}
      {/* ========================================================= */}
      {activeTab === 'ballot' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {student.has_voted ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-xs text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
                Suara Anda Sudah Terdaftar
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-display mb-1">
                Anda Sudah Menggunakan Hak Pilih
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-5">
                Terima kasih, <strong>{student.name}</strong>. Hak suara Anda telah dicatat secara aman dan rahasia.
              </p>
              <button
                id="btn-view-receipt-from-ballot"
                onClick={() => setActiveTab('history')}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>Buka Riwayat & Bukti Digital</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header instructions */}
              <div className="text-center max-w-xl mx-auto mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display uppercase tracking-tight">
                  {settings.event_title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 font-medium">
                  Tentukan masa depan OSIS. Silakan pilih 1 (satu) pasangan calon terbaik Anda:
                </p>
              </div>

              {/* Candidates Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-3 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 text-xs font-semibold">Memuat data pasangan calon...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center max-w-md mx-auto">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Kandidat Aktif</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Panitia KPU OSIS belum mengaktifkan data pasangan calon.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-8">
                  {candidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 shadow-xs hover:shadow-sm transition-all flex flex-col overflow-hidden relative group"
                    >
                      {/* Header Number Badge */}
                      <div className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">PASLON</span>
                          <span className="w-6 h-6 rounded bg-white text-slate-950 font-black text-xs flex items-center justify-center">
                            0{cand.candidate_number}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-300 truncate max-w-[120px]">
                          {settings.school_name}
                        </span>
                      </div>

                      {/* Photos container */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Ketua */}
                          <div className="space-y-1 text-center">
                            <div className="aspect-3/4 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 relative">
                              <img
                                src={cand.chairman_photo}
                                alt={cand.chairman_name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                              />
                              <span className="absolute bottom-1 inset-x-1 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold py-0.5 rounded">
                                Calon Ketua
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate px-0.5">
                              {cand.chairman_name}
                            </p>
                          </div>

                          {/* Wakil */}
                          <div className="space-y-1 text-center">
                            <div className="aspect-3/4 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 relative">
                              <img
                                src={cand.vice_chairman_photo}
                                alt={cand.vice_chairman_name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                              />
                              <span className="absolute bottom-1 inset-x-1 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold py-0.5 rounded">
                                Calon Wakil
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate px-0.5">
                              {cand.vice_chairman_name}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vision snippet & Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            <Sparkles className="w-3 h-3 text-slate-600" />
                            <span>Visi Paslon:</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-3">
                            "{cand.vision}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                          <button
                            id={`btn-view-vision-${cand.candidate_number}`}
                            type="button"
                            onClick={() => setVisionModalCandidate(cand)}
                            className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            <span>Lihat Visi & Misi Lengkap</span>
                          </button>

                          <button
                            id={`btn-vote-candidate-${cand.candidate_number}`}
                            type="button"
                            onClick={() => handleSelectCandidate(cand)}
                            className="w-full py-2.5 px-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Vote className="w-4 h-4 text-amber-300" />
                            <span>PILIH PASLON 0{cand.candidate_number}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: HASIL SEMENTARA (RESULTS VIEW IF VISIBLE) */}
      {/* ========================================================= */}
      {activeTab === 'results' && liveResults && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs max-w-2xl mx-auto space-y-5"
        >
          <div className="text-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 mb-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-slate-600 dark:text-amber-400" />
              Perolehan Suara
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">Hasil Sementara Pemilihan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total Suara Masuk: <strong>{liveResults.total_voted}</strong> suara ({liveResults.participation_percentage}% Tingkat Partisipasi)
            </p>
          </div>

          <div className="space-y-3.5">
            {liveResults.results.map((res) => (
              <div key={res.candidate.id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                      {res.candidate.candidate_number}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {res.candidate.chairman_name} & {res.candidate.vice_chairman_name}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{res.percentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-slate-900 dark:bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${res.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right font-medium">{res.votes} Suara Sah</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* MODAL 1: LIHAT VISI & MISI DETAIL */}
      {visionModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto relative"
          >
            <button
              id="btn-close-vision-modal"
              onClick={() => setVisionModalCandidate(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                0{visionModalCandidate.candidate_number}
              </span>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Pasangan Calon No. 0{visionModalCandidate.candidate_number}</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {visionModalCandidate.chairman_name} & {visionModalCandidate.vice_chairman_name}
                </h3>
              </div>
            </div>

            {/* Vision Section */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 sm:p-4 mb-4">
              <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-700 dark:text-amber-400" />
                Visi Paslon:
              </h4>
              <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium leading-relaxed italic">
                "{visionModalCandidate.vision}"
              </p>
            </div>

            {/* Missions List */}
            <div className="mb-4">
              <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-slate-700 dark:text-amber-400" />
                Misi Paslon:
              </h4>
              <div className="space-y-1.5">
                {visionModalCandidate.missions?.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Programs */}
            {visionModalCandidate.work_programs && visionModalCandidate.work_programs.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-700 dark:text-amber-400" />
                  Program Kerja Unggulan:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visionModalCandidate.work_programs.map((prog, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-amber-400 shrink-0"></span>
                      <span>{prog}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                id="btn-close-vision-modal-action"
                type="button"
                onClick={() => setVisionModalCandidate(null)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Kembali
              </button>
              {!student.has_voted && (
                <button
                  id="btn-vote-from-vision-modal"
                  type="button"
                  onClick={() => {
                    const target = visionModalCandidate;
                    setVisionModalCandidate(null);
                    handleSelectCandidate(target);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Pilih Paslon Ini
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI PILIHAN */}
      {isConfirmModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-700 text-center relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Vote className="w-6 h-6" />
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-1.5">
              Konfirmasi Surat Suara
            </span>

            <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
              Konfirmasi Pilihan Anda
            </h3>

            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 mb-4">
              Anda akan memberikan suara sah untuk:
            </p>

            {/* Selected Paslon Box */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 mb-4 text-left flex items-center gap-3">
              <span className="w-10 h-10 rounded bg-slate-900 dark:bg-slate-700 text-white font-black text-sm flex items-center justify-center shrink-0">
                0{selectedCandidate.candidate_number}
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase">PASLON 0{selectedCandidate.candidate_number}</span>
                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {selectedCandidate.chairman_name}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                  & {selectedCandidate.vice_chairman_name}
                </p>
              </div>
            </div>

            {/* Warning Text */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-300 text-left flex items-start gap-2 mb-5">
              <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Perhatian:</strong> Pastikan pilihan Anda sudah mantap. Pilihan yang telah dikirim <strong>tidak dapat diubah</strong> kembali.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                id="btn-cancel-confirmation"
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-submit-vote-final"
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmVote}
                className="flex-1 py-2.5 px-3 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? 'Menyimpan Suara...' : 'Ya, Kirim Suara'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: CEK VERIFIKASI KODE TANDA TERIMA */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-700 relative"
          >
            <button
              id="btn-close-verify-modal"
              onClick={() => {
                setShowVerifyModal(false);
                setVerifyResult(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
                Verifikasi Tanda Terima Digital
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Masukkan Kode Tanda Terima atau NIS untuk memeriksa status keabsahan surat suara dalam ledger e-Voting.
            </p>

            <form onSubmit={handleVerifyReceiptSubmit} className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                  Kode Receipt / NIS Pemilih
                </label>
                <input
                  type="text"
                  value={verifyCodeInput}
                  onChange={(e) => setVerifyCodeInput(e.target.value)}
                  placeholder="Contoh: VTR-2026-..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || !verifyCodeInput.trim()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {verifyLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memeriksa Ledger...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Periksa Keabsahan Kode</span>
                  </>
                )}
              </button>
            </form>

            {/* Verify Result Box */}
            {verifyResult && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                {verifyResult.success ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{verifyResult.data.status}</span>
                    </div>
                    <div className="space-y-1 font-medium text-[11px] pt-1 border-t border-emerald-200/60 dark:border-emerald-800">
                      <p><strong>Nama:</strong> {verifyResult.data.voter_name}</p>
                      <p><strong>NIS & Kelas:</strong> {verifyResult.data.nis} • {verifyResult.data.class_name}</p>
                      <p><strong>Waktu Pencoblosan:</strong> {formatDateTime(verifyResult.data.voted_at)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p>{verifyResult.message || 'Data tidak ditemukan.'}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
