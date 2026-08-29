import React, { useState, useEffect } from 'react';
import {
  Vote,
  LayoutDashboard,
  Users,
  Award,
  BarChart3,
  FileText,
  Settings as SettingsIcon,
  ShieldAlert,
  LogOut,
  Clock,
  Menu,
  X,
  School,
  Sun,
  Moon,
} from 'lucide-react';
import { Settings, User, Student, ElectionStatus } from '../types';

interface NavbarProps {
  settings: Settings;
  user: User | null;
  student: Student | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onRefreshData?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Navbar({
  settings,
  user,
  student,
  activeTab,
  onTabChange,
  onLogout,
  theme = 'light',
  onToggleTheme,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [timeStatus, setTimeStatus] = useState<ElectionStatus>(settings.election_status);

  // Live countdown timer logic
  useEffect(() => {
    const calculateCountdown = () => {
      if (settings.election_status === 'ended') {
        setTimeStatus('ended');
        setCountdown('Pemilihan Selesai');
        return;
      }

      const now = new Date().getTime();
      const startTime = settings.start_time || settings.start_datetime;
      const endTime = settings.end_time || settings.end_datetime;

      const start = startTime ? new Date(startTime).getTime() : NaN;
      const end = endTime ? new Date(endTime).getTime() : NaN;

      if (!isNaN(end) && now >= end) {
        setTimeStatus('ended');
        setCountdown('Pemilihan Selesai');
        return;
      }

      if (!isNaN(start) && now < start && settings.election_status !== 'ongoing') {
        setTimeStatus('draft');
        const diff = Math.floor((start - now) / 1000);
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        setCountdown(
          `Mulai dlm ${days > 0 ? `${days}h ` : ''}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
        return;
      }

      setTimeStatus('ongoing');
      if (!isNaN(end)) {
        const diff = Math.floor((end - now) / 1000);
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        setCountdown(
          `${days > 0 ? `${days}h ` : ''}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        setCountdown('Sedang Berlangsung');
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Data Pemilih', icon: Users },
    { id: 'candidates', label: 'Kandidat Paslon', icon: Award },
    { id: 'results', label: 'Hasil Suara', icon: BarChart3 },
    { id: 'reports', label: 'Berita Acara', icon: FileText },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
    { id: 'logs', label: 'Audit Log', icon: ShieldAlert },
  ];

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: School Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs border border-slate-200/60 dark:border-slate-700">
              {settings.school_logo ? (
                <img
                  src={settings.school_logo}
                  alt="Logo Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white tracking-tight truncate font-display">
                  {settings.school_name || 'E-Voting OSIS'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 rounded-md shrink-0">
                  TP {settings.academic_year}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                {settings.event_title}
              </p>
            </div>
          </div>

          {/* Center Status & Countdown Indicator */}
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-xs shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  timeStatus === 'ongoing'
                    ? 'bg-emerald-500'
                    : timeStatus === 'draft'
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className={`font-black uppercase tracking-wider text-[10px] ${
                timeStatus === 'ongoing'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : timeStatus === 'draft'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}>
                {timeStatus === 'ongoing'
                  ? 'VOTING DIBUKA'
                  : timeStatus === 'draft'
                  ? 'BELUM DIMULAI'
                  : 'VOTING SELESAI'}
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-bold">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{countdown}</span>
            </div>
          </div>

          {/* Right Action & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {onToggleTheme && (
              <button
                id="btn-toggle-theme"
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

            {(user || student) && (
              <div className="hidden sm:flex items-center gap-2">
                <div 
                  title={isAdmin ? user?.name || 'Admin KPU' : student?.name}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0"
                >
                  {isAdmin ? 'AD' : student?.name.charAt(0) || 'S'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[120px]">
                    {isAdmin ? user?.name || 'Admin KPU' : student?.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                    {isAdmin ? 'Panitia KPU' : student?.class_name}
                  </p>
                </div>
              </div>
            )}

            {(user || student) && (
              <button
                id="btn-logout"
                type="button"
                onClick={onLogout}
                title="Keluar dari Akun"
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-rose-600 transition-colors" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin Navigation Bar for Desktop (Sleek Pill Tabs) */}
        {isAdmin && (
          <nav className="hidden md:flex items-center gap-1 py-1.5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-400 dark:text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Admin Bottom Navigation Bar for Mobile Viewport (Only visible on small screens < md) */}
      {isAdmin && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-safe">
          <nav className="w-full max-w-lg pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-1.5 py-1.5 flex items-end justify-between shadow-2xl">
            {[
              { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
              { id: 'students', label: 'Pemilih', icon: Users },
              { id: 'candidates', label: 'Paslon', icon: Award, isCenter: true },
              { id: 'results', label: 'Hasil', icon: BarChart3 },
              { id: 'settings', label: 'Setelan', icon: SettingsIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.isCenter) {
                return (
                  <div key={item.id} className="w-1/5 flex flex-col items-center justify-center">
                    <button
                      id={`bottom-nav-${item.id}`}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className="flex flex-col items-center justify-center -mt-6 mb-0.5 group cursor-pointer"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-90 border-4 border-white dark:border-slate-900 ${
                        isActive
                          ? 'bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white shadow-indigo-500/40 scale-105 ring-2 ring-indigo-300'
                          : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white shadow-slate-900/30 group-hover:scale-105'
                      }`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className={`text-[11px] font-black mt-1 leading-none ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.label}
                      </span>
                    </button>
                  </div>
                );
              }

              return (
                <div key={item.id} className="w-1/5 flex flex-col items-center justify-center">
                  <button
                    id={`bottom-nav-${item.id}`}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/90 dark:bg-indigo-950/70'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 dark:text-slate-400'}`} />
                    <span className="text-[11px] font-bold leading-none">{item.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
