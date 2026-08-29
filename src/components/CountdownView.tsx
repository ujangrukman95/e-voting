import React, { useState, useEffect } from 'react';
import {
  Clock,
  School,
  Sparkles,
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  ArrowRight,
  User,
  Info,
  ChevronRight,
  X,
  Layers,
  Sun,
  Moon,
} from 'lucide-react';
import { Settings, Candidate } from '../types';

interface CountdownViewProps {
  settings: Settings;
  onOpenLogin: (preferredRole?: 'admin' | 'voter') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function CountdownView({ settings, onOpenLogin, theme = 'light', onToggleTheme }: CountdownViewProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Time remaining state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    totalSeconds: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    totalSeconds: 0,
  });

  // Calculate target date
  const targetDateStr = settings.start_datetime || settings.start_time;

  useEffect(() => {
    // Load candidates for preview
    fetch('/api/candidates')
      .then((r) => (r.ok ? r.json() : { success: false }))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data)) {
          setCandidates(data.data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      if (!targetDateStr) {
        // Default 2 hours from now if not configured
        setTimeLeft({
          days: 0,
          hours: 2,
          minutes: 0,
          seconds: 0,
          isPast: false,
          totalSeconds: 7200,
        });
        return;
      }

      const target = new Date(targetDateStr).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          totalSeconds: 0,
        });
      } else {
        const totalSecs = Math.floor(diff / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isPast: false,
          totalSeconds: totalSecs,
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const formatScheduleDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Menunggu penetapan panitia';
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 sm:px-6 relative">
      
      {/* Top Right Theme Toggle Button */}
      {onToggleTheme && (
        <div className="flex justify-end mb-2">
          <button
            id="btn-toggle-theme-countdown"
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
            aria-label="Ganti Tema Mode Terang/Gelap"
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      )}

      {/* Top School Branding Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 shadow-xs mx-auto mb-3 flex items-center justify-center">
          {settings.school_logo ? (
            <img
              src={settings.school_logo}
              alt="Logo Sekolah"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <School className="w-10 h-10 text-slate-800 dark:text-slate-200" />
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 mb-2.5">
          <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-pulse" />
          <span>Bilik Suara Belum Dibuka • Periode Persiapan TPS</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">
          {settings.school_name}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium mt-1">
          {settings.event_title} — Tahun Pelajaran {settings.academic_year}
        </p>
      </div>

      {/* Main Countdown Figma/Google Box */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Hitung Mundur Pembukaan Bilik Suara (E-Voting)
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Waktu tersisa menuju pembukaan akses pemilihan bagi seluruh siswa & dewan guru
          </p>
        </div>

        {/* 4 Digits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto mb-6">
          {/* Days */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Hari
            </div>
          </div>

          {/* Hours */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Jam
            </div>
          </div>

          {/* Minutes */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Menit
            </div>
          </div>

          {/* Seconds */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-5xl font-black font-mono text-cyan-800 dark:text-cyan-400 tracking-tight">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Detik
            </div>
          </div>
        </div>

        {/* Schedule Info Box */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Mulai Voting: </span>
              <strong className="text-slate-900 dark:text-white">{formatScheduleDate(settings.start_datetime || settings.start_time)}</strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 sm:pl-3 pt-1.5 sm:pt-0">
            Asas LUBER JURDIL
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
          
          {/* Button: Masuk sebagai Panitia / Admin */}
          <button
            type="button"
            id="btn-countdown-admin-login"
            onClick={() => onOpenLogin('admin')}
            className="w-full sm:w-auto py-3 px-6 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 active:bg-black text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-slate-300" />
            <span>Masuk Sebagai Panitia / Admin</span>
          </button>
        </div>

        <div className="text-center mt-3">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            💡 Panitia KPU OSIS dapat mengaktifkan bilik suara sewaktu-waktu melalui menu Pengaturan di Akun Admin.
          </p>
        </div>
      </div>

      {/* Paslon Profile Preview Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span>Profil Pasangan Calon Ketua & Wakil Ketua OSIS</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pelajari visi, misi, dan program kerja para kandidat sebelum memberikan suara
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            {candidates.length} Paslon
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                {/* Candidate Number Header */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-700 text-white font-mono">
                    PASLON 0{c.candidate_number}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    Kandidat Resmi
                  </span>
                </div>

                {/* Candidate Photos */}
                <div className="grid grid-cols-2 gap-2 mb-3.5">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={c.chairman_photo}
                      alt={c.chairman_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs py-1 px-1.5 text-center text-[10px] font-bold text-white truncate">
                      Ketua
                    </div>
                  </div>

                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={c.vice_chairman_photo}
                      alt={c.vice_chairman_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs py-1 px-1.5 text-center text-[10px] font-bold text-white truncate">
                      Wakil
                    </div>
                  </div>
                </div>

                {/* Names */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {c.chairman_name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  & {c.vice_chairman_name}
                </p>

                {/* Vision snippet */}
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mt-2.5 italic bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
                  "{c.vision}"
                </p>
              </div>

              {/* View Full Detail Button */}
              <button
                type="button"
                onClick={() => setSelectedCandidate(c)}
                className="mt-4 w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Lihat Visi & Misi Lengkap</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Candidate Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-700 text-white font-mono font-bold text-xs">
                  PASLON 0{selectedCandidate.candidate_number}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedCandidate.chairman_name} & {selectedCandidate.vice_chairman_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Vision */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <h5 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Visi:
                </h5>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
                  {selectedCandidate.vision}
                </p>
              </div>

              {/* Missions */}
              <div>
                <h5 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Misi:
                </h5>
                <ul className="space-y-1.5 pl-4 list-decimal text-slate-700 dark:text-slate-300">
                  {selectedCandidate.missions?.map((m, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Work Programs */}
              {selectedCandidate.work_programs && selectedCandidate.work_programs.length > 0 && (
                <div>
                  <h5 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Program Kerja Unggulan:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCandidate.work_programs.map((wp, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-800 dark:text-slate-200"
                      >
                        • {wp}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="py-2 px-4 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 mt-8">
        © {new Date().getFullYear()} Komisi Pemilihan Umum OSIS (KPU OSIS) • Asas Langsung, Umum, Bebas, Rahasia, Jujur & Adil.
      </footer>
    </div>
  );
}
