import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  Printer,
  Download,
  Award,
  CheckCircle2,
  Calendar,
  Building2,
  UserCheck,
  ShieldCheck,
  Percent,
  Settings as SettingsIcon,
  FileSignature,
  ExternalLink,
} from 'lucide-react';
import { Settings, ResultsData, DashboardStats, Student } from '../types';
import { printDocument, downloadPrintableHtml } from '../utils/printHelper';

interface AdminReportsProps {
  settings: Settings;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export function AdminReports({ settings, onShowAlert, onNavigateTab }: AdminReportsProps) {
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resData, statsData, studData] = await Promise.all([
        fetch('/api/results?role=admin').then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false })),
        fetch('/api/stats').then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false })),
        fetch('/api/students').then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false })),
      ]);

      if (resData && resData.success) setResultsData(resData.data);
      if (statsData && statsData.success) setStats(statsData.data);
      if (studData && studData.success) setStudents(studData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportFullExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Rekapitulasi Suara
      const rekapData = resultsData?.results.map((r) => ({
        Peringkat: r.rank,
        'Nomor Paslon': `0${r.candidate.candidate_number}`,
        'Calon Ketua': r.candidate.chairman_name,
        'Calon Wakil': r.candidate.vice_chairman_name,
        'Jumlah Suara Sah': r.votes,
        'Persentase (%)': `${r.percentage}%`,
      })) || [];
      const wsRekap = XLSX.utils.json_to_sheet(rekapData);
      XLSX.utils.book_append_sheet(wb, wsRekap, 'Hasil Suara Paslon');

      // Sheet 2: Partisipasi Kelas
      const kelasData = stats?.class_participation.map((c) => ({
        Kelas: c.class_name,
        'Sudah Memilih': c.voted,
        'Total Pemilih': c.total,
        'Partisipasi (%)': `${c.percentage}%`,
      })) || [];
      const wsKelas = XLSX.utils.json_to_sheet(kelasData);
      XLSX.utils.book_append_sheet(wb, wsKelas, 'Partisipasi Kelas');

      // Sheet 3: Daftar Hadir Pemilih
      const hadirData = students.map((s, idx) => ({
        No: idx + 1,
        NIS_NIP: s.nis,
        Nama: s.name,
        Kelas_Satker: s.class_name,
        'Status Voting': s.has_voted ? 'HADIR / MEMILIH' : 'BELUM MEMILIH',
        'Waktu Suara': s.voted_at ? new Date(s.voted_at).toLocaleString('id-ID') : '-',
      }));
      const wsHadir = XLSX.utils.json_to_sheet(hadirData);
      XLSX.utils.book_append_sheet(wb, wsHadir, 'Daftar Hadir Pemilih');

      XLSX.writeFile(wb, `Laporan_Resmi_Hasil_Pemilihan_OSIS_${new Date().toISOString().split('T')[0]}.xlsx`);
      onShowAlert('success', 'Export Berhasil', 'Laporan lengkap Excel telah berhasil diunduh.');
    } catch (e) {
      onShowAlert('error', 'Gagal', 'Gagal membuat file laporan Excel.');
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('printable-official-report');
    if (el) {
      printDocument({
        title: `Berita_Acara_Hasil_Pemilihan_OSIS_${new Date().getFullYear()}`,
        contentHtml: el.innerHTML,
        onSuccess: () => {
          onShowAlert('info', 'Membuka Dialog Cetak', 'Dialog cetak dokumen berita acara telah dibuka.');
        },
        onError: () => {
          onShowAlert('warning', 'Cetak Terblokir', 'Browser memblokir cetak langsung. Silakan gunakan tombol "Unduh HTML" untuk mencetak.');
        },
      });
    } else {
      window.print();
    }
  };

  const handleDownloadReportHtml = () => {
    const el = document.getElementById('printable-official-report');
    if (el) {
      downloadPrintableHtml(
        `Berita_Acara_Hasil_Pemilihan_OSIS_${new Date().toISOString().split('T')[0]}`,
        el.innerHTML,
        'Berita Acara Rekapitulasi Hasil Pemilihan OSIS'
      );
      onShowAlert('success', 'File Siap Cetak Diunduh', 'Dokumen HTML resmi siap cetak berhasil diunduh.');
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              Laporan & Berita Acara Resmi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
            Dokumen Berita Acara & Rekapitulasi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Dokumen resmi penetapan hasil pemilihan Ketua & Wakil Ketua OSIS dengan penandatangan sesuai pengaturan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('settings')}
              className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
              <span>Ubah Penandatangan</span>
            </button>
          )}

          <button
            id="btn-export-reports-excel"
            type="button"
            onClick={handleExportFullExcel}
            className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Export Excel</span>
          </button>

          <button
            id="btn-download-reports-html"
            type="button"
            onClick={handleDownloadReportHtml}
            className="py-2.5 px-3.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto"
            title="Unduh file dokumen HTML siap cetak"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Unduh HTML</span>
          </button>

          <button
            id="btn-print-reports-doc"
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Cetak Dokumen / PDF</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 print:hidden">
        <div className="flex items-start sm:items-center gap-2">
          <FileSignature className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            Penandatangan aktif: <strong className="text-slate-900 dark:text-slate-200">{settings.principal_name || 'Kepala Sekolah'}</strong>, <strong className="text-slate-900 dark:text-slate-200">{settings.osis_advisor || 'Pembina OSIS'}</strong>, dan <strong className="text-slate-900 dark:text-slate-200">{settings.committee_chair || 'Ketua Panitia'}</strong>.
          </span>
        </div>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="font-bold text-slate-900 dark:text-cyan-400 hover:underline shrink-0 text-left sm:text-right mt-1 sm:mt-0 cursor-pointer"
          >
            Atur di Pengaturan &rarr;
          </button>
        )}
      </div>

      {/* OFFICIAL PAPER DOCUMENT PREVIEW (PRINTABLE 1-PAGE A4) */}
      <div id="printable-official-report" className="bg-white rounded-xl border border-slate-300 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans">
        
        {/* Kop Surat Sekolah */}
        <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-600">
            KOMISI PEMILIHAN UMUM (KPU) OSIS
          </h4>
          <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-display mt-0.5">
            {settings.school_name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {settings.school_address || 'Sekretariat KPU OSIS • Panitia Pemilihan Ketua & Wakil Ketua OSIS'}
          </p>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider underline">
            BERITA ACARA REKAPITULASI HASIL PEMILIHAN
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Nomor: 042/KPU-OSIS/{new Date().getFullYear()} • Tahun Pelajaran {settings.academic_year}
          </p>
        </div>

        {/* Opening Paragraph */}
        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 text-justify mb-4">
          Pada hari ini, <strong>{currentDateFormatted}</strong>, telah diselenggarakan Rapat Pleno Terbuka Rekapitulasi Penghitungan Suara Pemilihan Ketua dan Wakil Ketua OSIS <strong>{settings.school_name}</strong> Masa Bakti {settings.academic_year} yang diselenggarakan secara elektronik (E-Voting) dengan berasaskan Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil (LUBER JURDIL).
        </p>

        {/* Summary Table: Data Partisipasi Pemilih */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
            I. DATA PEMILIH DAN PENGGUNAAN HAK PILIH
          </h3>
          <div className="overflow-x-auto rounded border border-slate-300">
            <table className="w-full min-w-[300px] text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-3 font-semibold bg-slate-50/80 w-2/3">1. Jumlah Pemilih Terdaftar dalam DPT</td>
                  <td className="py-1.5 px-3 font-mono font-bold text-right">{stats?.total_students || 0} Pemilih</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-3 font-semibold bg-slate-50/80">2. Jumlah Pemilih Menggunakan Hak Suara</td>
                  <td className="py-1.5 px-3 font-mono font-bold text-right text-emerald-800">{stats?.total_voted || 0} Suara</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-3 font-semibold bg-slate-50/80">3. Jumlah Pemilih Tidak Menggunakan Hak Suara</td>
                  <td className="py-1.5 px-3 font-mono font-bold text-right text-amber-800">{stats?.total_unvoted || 0} Pemilih</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold bg-slate-50/80">4. Persentase Partisipasi Pemilih</td>
                  <td className="py-1.5 px-3 font-mono font-bold text-right text-cyan-900">{stats?.participation_percentage || 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Table: Perolehan Suara Calon */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
            II. PEROLEHAN SUARA PASANGAN CALON
          </h3>
          <div className="overflow-x-auto rounded border border-slate-300">
            <table className="w-full min-w-[480px] text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold uppercase text-[11px]">
                  <th className="py-1.5 px-2.5 text-center w-10">No</th>
                  <th className="py-1.5 px-2.5 text-center w-16">No. Urut</th>
                  <th className="py-1.5 px-2.5 text-left">Pasangan Calon (Ketua & Wakil)</th>
                  <th className="py-1.5 px-2.5 text-right w-24">Suara Sah</th>
                  <th className="py-1.5 px-2.5 text-right w-20">Persentase</th>
                  <th className="py-1.5 px-2.5 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {resultsData?.results.map((r, idx) => (
                  <tr key={r.candidate.id} className="border-b border-slate-200">
                    <td className="py-1.5 px-2.5 text-center font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-2.5 text-center font-bold font-mono">0{r.candidate.candidate_number}</td>
                    <td className="py-1.5 px-2.5 font-semibold">
                      <span className="text-slate-900">{r.candidate.chairman_name}</span>
                      <span className="text-slate-500 text-[11px] font-normal"> & {r.candidate.vice_chairman_name}</span>
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold">{r.votes} Suara</td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold">{r.percentage}%</td>
                    <td className="py-1.5 px-2.5 text-center">
                      {r.rank === 1 && r.votes > 0 ? (
                        <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          ⭐ Terpilih
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusion statement */}
        <div className="bg-slate-50/80 border border-slate-300 rounded-lg p-3 mb-5 text-xs sm:text-sm leading-relaxed text-slate-800">
          <p>
            Berdasarkan hasil rekapitulasi perolehan suara sah di atas, Pasangan Calon <strong>Nomor Urut 0{resultsData?.winner?.candidate.candidate_number || 1} ({resultsData?.winner?.candidate.chairman_name} & {resultsData?.winner?.candidate.vice_chairman_name})</strong> memperoleh suara terbanyak dan dengan ini ditetapkan sebagai <strong>Ketua & Wakil Ketua OSIS Terpilih {settings.school_name}</strong> Masa Bakti {settings.academic_year}.
          </p>
        </div>

        {/* Official Signatures Section (2 Baris Formal: Panitia & Pembina/Kepsek) */}
        <div className="pt-2 border-t border-slate-300">
          
          {/* Row 1: Panitia KPU OSIS */}
          <div className="grid grid-cols-2 gap-6 text-center text-xs text-slate-900 mb-6">
            <div className="space-y-12">
              <div>
                <p className="font-semibold">Ketua Panitia KPU OSIS,</p>
                <p className="text-[11px] text-slate-500">{settings.school_name}</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 break-words">
                  {settings.committee_chair || 'Muhammad Fajar Pratama'}
                </p>
                <p className="text-[11px] text-slate-500">
                  NIS. {settings.chair_nis || '102401'}
                </p>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <p className="font-semibold">Sekretaris Panitia KPU OSIS,</p>
                <p className="text-[11px] text-slate-500">{settings.school_name}</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 break-words">
                  {settings.committee_secretary || 'Aura Nadhira Putri'}
                </p>
                <p className="text-[11px] text-slate-500">
                  NIS. {settings.secretary_nis || '102405'}
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: Pembina OSIS & Kepala Sekolah */}
          <div className="grid grid-cols-2 gap-6 text-center text-xs text-slate-900 pt-3 border-t border-slate-200">
            <div className="space-y-12">
              <div>
                <p className="font-semibold">Mengetahui,</p>
                <p className="text-[11px] text-slate-500">Pembina OSIS & Kesiswaan</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 break-words">
                  {settings.osis_advisor || 'Dra. Hj. Siti Nurjanah, M.Pd.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  NIP. {settings.advisor_nip || '19750822 200312 2 006'}
                </p>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <p className="font-semibold">Menyetujui,</p>
                <p className="text-[11px] text-slate-500">Kepala {settings.school_name}</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 break-words">
                  {settings.principal_name || 'Drs. H. Rachmat Hidayat, M.Pd.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  NIP. {settings.principal_nip || '19680514 199403 1 004'}
                </p>
              </div>
            </div>
          </div>

          {/* Optional Saksi Row if present */}
          {(settings.witness_1_name || settings.witness_2_name) && (
            <div className="mt-4 pt-2 border-t border-slate-200 text-center text-xs text-slate-600">
              <p className="font-semibold mb-2">Saksi-Saksi Pemilihan:</p>
              <div className="flex justify-around gap-4">
                {settings.witness_1_name && (
                  <div>
                    <p className="font-medium text-slate-800 text-xs">1. {settings.witness_1_name}</p>
                    <p className="text-[10px] text-slate-400 mt-4">(...................................................)</p>
                  </div>
                )}
                {settings.witness_2_name && (
                  <div>
                    <p className="font-medium text-slate-800 text-xs">2. {settings.witness_2_name}</p>
                    <p className="text-[10px] text-slate-400 mt-4">(...................................................)</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
