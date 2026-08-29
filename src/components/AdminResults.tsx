import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  Crown,
  Eye,
  EyeOff,
  CheckCircle2,
  Users,
  Vote,
  Percent,
  RefreshCw,
  Award,
  Lock,
  Download,
  Printer,
  Maximize2,
  Tv,
  X,
  Radio,
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ResultsData, Settings, ResultVisibility } from '../types';
import { isVotingOngoing } from '../utils/api';

interface AdminResultsProps {
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
}

export function AdminResults({ settings, onUpdateSettings, onShowAlert }: AdminResultsProps) {
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const [showTvMode, setShowTvMode] = useState(false);

  useEffect(() => {
    loadResults();
    if (isVotingOngoing(settings)) {
      const interval = setInterval(loadResults, 5000);
      return () => clearInterval(interval);
    }
  }, [settings]);

  const loadResults = async () => {
    try {
      const res = await fetch('/api/results?role=admin');
      const data = await res.json();
      if (data.success) {
        setResultsData(data.data);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeVisibility = async (newVal: ResultVisibility) => {
    setVisibilityUpdating(true);
    try {
      await onUpdateSettings({ result_visibility: newVal });
      onShowAlert(
        'success',
        'Visibilitas Hasil Diperbarui',
        `Hasil pemilihan sekarang diatur: ${
          newVal === 'realtime'
            ? 'Dapat Dilihat Realtime oleh Siswa'
            : newVal === 'after_ended'
            ? 'Hanya Tampil Setelah Pemilihan Selesai'
            : 'Disembunyikan dari Siswa'
        }`
      );
      loadResults();
    } catch (e) {
      onShowAlert('error', 'Gagal', 'Gagal memperbarui visibilitas hasil.');
    } finally {
      setVisibilityUpdating(false);
    }
  };

  const barData = {
    labels: resultsData?.results.map((r) => `Paslon 0${r.candidate.candidate_number}`) || [],
    datasets: [
      {
        label: 'Perolehan Suara Sah',
        data: resultsData?.results.map((r) => r.votes) || [],
        backgroundColor: ['rgba(8, 145, 178, 0.9)', 'rgba(59, 130, 246, 0.9)', 'rgba(16, 185, 129, 0.9)', 'rgba(245, 158, 11, 0.9)'],
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: resultsData?.results.map((r) => `Paslon 0${r.candidate.candidate_number}`) || [],
    datasets: [
      {
        data: resultsData?.results.map((r) => r.votes) || [],
        backgroundColor: ['#0891b2', '#3b82f6', '#10b981', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const winner = resultsData?.winner;

  return (
    <div className="space-y-6">
      
      {/* Header & Result Visibility Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-300 border border-transparent dark:border-cyan-800">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
              Tabulasi Suara Masuk
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {resultsData?.total_voted || 0} dari {resultsData?.total_voters || 0} Pemilih
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
            Hasil & Rekapitulasi Perolehan Suara
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Perhitungan suara digital real-time terenkripsi, transparan, dan akuntabel.
          </p>
        </div>

        {/* Visiblity Switcher Buttons */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-200/80 dark:border-slate-700">
          <button
            id="btn-vis-hidden"
            type="button"
            disabled={visibilityUpdating}
            onClick={() => handleChangeVisibility('hidden')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.result_visibility === 'hidden'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Sembunyikan</span>
          </button>

          <button
            id="btn-vis-after-ended"
            type="button"
            disabled={visibilityUpdating}
            onClick={() => handleChangeVisibility('after_ended')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.result_visibility === 'after_ended'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Setelah Selesai</span>
          </button>

          <button
            id="btn-vis-realtime"
            type="button"
            disabled={visibilityUpdating}
            onClick={() => handleChangeVisibility('realtime')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.result_visibility === 'realtime'
                ? 'bg-cyan-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Realtime</span>
          </button>

          <button
            id="btn-open-tv-mode"
            type="button"
            onClick={() => setShowTvMode(true)}
            className="py-2 px-3.5 rounded-xl text-xs font-black bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ml-1"
            title="Tampilkan Tampilan Layar Penuh untuk Proyektor / TV Saksi"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode Proyektor / TV</span>
          </button>
        </div>
      </div>

      {/* WINNER HIGHLIGHT (IF VOTES EXIST) */}
      {winner && winner.votes > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-3xl p-6 sm:p-7 shadow-lg text-slate-950 flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-300">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white text-amber-600 flex items-center justify-center shadow-md shrink-0">
              <Crown className="w-10 h-10 fill-current" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950/80">
                ⭐ Perolehan Suara Tertinggi Sementara
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                PASLON 0{winner.candidate.candidate_number} — {winner.candidate.chairman_name} & {winner.candidate.vice_chairman_name}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-amber-950 mt-0.5">
                Memimpin dengan {winner.votes} suara sah ({winner.percentage}%) dari total pemilih yang berpartisipasi.
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 text-center shrink-0 border border-white/80 min-w-[140px]">
            <span className="text-3xl font-black text-slate-900 font-display block leading-none">
              {winner.percentage}%
            </span>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {winner.votes} Suara
            </span>
          </div>
        </div>
      )}

      {/* Candidate Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resultsData?.results.map((r) => (
          <div
            key={r.candidate.id}
            className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all ${
              r.rank === 1 && r.votes > 0 ? 'border-amber-400 ring-2 ring-amber-200/50 dark:ring-amber-500/20' : 'border-slate-200/90 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-xl bg-cyan-700 text-white font-black text-xs flex items-center justify-center">
                  0{r.candidate.candidate_number}
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    r.rank === 1 && r.votes > 0
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-black border border-amber-300/60 dark:border-amber-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Peringkat #{r.rank}
                </span>
              </div>

              {/* Photos row */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="aspect-3/4 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <img
                    src={r.candidate.chairman_photo}
                    alt={r.candidate.chairman_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-3/4 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <img
                    src={r.candidate.vice_chairman_photo}
                    alt={r.candidate.vice_chairman_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {r.candidate.chairman_name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-4">
                & {r.candidate.vice_chairman_name}
              </p>

              {/* Progress bar */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Persentase</span>
                  <span className="text-cyan-800 dark:text-cyan-400 font-mono font-black">{r.percentage}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 rounded-full transition-all duration-700"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Total Suara Sah:</span>
              <span className="font-mono font-black text-base text-slate-900 dark:text-white">{r.votes} Suara</span>
            </div>

          </div>
        ))}
      </div>

      {/* Visual Graphs Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mb-1">
            Diagram Perbandingan Suara (Bar Chart)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Grafik batang perolehan suara sah seluruh pasangan calon</p>
          <div className="h-60 sm:h-72 w-full">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => {
                        const idx = items[0]?.dataIndex;
                        const cand = resultsData?.results[idx]?.candidate;
                        return cand ? `Paslon 0${cand.candidate_number} - ${cand.chairman_name}` : '';
                      },
                      label: (ctx) => ` ${ctx.parsed.y} Suara Sah (${resultsData?.results[ctx.dataIndex]?.percentage || 0}%)`,
                    },
                  },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { precision: 0, font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mb-1">
            Proporsi Suara (Pie Chart)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Distribusi persentase perolehan suara</p>
          <div className="h-64 w-full flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* MODAL FULLSCREEN: MODE PROYEKTOR / TV SAKSI */}
      {showTvMode && resultsData && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-4 sm:p-8 overflow-y-auto font-sans">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{settings.school_name}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Radio className="w-3 h-3 animate-pulse" />
                    LIVE COUNT PROYEKTOR
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                  {settings.event_title}
                </h1>
              </div>
            </div>

            <button
              id="btn-close-tv-mode"
              type="button"
              onClick={() => setShowTvMode(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
              <span>Tutup Mode TV (ESC)</span>
            </button>
          </div>

          {/* Top Banner Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total DPT Pemilih</span>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">{resultsData.total_voters}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Suara Masuk (Sah)</span>
              <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-1">{resultsData.total_voted}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Belum Memilih</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1">{resultsData.total_unvoted}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Tingkat Partisipasi</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">{resultsData.participation_percentage}%</p>
            </div>
          </div>

          {/* Winner banner if applicable */}
          {winner && winner.votes > 0 && (
            <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-2xl p-4 mb-6 text-slate-950 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-950 fill-current shrink-0" />
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950/80">Perolehan Suara Tertinggi</span>
                  <h3 className="text-base sm:text-lg font-black">
                    PASLON 0{winner.candidate.candidate_number} — {winner.candidate.chairman_name} & {winner.candidate.vice_chairman_name} ({winner.votes} Suara • {winner.percentage}%)
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Main Candidate Visual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
            {resultsData.results.map((res) => {
              const isLead = winner?.candidate.id === res.candidate.id && res.votes > 0;
              return (
                <div
                  key={res.candidate.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isLead
                      ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header Candidate Number */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 font-black text-lg flex items-center justify-center">
                        0{res.candidate.candidate_number}
                      </span>
                      {isLead && (
                        <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 fill-current" />
                          UNGGUL
                        </span>
                      )}
                    </div>

                    {/* Photo Pair */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="aspect-3/4 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative">
                        <img src={res.candidate.chairman_photo} alt={res.candidate.chairman_name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 inset-x-1 bg-slate-950/80 text-white text-[9px] font-bold py-0.5 text-center rounded">Ketua</span>
                      </div>
                      <div className="aspect-3/4 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative">
                        <img src={res.candidate.vice_chairman_photo} alt={res.candidate.vice_chairman_name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 inset-x-1 bg-slate-950/80 text-white text-[9px] font-bold py-0.5 text-center rounded">Wakil</span>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-white text-center mb-1">
                      {res.candidate.chairman_name} & {res.candidate.vice_chairman_name}
                    </h3>
                  </div>

                  {/* Vote Progress Bar & Big Numbers */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">SUARA SAH</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-cyan-400 font-mono">{res.votes}</span>
                        <span className="text-xs text-slate-400 ml-1">({res.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${res.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>{settings.footer_text || 'Komisi Pemilihan Umum OSIS (KPU-OSIS)'}</span>
            <span>Tekan ESC atau Klik Tutup untuk Kembali ke Panel Admin</span>
          </div>

        </div>
      )}

    </div>
  );
}
