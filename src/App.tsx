import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { CountdownView } from './components/CountdownView';
import { StudentVotingView } from './components/StudentVotingView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminStudents } from './components/AdminStudents';
import { AdminCandidates } from './components/AdminCandidates';
import { AdminResults } from './components/AdminResults';
import { AdminReports } from './components/AdminReports';
import { AdminSettings } from './components/AdminSettings';
import { AdminAuditLogs } from './components/AdminAuditLogs';
import { NotificationModal } from './components/NotificationModal';
import { User, Student, Settings, AlertState, ConfirmState, DashboardStats } from './types';
import { isVotingOngoing, getEffectiveStatus } from './utils/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<Settings>({
    school_name: 'SMAN 1 Sukabumi',
    academic_year: '2025/2026',
    event_title: 'Pemilihan Ketua & Wakil Ketua OSIS Masa Bakti 2025/2026',
    election_status: 'ongoing',
    result_visibility: 'after_ended',
    start_time: null,
    end_time: null,
  });

  const [loading, setLoading] = useState(true);

  // Theme Switcher State (Persisted in localStorage)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('evoting_theme') : null;
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('evoting_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // SweetAlert-style notifications
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Top Progress Bar & Sync Status State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [votingStats, setVotingStats] = useState<DashboardStats | null>(null);

  const updateProcessing = (active: boolean, label: string = '', percent: number = 0) => {
    setIsProcessing(active);
    setProgressLabel(label);
    setProgressPercent(percent);
    if (!active) {
      fetchVotingStats();
    }
  };

  const fetchVotingStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.success && data.data) {
          setVotingStats(data.data);
        }
      }
    } catch (err) {
      console.warn('Voting stats update skipped (network or server reloading):', err);
    }
  };

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Login vs Countdown Toggle for unauthenticated users
  const [showLoginOverride, setShowLoginOverride] = useState(false);
  const [initialRoleFocus, setInitialRoleFocus] = useState<'admin' | 'voter'>('voter');

  // Load Settings and Session on Mount
  useEffect(() => {
    initApp();
    fetchVotingStats();
  }, []);

  // Poll Voting Stats ONLY when voting is active / ongoing
  useEffect(() => {
    if (!isVotingOngoing(settings)) return;
    const interval = setInterval(() => {
      fetchVotingStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [settings]);

  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Fetch settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData && settingsData.success && settingsData.data) {
          setSettings(settingsData.data);
        }
      }

      // 2. Check local saved session
      const savedUser = localStorage.getItem('evoting_user');
      const savedStudent = localStorage.getItem('evoting_student');

      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          setCurrentUser(u);
          if (u.role === 'admin' || u.role === 'superadmin') {
            setActiveTab('dashboard');
          }
        } catch {
          localStorage.removeItem('evoting_user');
        }
      }

      if (savedStudent) {
        try {
          const s = JSON.parse(savedStudent);
          // Refresh fresh status from server
          try {
            const sRes = await fetch(`/api/students`);
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData && sData.success && Array.isArray(sData.data)) {
                const fresh = sData.data.find((item: Student) => item.id === s.id);
                if (fresh) {
                  setCurrentStudent(fresh);
                  localStorage.setItem('evoting_student', JSON.stringify(fresh));
                } else {
                  setCurrentStudent(s);
                }
              } else {
                setCurrentStudent(s);
              }
            } else {
              setCurrentStudent(s);
            }
          } catch {
            setCurrentStudent(s);
          }
        } catch {
          localStorage.removeItem('evoting_student');
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const handleLoginSuccess = (session: {
    role: 'admin' | 'superadmin' | 'student';
    token: string;
    user?: any;
    student?: any;
  }) => {
    if (session.token) {
      localStorage.setItem('evoting_token', session.token);
    }
    const isSessionAdmin =
      session.role === 'admin' ||
      session.role === 'superadmin' ||
      session.user?.role === 'admin' ||
      session.user?.role === 'superadmin';

    if (isSessionAdmin && session.user) {
      setCurrentUser(session.user);
      setCurrentStudent(null);
      localStorage.setItem('evoting_user', JSON.stringify(session.user));
      localStorage.removeItem('evoting_student');
      setActiveTab('dashboard');
    } else if (session.role === 'student' && session.student) {
      const studentUser: User = {
        id: session.student.id,
        username: session.student.nis,
        name: session.student.name,
        role: 'student',
      };
      setCurrentUser(studentUser);
      setCurrentStudent(session.student);
      localStorage.setItem('evoting_user', JSON.stringify(studentUser));
      localStorage.setItem('evoting_student', JSON.stringify(session.student));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentStudent(null);
    localStorage.removeItem('evoting_user');
    localStorage.removeItem('evoting_student');
    localStorage.removeItem('evoting_token');
    showAlert('info', 'Sampai Jumpa', 'Anda telah berhasil keluar dari sistem E-Voting.');
  };

  const handleRefreshStudent = async () => {
    if (!currentStudent) return;
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        const fresh = data.data.find((s: Student) => s.id === currentStudent.id);
        if (fresh) {
          setCurrentStudent(fresh);
          localStorage.setItem('evoting_student', JSON.stringify(fresh));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    try {
      const token = localStorage.getItem('evoting_token');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      showAlert('error', 'Gagal', err.message || 'Gagal menyimpan pengaturan.');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-700 dark:text-slate-200 font-bold text-sm">Memuat Sistem E-Voting OSIS...</p>
        </div>
      </div>
    );
  }

  const isVotingNotStarted = getEffectiveStatus(settings) === 'draft';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex justify-center items-start sm:py-6 p-0 font-sans antialiased selection:bg-slate-900 selection:text-white transition-colors">
      {/* Dedicated Mobile Frame Container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[850px] bg-white dark:bg-slate-900 flex flex-col shadow-2xl relative sm:rounded-2xl border-x sm:border border-slate-200 dark:border-slate-800 overflow-clip transition-colors">
        
        {/* Sticky Top Header Container (Fixed Navbar & Voter Progress Bar on Scroll) */}
        <div className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200/80 dark:border-slate-800">
          {/* Top Universal Navbar (Only when logged in) */}
          {currentUser && (
            <Navbar
              user={currentUser}
              student={currentStudent}
              settings={settings}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}

          {/* Visual Election Progress Bar & Sync Indicator */}
          <div className="w-full bg-slate-900 border-t border-slate-800/80">
            {/* Animated Gradient Progress Line */}
            <div className="w-full bg-slate-800/80 h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out shadow-xs ${
                  isProcessing 
                    ? 'bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 animate-pulse' 
                    : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                }`}
                style={{
                  width: isProcessing 
                    ? `${Math.max(8, progressPercent)}%` 
                    : `${Math.max(3, votingStats?.participation_percentage || 0)}%`
                }}
              />
            </div>

            {/* Status Bar Info Ticker */}
            <div className="bg-slate-950 px-3.5 py-1 text-[11px] font-bold flex items-center justify-between border-t border-slate-900">
              <div className="flex items-center gap-2 truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isProcessing ? 'bg-sky-400' : 'bg-indigo-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isProcessing ? 'bg-sky-500' : 'bg-indigo-500'}`}></span>
                </span>
                <span className="truncate tracking-tight text-slate-200">
                  {isProcessing
                    ? progressLabel || 'Memproses & Menyinkronkan Data...'
                    : votingStats
                      ? `Progres Suara Masuk: ${votingStats.participation_percentage}% (${votingStats.total_voted} / ${votingStats.total_students} Pemilih)`
                      : 'Progres Pemungutan Suara E-Voting'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-black border ${
                  isProcessing
                    ? 'text-sky-400 bg-sky-950/80 border-sky-800/60'
                    : 'text-indigo-300 bg-indigo-950/80 border-indigo-800/50'
                }`}>
                  {isProcessing
                    ? `${Math.round(progressPercent)}% PROSES`
                    : votingStats
                      ? `${votingStats.participation_percentage}% SUARA`
                      : '0% SUARA'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area in Mobile & Desktop Layout */}
        <main className="flex-1 w-full p-4 sm:p-6 pb-24 md:pb-8">
          
          {/* If user not logged in -> Show Countdown View if not started, or Login View */}
          {!currentUser && (
            isVotingNotStarted && !showLoginOverride ? (
              <CountdownView
                settings={settings}
                onOpenLogin={(role) => {
                  setInitialRoleFocus('admin');
                  setShowLoginOverride(true);
                }}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            ) : (
              <LoginView
                settings={settings}
                onLoginSuccess={handleLoginSuccess}
                onShowAlert={showAlert}
                onBackToCountdown={isVotingNotStarted ? () => setShowLoginOverride(false) : undefined}
                initialRoleFocus={initialRoleFocus}
                isVotingNotStarted={isVotingNotStarted}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )
          )}

          {/* If Student -> Show Voting Screen */}
          {currentUser?.role === 'student' && currentStudent && (
            <StudentVotingView
              student={currentStudent}
              settings={settings}
              onLogout={handleLogout}
              onRefreshStudent={handleRefreshStudent}
              onShowAlert={showAlert}
              onSetProcessing={updateProcessing}
            />
          )}

          {/* If Admin -> Show Respective Tab Component */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
            <div className="space-y-4">
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  settings={settings}
                  onNavigateTab={setActiveTab}
                  onShowAlert={showAlert}
                  onShowConfirm={showConfirm}
                  onRefreshData={initApp}
                />
              )}

              {activeTab === 'students' && (
                <AdminStudents
                  settings={settings}
                  onShowAlert={showAlert}
                  onShowConfirm={showConfirm}
                />
              )}

              {activeTab === 'candidates' && (
                <AdminCandidates
                  onShowAlert={showAlert}
                  onShowConfirm={showConfirm}
                />
              )}

              {activeTab === 'results' && (
                <AdminResults
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onShowAlert={showAlert}
                />
              )}

              {activeTab === 'reports' && (
                <AdminReports
                  settings={settings}
                  onShowAlert={showAlert}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'settings' && (
                <AdminSettings
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onShowAlert={showAlert}
                />
              )}

              {activeTab === 'logs' && (
                <AdminAuditLogs
                  onShowAlert={showAlert}
                  onShowConfirm={showConfirm}
                />
              )}
            </div>
          )}

        </main>

        {/* Footer (Only shown when logged in) */}
        {currentUser && (
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-[11px] text-slate-500 dark:text-slate-400 mt-auto">
            <div className="px-4 flex flex-col items-center justify-center gap-1">
              <p className="font-medium">
                © {new Date().getFullYear()} <strong>E-Voting OSIS</strong> — {settings.school_name}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <span>Asas LUBER JURDIL</span>
                <span>•</span>
                <span>Mobile Version</span>
              </div>
            </div>
          </footer>
        )}

        {/* Global SweetAlert Notification Modal */}
        <NotificationModal
          isOpen={alert.isOpen}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert({ ...alert, isOpen: false })}
        />

        {/* Global Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xs sm:max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mb-1.5">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-2.5">
                <button
                  id="btn-confirm-cancel"
                  type="button"
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-action"
                  type="button"
                  onClick={() => {
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    confirmModal.onConfirm();
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
