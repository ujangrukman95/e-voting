import React, { useState } from 'react';
import {
  User,
  KeyRound,
  ArrowRight,
  School,
  Sparkles,
  Info,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Eye,
  EyeOff,
  Clock,
  ChevronLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { Settings } from '../types';

interface LoginViewProps {
  settings: Settings;
  onLoginSuccess: (session: {
    role: 'admin' | 'superadmin' | 'student';
    token: string;
    user?: any;
    student?: any;
  }) => void;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
  onBackToCountdown?: () => void;
  initialRoleFocus?: 'admin' | 'voter';
  isVotingNotStarted?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function LoginView({
  settings,
  onLoginSuccess,
  onShowAlert,
  onBackToCountdown,
  isVotingNotStarted = false,
  theme = 'light',
  onToggleTheme,
}: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-fill credentials if user scanned QR code with URL params
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlUser = params.get('user') || params.get('username') || params.get('nis');
      const urlPin = params.get('pin') || params.get('pass') || params.get('password');
      if (urlUser) {
        setIdentifier(urlUser);
      }
      if (urlPin) {
        setSecret(urlPin);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !secret.trim()) {
      onShowAlert(
        'warning',
        'Data Belum Lengkap',
        'Silakan masukkan Username dan Password Anda.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: secret.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.role === 'admin' || data.role === 'superadmin' || data.user) {
          onLoginSuccess({
            role: 'admin',
            token: data.token,
            user: data.user,
          });
        } else {
          onLoginSuccess({
            role: 'student',
            token: data.token,
            student: data.student,
          });
        }
      } else {
        onShowAlert(
          'error',
          'Login Gagal',
          data.message || 'Username atau Password yang Anda masukkan tidak sesuai.'
        );
      }
    } catch (err) {
      onShowAlert('error', 'Koneksi Bermasalah', 'Gagal menghubungi server aplikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col justify-center items-center py-4 px-2 sm:px-4">
      <div className="max-w-md w-full">
        
        {/* Top Header Bar with Theme Toggle and Back Button */}
        <div className="flex items-center justify-between mb-4 gap-2">
          {onBackToCountdown ? (
            <button
              type="button"
              id="btn-back-to-countdown"
              onClick={onBackToCountdown}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Hitung Mundur</span>
            </button>
          ) : <div />}

          {onToggleTheme && (
            <button
              id="btn-toggle-theme-login"
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              aria-label="Ganti Tema Mode Terang/Gelap"
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}
        </div>

        {/* School Logo & Header Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 shadow-xs mx-auto mb-3 flex items-center justify-center">
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
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            E-Voting OSIS • TP {settings.academic_year}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            {settings.school_name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {settings.event_title}
          </p>
        </div>

        {/* Unified Card Container (Figma / Google Clean Box) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-7">
          
          {/* Petunjuk Login jika belum dimulai */}
          {isVotingNotStarted && (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200/90 dark:border-amber-800/90 rounded-lg p-3.5 mb-5 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Akses Khusus Panitia / Admin</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Pemilihan suara belum dimulai. Akses login pemilih saat ini ditutup dan hanya panitia yang dapat masuk untuk mengelola sistem.
              </p>
            </div>
          )}

          {/* Unified Login Form */}
          <form onSubmit={handleUnifiedLogin} className="space-y-4">
            
            {/* Input 1: Username */}
            <div>
              <label 
                htmlFor="input-login-identifier"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-login-identifier"
                  type="text"
                  required
                  autoFocus
                  placeholder="Masukkan Username Anda"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Input 2: Password */}
            <div>
              <label 
                htmlFor="input-login-secret"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="input-login-secret"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan Password Anda"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  id="btn-toggle-show-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-unified-login"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 active:bg-black text-white font-bold rounded-lg text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span>Memverifikasi akun...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer Guarantee */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 leading-relaxed">
          {settings.footer_text || 'Komisi Pemilihan Umum OSIS. Asas Langsung, Umum, Bebas, Rahasia, Jujur & Adil.'}
        </p>
      </div>
    </div>
  );
}
