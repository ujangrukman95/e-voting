import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  Award,
  Vote,
  Clock,
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  School,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  ShieldAlert,
  LayoutGrid,
} from 'lucide-react';
import { DashboardStats, Candidate, Settings, ResultsData } from '../types';
import { isVotingOngoing, getEffectiveStatus } from '../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface AdminDashboardProps {
  settings: Settings;
  onNavigateTab: (tab: string) => void;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onRefreshData: () => Promise<void>;
}

export function AdminDashboard({
  settings,
  onNavigateTab,
  onShowAlert,
  onShowConfirm,
  onRefreshData,
}: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const effectiveStatus = getEffectiveStatus(settings);
  const isOngoing = effectiveStatus === 'ongoing';

  useEffect(() => {
    // Initial fetch on mount or status change
    loadDashboardData(false);

    // ONLY auto-poll and auto-sync if voting is currently ONGOING
    if (isOngoing) {
      const interval = setInterval(() => {
        loadDashboardData(true);
      }, 4000); // Fast live poll update every 4 seconds while ongoing
      return () => clearInterval(interval);
    }
  }, [settings.election_status, settings.start_datetime, settings.end_datetime, settings.start_time, settings.end_time]);

  const loadDashboardData = async (isBackgroundSync = false) => {
    if (isBackgroundSync) {
      setIsSyncing(true);
    } else {
      setLoading(true);
    }

    try {
      const [statsRes, candRes, resRes] = await Promise.all([
        fetch('/api/stats').then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false })),
        fetch('/api/candidates?include_votes=true').then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false })),
        fetch('/api/results?role=admin').then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false })),
      ]);

      if (statsRes && statsRes.success) setStats(statsRes.data);
      if (candRes && candRes.success) setCandidates(candRes.data);
      if (resRes && resRes.success) setResults(resRes.data);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      await loadDashboardData(false);
      if (onRefreshData) {
        await onRefreshData();
      }
      onShowAlert('info', 'Data Diperbarui', 'Data statistik & status e-voting telah dimuat ulang secara real-time.');
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      onShowAlert('error', 'Gagal Refresh', 'Gagal memuat ulang data dari server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'ongoing' | 'ended' | 'draft') => {
    const actionLabel =
      newStatus === 'ongoing'
        ? 'Buka Pemilihan'
        : newStatus === 'ended'
        ? 'Tutup Pemilihan'
        : 'Kembalikan ke Draft';

    const now = new Date().getTime();
    const startTime = settings.start_datetime ? new Date(settings.start_datetime).getTime() : NaN;
    const isEarly = newStatus === 'ongoing' && !isNaN(startTime) && now < startTime;

    const scheduleWarning = isEarly
      ? ` (Catatan: Menurut jadwal di Pengaturan, tanggal mulai belum tiba. Membuka pemilihan sekarang akan secara otomatis menyesuaikan tanggal mulai ke saat ini agar bilik suara langsung dapat diakses pemilih).`
      : '';

    onShowConfirm(
      `Konfirmasi ${actionLabel}`,
      `Apakah Anda yakin ingin mengubah status pemilihan menjadi ${
        newStatus === 'ongoing' ? 'SEDANG BERLANGSUNG' : newStatus === 'ended' ? 'SELESAI' : 'BELUM DIMULAI'
      }? Siswa ${newStatus === 'ongoing' ? 'akan dapat' : 'tidak akan dapat'} memberikan suara.${scheduleWarning}`,
      async () => {
        setActionLoading(true);
        try {
          const token = localStorage.getItem('evoting_token');
          const res = await fetch('/api/settings/toggle-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ status: newStatus }),
          });
          const data = await res.json();
          if (data.success) {
            onShowAlert('success', 'Status Berhasil Diubah', data.message);
            await onRefreshData();
            await loadDashboardData();
          } else {
            onShowAlert('error', 'Gagal', data.message);
          }
        } catch (e) {
          onShowAlert('error', 'Error', 'Gagal memperbarui status ke server.');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Chart 1: Perolehan Suara Paslon
  const barChartData = {
    labels: results?.results.map((r) => `Paslon 0${r.candidate.candidate_number}`) || [],
    datasets: [
      {
        label: 'Perolehan Suara Sah',
        data: results?.results.map((r) => r.votes) || [],
        backgroundColor: ['rgba(8, 145, 178, 0.85)', 'rgba(59, 130, 246, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(245, 158, 11, 0.85)'],
        borderColor: ['#0891b2', '#2563eb', '#059669', '#d97706'],
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  // Chart 2: Partisipasi Pemilih (Doughnut)
  const doughnutData = {
    labels: ['Sudah Memilih', 'Belum Memilih'],
    datasets: [
      {
        data: [stats?.total_voted || 0, stats?.total_unvoted || 0],
        backgroundColor: ['#0891b2', '#e2e8f0'],
        borderColor: ['#0e7490', '#cbd5e1'],
        borderWidth: 1,
      },
    ],
  };

  // Chart 3: Partisipasi per Kelas (Bar)
  const classLabels = stats?.class_participation.map((c) => c.class_name) || [];
  const classVoted = stats?.class_participation.map((c) => c.voted) || [];
  const classTotal = stats?.class_participation.map((c) => c.total) || [];

  const classBarData = {
    labels: classLabels,
    datasets: [
      {
        label: 'Sudah Memilih',
        data: classVoted,
        backgroundColor: 'rgba(8, 145, 178, 0.85)',
        borderRadius: 6,
      },
      {
        label: 'Total Siswa',
        data: classTotal,
        backgroundColor: 'rgba(226, 232, 240, 0.9)',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Status Controls */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        {/* Background Watermark */}
        <div className="absolute right-2 sm:right-4 bottom-2 select-none pointer-events-none opacity-[0.08] flex flex-col items-end z-0">
          <span className="text-5xl sm:text-7xl font-black font-display tracking-tighter uppercase text-white leading-none">
            E-VOTING
          </span>
          <span className="text-[9px] sm:text-xs font-bold tracking-widest text-white uppercase -mt-1">
            OSIS SYSTEM
          </span>
        </div>

        <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              effectiveStatus === 'ongoing'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : effectiveStatus === 'draft'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                effectiveStatus === 'ongoing' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              {effectiveStatus === 'ongoing'
                ? 'PEMILIHAN BERLANGSUNG'
                : effectiveStatus === 'draft'
                ? 'BELUM DIMULAI'
                : 'PEMILIHAN SELESAI'}
            </span>
          </div>
          
          {/* Automatic Realtime Live Sync Indicator */}
          {effectiveStatus === 'ongoing' ? (
            <div
              id="indicator-realtime-live"
              title="Data diperbarui otomatis secara real-time tanpa perlu klik"
              className="p-1.5 px-3 rounded-xl flex items-center gap-2 text-xs font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 select-none shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-300' : 'text-emerald-400'}`} />
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Realtime
              </span>
            </div>
          ) : (
            <div
              id="indicator-status-standby"
              className="p-1.5 px-3 rounded-xl flex items-center gap-1.5 text-xs font-medium border bg-white/10 text-slate-300 border-white/10 select-none"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 opacity-60" />
              <span>Standby</span>
            </div>
          )}
        </div>

        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight font-display mb-1 text-white">
          E-Voting OSIS Dashboard
        </h2>
        <p className="text-xs text-slate-300 font-medium mb-4">
          {settings.school_name || 'OSIS Election System'} • TP {settings.academic_year}
        </p>

        {/* Action Toggle Button inside Banner */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-[11px] text-slate-400 font-medium">Kontrol Akses Bilik Suara:</span>
          {settings.election_status !== 'ongoing' ? (
            <button
              id="btn-quick-open-voting"
              type="button"
              disabled={actionLoading}
              onClick={() => handleToggleStatus('ongoing')}
              className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Buka Pemilihan</span>
            </button>
          ) : (
            <button
              id="btn-quick-close-voting"
              type="button"
              disabled={actionLoading}
              onClick={() => handleToggleStatus('ended')}
              className="py-1.5 px-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Tutup Pemilihan</span>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Akses Khusus Laporan & Audit (Fitur yang tidak ada di Bottom Nav) */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Akses Laporan & Log</h3>
          </div>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold border border-slate-200 dark:border-slate-700">
            Fitur Tambahan
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Menu 1: Berita Acara */}
          <button
            id="btn-menu-reports"
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/40 dark:to-slate-900 text-left flex flex-col justify-between h-24 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-95 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                Berita Acara
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Rekap & Cetak PDF</p>
            </div>
          </button>

          {/* Menu 2: Audit Log */}
          <button
            id="btn-menu-logs"
            type="button"
            onClick={() => onNavigateTab('logs')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100/70 to-white dark:from-slate-800/50 dark:to-slate-900 text-left flex flex-col justify-between h-24 hover:border-slate-300 dark:hover:border-slate-700 active:scale-95 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                Audit Log
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Rekam Jejak Sistem</p>
            </div>
          </button>
        </div>
      </div>



      {/* 4 Key Stat Metric Cards Grid for Mobile */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Card 1: Total DPT */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total DPT</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white font-display">
            {stats?.total_students?.toLocaleString('id-ID') || 0}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Siswa terdaftar</span>
        </div>

        {/* Card 2: Sudah Memilih */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Sudah Memilih</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-display">
            {stats?.total_voted?.toLocaleString('id-ID') || 0}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Suara masuk</span>
        </div>

        {/* Card 3: Belum Memilih */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Belum Memilih</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-display">
            {stats?.total_unvoted?.toLocaleString('id-ID') || 0}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Belum memilih</span>
        </div>

        {/* Card 4: Partisipasi % */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400">Partisipasi</span>
            <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-cyan-800 dark:text-cyan-400 font-display">
            {stats?.participation_percentage || 0}%
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Tingkat suara</span>
        </div>

      </div>

      {/* Main Charts & Ranking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Bar Chart Perolehan Suara */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Perolehan Suara Pasangan Calon</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Diagram perolehan suara sah berdasarkan pilihan siswa</p>
            </div>
            <button
              id="btn-dashboard-to-results"
              type="button"
              onClick={() => onNavigateTab('results')}
              className="text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Detail Hasil</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-60 sm:h-72 w-full">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => {
                        const idx = items[0]?.dataIndex;
                        const cand = results?.results[idx]?.candidate;
                        return cand ? `Paslon 0${cand.candidate_number} - ${cand.chairman_name}` : '';
                      },
                      label: (ctx) => ` ${ctx.parsed.y} Suara Sah (${results?.results[ctx.dataIndex]?.percentage || 0}%)`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { size: 10 } },
                    grid: { color: 'rgba(148, 163, 184, 0.15)' },
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: 'bold' } },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Right 1 Col: Doughnut Chart Partisipasi */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Partisipasi Pemilih</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Persentase kehadiran siswa di bilik suara</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center my-2 relative">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                },
                cutout: '70%',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-display">{stats?.participation_percentage || 0}%</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Tingkat Suara</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 rounded-xl p-2">
              <span className="text-emerald-800 dark:text-emerald-300 font-bold block">{stats?.total_voted || 0}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Sudah Memilih</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
              <span className="text-slate-800 dark:text-slate-200 font-bold block">{stats?.total_unvoted || 0}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Belum Memilih</span>
            </div>
          </div>
        </div>

      </div>

      {/* Ranking & Class Participation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Paslon Live Ranking */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Peringkat Sementara</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Urutan perolehan suara terbanyak</p>
            </div>
            <button
              id="btn-view-all-candidates"
              type="button"
              onClick={() => onNavigateTab('candidates')}
              className="text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Kelola Paslon</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {results?.results.map((res) => (
              <div
                key={res.candidate.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      res.rank === 1
                        ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-100 dark:ring-amber-950/60'
                        : res.rank === 2
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white'
                        : 'bg-cyan-700 dark:bg-cyan-600 text-white'
                    }`}
                  >
                    #{res.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {res.candidate.chairman_name}
                      </span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-bold">
                        No. 0{res.candidate.candidate_number}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">& {res.candidate.vice_chairman_name}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-black text-cyan-800 dark:text-cyan-400">{res.votes} Suara</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{res.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Class Participation Breakdown */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Partisipasi Berdasarkan Kelas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Persentase kehadiran per rombongan belajar</p>
            </div>
            <button
              id="btn-view-all-students"
              type="button"
              onClick={() => onNavigateTab('students')}
              className="text-xs font-bold text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Data Pemilih</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-60 w-full">
            <Bar
              data={classBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
