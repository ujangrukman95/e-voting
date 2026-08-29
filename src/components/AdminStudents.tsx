import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCcw,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Printer,
  X,
  KeyRound,
  FileText,
  School,
  GraduationCap,
  Briefcase,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Student, Settings } from '../types';
import { printDocument, downloadPrintableHtml } from '../utils/printHelper';
import { QRCodeSVG } from 'qrcode.react';

interface AdminStudentsProps {
  settings?: Settings;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export function AdminStudents({ settings, onShowAlert, onShowConfirm }: AdminStudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [categoryTab, setCategoryTab] = useState<'ALL' | 'SISWA' | 'GURU'>('ALL');

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [voterType, setVoterType] = useState<'student' | 'teacher'>('student');
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    class_name: '',
    major: 'MIPA',
    pin: '',
  });

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Print Cards Modal
  const [isPrintCardsOpen, setIsPrintCardsOpen] = useState(false);
  const [printFilterClass, setPrintFilterClass] = useState('ALL');
  const [printFilterStatus, setPrintFilterStatus] = useState('ALL');
  const [printSearch, setPrintSearch] = useState('');

  const isTeacherRecord = (s: Student) => {
    const c = (s.class_name || '').toLowerCase();
    const m = (s.major || '').toLowerCase();
    return c.includes('guru') || c.includes('staf') || c.includes('tu') || c.includes('tata usaha') || c.includes('pendidik') || m.includes('guru') || m.includes('pendidik');
  };

  useEffect(() => {
    loadStudents();
  }, [searchQuery, selectedClass, selectedStatus]);

  const getAuthHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('evoting_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (searchQuery) query.append('search', searchQuery);
      if (selectedClass !== 'ALL') query.append('class_name', selectedClass);
      if (selectedStatus === 'voted') query.append('status', 'voted');
      if (selectedStatus === 'unvoted') query.append('status', 'unvoted');

      const res = await fetch(`/api/students?${query.toString()}`, {
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique classes/categories for filter
  const classesList: string[] = (Array.from(new Set(students.map((s) => s.class_name))) as string[]).sort();

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setVoterType('student');
    setFormData({
      nis: '',
      name: '',
      class_name: '',
      major: 'MIPA',
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    const isTeacher = s.class_name.toLowerCase().includes('guru') || s.major.toLowerCase().includes('guru') || s.major.toLowerCase().includes('pendidik');
    setVoterType(isTeacher ? 'teacher' : 'student');
    setFormData({
      nis: s.nis,
      name: s.name,
      class_name: s.class_name,
      major: s.major || (isTeacher ? 'Guru / Tenaga Pendidik' : 'MIPA'),
      pin: s.pin,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis.trim() || !formData.name.trim() || !formData.class_name.trim()) {
      onShowAlert('warning', 'Validasi Gagal', 'Username/NIS/NIP, Nama Lengkap, dan Kelas/Kategori wajib diisi.');
      return;
    }

    try {
      let res;
      if (editingStudent) {
        res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(formData),
        });
      }

      const data = await res.json();
      if (data.success) {
        onShowAlert('success', 'Berhasil', data.message);
        setIsAddEditModalOpen(false);
        loadStudents();
      } else {
        onShowAlert('error', 'Gagal Menyimpan', data.message);
      }
    } catch (err) {
      onShowAlert('error', 'Error', 'Terjadi kesalahan sistem.');
    }
  };

  const handleDeleteStudent = (student: Student) => {
    onShowConfirm(
      'Hapus Data Pemilih',
      `Yakin ingin menghapus data pemilih ${student.name} (${student.nis} - ${student.class_name}) dari Daftar Pemilih Tetap?`,
      async () => {
        try {
          const res = await fetch(`/api/students/${student.id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() },
          });
          const data = await res.json();
          if (data.success) {
            onShowAlert('success', 'Terhapus', data.message);
            loadStudents();
          } else {
            onShowAlert('error', 'Gagal', data.message);
          }
        } catch (e) {
          onShowAlert('error', 'Error', 'Gagal menghapus data.');
        }
      }
    );
  };

  const handleResetSingleVote = (student: Student) => {
    onShowConfirm(
      'Reset Status Hak Pilih',
      `Apakah Anda yakin ingin mereset hak pilih ${student.name}? Pemilih akan dapat login dan melakukan voting kembali.`,
      async () => {
        try {
          const res = await fetch(`/api/students/reset-vote/${student.id}`, {
            method: 'POST',
            headers: { ...getAuthHeader() },
          });
          const data = await res.json();
          if (data.success) {
            onShowAlert('success', 'Berhasil Direset', data.message);
            loadStudents();
          } else {
            onShowAlert('error', 'Gagal', data.message);
          }
        } catch (e) {
          onShowAlert('error', 'Error', 'Gagal mereset status voting pemilih.');
        }
      }
    );
  };

  const handleResetAllVotes = () => {
    onShowConfirm(
      '⚠️ PERINGATAN: RESET SEMUA SURAT SUARA',
      'Tindakan ini akan MENGOSONGKAN SELURUH PEROLEHAN SUARA dan mengembalikan status voting seluruh pemilih (siswa & guru) menjadi BELUM MEMILIH. Tindakan ini tidak dapat dibatalkan.',
      async () => {
        try {
          const res = await fetch('/api/students/reset-all-votes', {
            method: 'POST',
            headers: { ...getAuthHeader() },
          });
          const data = await res.json();
          if (data.success) {
            onShowAlert('success', 'Reset Berhasil', data.message);
            loadStudents();
          } else {
            onShowAlert('error', 'Gagal', data.message);
          }
        } catch (e) {
          onShowAlert('error', 'Error', 'Gagal mereset semua suara.');
        }
      }
    );
  };

  // EXCEL / CSV EXPORT
  const handleExportExcel = () => {
    try {
      const exportData = students.map((s, index) => ({
        No: index + 1,
        'NIS / NIP (Username)': s.nis,
        'Nama Lengkap': s.name,
        'Kelas / Satuan Kerja': s.class_name,
        'Kategori / Jurusan': s.major,
        'Password / PIN': s.pin,
        'Status Voting': s.has_voted ? 'SUDAH MEMILIH' : 'BELUM MEMILIH',
        'Waktu Memilih': s.voted_at ? new Date(s.voted_at).toLocaleString('id-ID') : '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Pemilih Tetap');
      XLSX.writeFile(workbook, `DPT_Pemilihan_OSIS_${new Date().toISOString().split('T')[0]}.xlsx`);
      onShowAlert('success', 'Export Berhasil', 'File Excel Daftar Pemilih Tetap telah berhasil diunduh.');
    } catch (e) {
      onShowAlert('error', 'Export Gagal', 'Gagal mengonversi data ke Excel.');
    }
  };

  // DOWNLOAD EXCEL TEMPLATE
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'NIS / NIP': '102420', 'Nama Lengkap': 'Fahri Ramadhan', Kelas: 'X MIPA 1', Jurusan: 'MIPA', PIN: '123456' },
      { 'NIS / NIP': '102421', 'Nama Lengkap': 'Siti Khadijah', Kelas: 'X MIPA 1', Jurusan: 'MIPA', PIN: '654321' },
      { 'NIS / NIP': '102422', 'Nama Lengkap': 'Rizky Pratama', Kelas: 'XI IPS 1', Jurusan: 'IPS', PIN: '789123' },
      { 'NIS / NIP': '198503152010011002', 'Nama Lengkap': 'Drs. H. Bambang Sudiro, M.Pd.', Kelas: 'Dewan Guru', Jurusan: 'Guru / Tenaga Pendidik', PIN: '778899' },
      { 'NIS / NIP': '199004222019032008', 'Nama Lengkap': 'Siti Nurjanah, S.Pd.', Kelas: 'Dewan Guru', Jurusan: 'Guru / Tenaga Pendidik', PIN: '990011' },
      { 'NIS / NIP': '198811052020121004', 'Nama Lengkap': 'Ahmad Zaelani, S.Kom.', Kelas: 'Staf Tata Usaha', Jurusan: 'Tenaga Kependidikan', PIN: '334455' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template DPT');
    XLSX.writeFile(wb, 'Template_Import_Pemilih_Siswa_Dan_Guru.xlsx');
  };

  // IMPORT FILE PARSER
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const mapped = data
          .map((row) => ({
            nis: String(row['NIS / NIP'] || row.NIS || row.nis || row.Nis || row.NIP || row.nip || row.Username || '').trim(),
            name: String(row['Nama Lengkap'] || row.name || row.Nama || row['Nama Siswa'] || row['Nama Guru'] || '').trim(),
            class_name: String(row['Kelas / Satuan Kerja'] || row.Kelas || row.class_name || row.class || row.Kategori || 'Umum').trim(),
            major: String(row['Kategori / Jurusan'] || row.Jurusan || row.major || 'Umum').trim(),
            pin: String(row['Password / PIN'] || row.PIN || row.pin || row.Password || '').trim() || Math.floor(100000 + Math.random() * 900000).toString(),
          }))
          .filter((row) => row.nis && row.name && row.class_name);

        setImportRows(mapped);
      } catch (err) {
        onShowAlert('error', 'Format File Salah', 'Gagal membaca format file Excel/CSV.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessImport = async () => {
    if (importRows.length === 0) {
      onShowAlert('warning', 'Peringatan', 'Tidak ada data valid yang ditemukan untuk diimpor.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ students: importRows }),
      });
      const data = await res.json();
      if (data.success) {
        onShowAlert('success', 'Import Selesai', data.message);
        setIsImportModalOpen(false);
        setImportRows([]);
        loadStudents();
      } else {
        onShowAlert('error', 'Import Gagal', data.message);
      }
    } catch (err) {
      onShowAlert('error', 'Error', 'Gagal memproses import data.');
    } finally {
      setImporting(false);
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // Filtered list for print cards preview
  const printFilteredStudents = students.filter((s) => {
    const matchSearch =
      printSearch === '' ||
      s.name.toLowerCase().includes(printSearch.toLowerCase()) ||
      s.nis.includes(printSearch) ||
      s.class_name.toLowerCase().includes(printSearch.toLowerCase());

    const matchClass =
      printFilterClass === 'ALL' ||
      (printFilterClass === 'GURU_ONLY' && (s.class_name.toLowerCase().includes('guru') || s.major.toLowerCase().includes('guru') || s.major.toLowerCase().includes('pendidik'))) ||
      (printFilterClass === 'SISWA_ONLY' && (!s.class_name.toLowerCase().includes('guru') && !s.major.toLowerCase().includes('guru') && !s.major.toLowerCase().includes('pendidik'))) ||
      s.class_name === printFilterClass;

    const matchStatus =
      printFilterStatus === 'ALL' ||
      (printFilterStatus === 'voted' && s.has_voted) ||
      (printFilterStatus === 'unvoted' && !s.has_voted);

    return matchSearch && matchClass && matchStatus;
  });

  const teacherCount = students.filter((s) => isTeacherRecord(s)).length;
  const studentCount = students.length - teacherCount;
  const votedCount = students.filter((s) => s.has_voted).length;
  const unvotedCount = students.length - votedCount;

  // Filter students based on active Category Tab (Semua vs Siswa vs Guru)
  const displayedStudents = students.filter((s) => {
    if (categoryTab === 'GURU') return isTeacherRecord(s);
    if (categoryTab === 'SISWA') return !isTeacherRecord(s);
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              Daftar Pemilih Tetap (DPT)
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{students.length} Total Pemilih (Siswa & Guru)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
            Manajemen Data Pemilih (DPT)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Kelola data pemilih Siswa & Dewan Guru, PIN pemilih, import Excel, cetak kartu undangan resmi 3 per A4, dan kontrol status hak suara.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-student"
            type="button"
            onClick={handleOpenAdd}
            className="py-2.5 px-3.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pemilih</span>
          </button>

          <button
            id="btn-open-import-modal"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="py-2.5 px-3.5 bg-emerald-700 dark:bg-emerald-600 hover:bg-emerald-800 dark:hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            id="btn-export-excel"
            type="button"
            onClick={handleExportExcel}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            id="btn-print-voter-cards"
            type="button"
            onClick={() => setIsPrintCardsOpen(true)}
            className="py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Cetak Kartu & Undangan</span>
          </button>

          <button
            id="btn-reset-all-votes"
            type="button"
            onClick={handleResetAllVotes}
            title="Reset Seluruh Suara"
            className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden md:inline">Reset Semua Suara</span>
          </button>
        </div>
      </div>

      {/* Category Segmented Selector & Live Statistics */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl overflow-x-auto">
          <button
            type="button"
            id="btn-tab-category-all"
            onClick={() => setCategoryTab('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryTab === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            👥 Semua Pemilih ({students.length})
          </button>

          <button
            type="button"
            id="btn-tab-category-students"
            onClick={() => setCategoryTab('SISWA')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              categoryTab === 'SISWA'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Siswa ({studentCount})</span>
          </button>

          <button
            type="button"
            id="btn-tab-category-teachers"
            onClick={() => setCategoryTab('GURU')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              categoryTab === 'GURU'
                ? 'bg-indigo-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-200" />
            <span>Dewan Guru & Staf ({teacherCount})</span>
          </button>
        </div>

        {/* Quick Participation Badges */}
        <div className="flex items-center gap-2 text-xs font-semibold px-1">
          <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{votedCount} Sudah Memilih</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({students.length > 0 ? Math.round((votedCount / students.length) * 100) : 0}%)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{unvotedCount} Belum Memilih</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-student"
            type="text"
            placeholder={
              categoryTab === 'GURU'
                ? 'Cari nama guru, NIP/NUPTK, atau bidang tugas...'
                : categoryTab === 'SISWA'
                ? 'Cari nama siswa, NIS, atau kelas...'
                : 'Cari berdasarkan nama, NIS/NIP, atau kelas/satuan...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            id="select-filter-class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
          >
            <option value="ALL">Semua Kategori & Kelas</option>
            {classesList.map((c) => (
              <option key={c} value={c}>
                {c.toLowerCase().includes('guru') ? `👔 ${c}` : `🎓 Kelas ${c}`}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="select-filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="voted">🟢 Sudah Memilih</option>
            <option value="unvoted">🟡 Belum Memilih</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">
                  {categoryTab === 'GURU' ? 'NIP / NUPTK' : categoryTab === 'SISWA' ? 'NIS / NISN' : 'Username (NIS / NIP)'}
                </th>
                <th className="py-3.5 px-4">
                  {categoryTab === 'GURU' ? 'Nama Guru / Tenaga Pendidik' : 'Nama Lengkap'}
                </th>
                <th className="py-3.5 px-4">
                  {categoryTab === 'GURU' ? 'Satuan Kerja / Jabatan' : 'Kelas / Kategori'}
                </th>
                <th className="py-3.5 px-4">PIN Rahasia</th>
                <th className="py-3.5 px-4">Status Suara</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Memuat daftar pemilih...
                  </td>
                </tr>
              ) : displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {categoryTab === 'GURU'
                      ? 'Belum ada data dewan guru/staf. Tambah manual atau pilih kategori Guru pada tombol Tambah Pemilih.'
                      : 'Tidak ada data pemilih yang sesuai dengan pencarian / filter.'}
                  </td>
                </tr>
              ) : (
                displayedStudents.map((s, idx) => {
                  const isTeacher = isTeacherRecord(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-800 dark:text-slate-200">
                          {s.nis}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {isTeacher ? (
                            <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0" title="Dewan Guru / Staf">
                              <Briefcase className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0" title="Siswa">
                              <GraduationCap className="w-3 h-3" />
                            </span>
                          )}
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isTeacher ? 'bg-indigo-100/70 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {s.class_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded text-xs font-bold tracking-wider">
                          {s.pin}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {s.has_voted ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Sudah Memilih</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({formatDateTime(s.voted_at)})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-xs">
                            <Clock className="w-4 h-4" />
                            <span>Belum Memilih</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.has_voted && (
                            <button
                              type="button"
                              onClick={() => handleResetSingleVote(s)}
                              title="Reset hak pilih"
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Pemilih"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s)}
                            title="Hapus Pemilih"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TAMBAH / EDIT PEMILIH (SISWA & GURU) */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              id="btn-close-add-modal"
              onClick={() => setIsAddEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display mb-1">
              {editingStudent ? 'Edit Data Pemilih' : 'Tambah Pemilih Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Tambahkan siswa atau dewan guru ke dalam Daftar Pemilih Tetap (DPT).
            </p>

            {/* Tipe Pemilih: Siswa / Guru */}
            {!editingStudent && (
              <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setVoterType('student');
                    setFormData({
                      ...formData,
                      class_name: formData.class_name.toLowerCase().includes('guru') ? 'X MIPA 1' : formData.class_name,
                      major: 'MIPA',
                    });
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    voterType === 'student'
                      ? 'bg-white dark:bg-slate-700 text-cyan-900 dark:text-cyan-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Siswa (Pemilih)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoterType('teacher');
                    setFormData({
                      ...formData,
                      class_name: 'Dewan Guru',
                      major: 'Guru / Tenaga Pendidik',
                    });
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    voterType === 'teacher'
                      ? 'bg-white dark:bg-slate-700 text-indigo-900 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Dewan Guru / Staf</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {voterType === 'teacher' ? 'NIP / Kode Guru (Username)' : 'NIS / Nomor Induk Siswa (Username)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={voterType === 'teacher' ? 'Contoh: 198503152010011002 atau GURU01' : 'Contoh: 102425'}
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {voterType === 'teacher' ? 'Nama Lengkap & Gelar' : 'Nama Lengkap Siswa'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={voterType === 'teacher' ? 'Contoh: Drs. H. Bambang Sudiro, M.Pd.' : 'Contoh: Ahmad Fauzi'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {voterType === 'teacher' ? 'Kategori / Satuan' : 'Kelas'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={voterType === 'teacher' ? 'Dewan Guru' : 'XII MIPA 1'}
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {voterType === 'teacher' ? 'Penugasan' : 'Jurusan'}
                  </label>
                  <input
                    type="text"
                    placeholder={voterType === 'teacher' ? 'Guru / Pendidik' : 'MIPA / IPS / Bahasa'}
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIN Rahasia (Password Login)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="6 digit angka"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        pin: Math.floor(100000 + Math.random() * 900000).toString(),
                      })
                    }
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Acak PIN
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="btn-cancel-student-form"
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-student-form"
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              id="btn-close-import-modal"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportRows([]);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display mb-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Import Data Pemilih (Siswa & Guru) dari Excel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Unggah file spreadsheet (.xlsx / .xls / .csv) berisi data NIS/NIP, Nama, Kelas/Satuan, dan PIN.
            </p>

            <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800/60 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-cyan-950 dark:text-cyan-200 font-bold">
                <span>Gunakan Format Standar Template:</span>
                <button
                  id="btn-download-import-template"
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-cyan-800 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template Excel</span>
                </button>
              </div>
              <p className="text-[11px] text-cyan-800 dark:text-cyan-300">
                Template mendukung baris untuk <strong>Siswa</strong> (Kelas X, XI, XII) maupun <strong>Dewan Guru</strong> (Kelas: "Dewan Guru").
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih File Excel / CSV:
              </label>
              <input
                id="input-file-import"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-50 dark:file:bg-cyan-950/80 file:text-cyan-800 dark:file:text-cyan-300 hover:file:bg-cyan-100 dark:hover:file:bg-cyan-900 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Preview of Parsed Rows */}
            {importRows.length > 0 && (
              <div className="mb-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-xs">
                <p className="font-bold text-slate-900 dark:text-white mb-1.5">
                  ✅ Berhasil membaca {importRows.length} baris pemilih:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importRows.slice(0, 5).map((r, i) => (
                    <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex justify-between">
                      <span>{r.name} ({r.nis})</span>
                      <span className="font-bold text-cyan-800 dark:text-cyan-400">{r.class_name}</span>
                    </div>
                  ))}
                  {importRows.length > 5 && (
                    <p className="text-[10px] text-slate-400 italic">...dan {importRows.length - 5} pemilih lainnya</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                id="btn-cancel-import-action"
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportRows([]);
                }}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-process-import-action"
                type="button"
                disabled={importRows.length === 0 || importing}
                onClick={handleProcessImport}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {importing ? 'Mengimpor...' : `Proses Simpan (${importRows.length} Pemilih)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CETAK SURAT UNDANGAN RESMI & KARTU LOGIN PEMILIH (3 UNDANGAN PER A4) */}
      {isPrintCardsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col relative print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-none print:w-full print:max-w-none print:bg-white">
            
            {/* Header Dialog (Hidden on Print) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    Format Resmi Formal (Hemat Kertas • 3 Surat / A4)
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {printFilteredStudents.length} Undangan Siap Cetak
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display mt-0.5">
                  Surat Undangan Pemungutan Suara & Kartu Login
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desain formal standar KPU OSIS yang dioptimalkan pas 3 surat per lembar kertas A4.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <button
                  id="btn-download-html-cards"
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('printable-cards-container');
                    if (el) {
                      downloadPrintableHtml(
                        `Kartu_Undangan_Pemilih_OSIS_${new Date().toISOString().split('T')[0]}`,
                        el.innerHTML,
                        'Surat Undangan Pemungutan Suara & Kartu Login'
                      );
                      onShowAlert('success', 'File Siap Cetak Diunduh', 'File HTML siap cetak berhasil diunduh. Anda dapat membukanya dan menekan Ctrl+P untuk mencetak.');
                    }
                  }}
                  className="py-2 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Unduh file HTML mandiri yang bisa dibuka & dicetak langsung"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh HTML</span>
                </button>

                <button
                  id="btn-trigger-browser-print"
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('printable-cards-container');
                    if (el) {
                      printDocument({
                        title: 'Surat Undangan Pemungutan Suara & Kartu Login OSIS',
                        contentHtml: el.innerHTML,
                        onSuccess: () => {
                          onShowAlert('info', 'Membuka Dialog Cetak', 'Dialog cetak telah dibuka. Jika terblokir oleh browser preview, gunakan tombol "Unduh HTML" atau buka di tab baru.');
                        },
                        onError: () => {
                          onShowAlert('warning', 'Cetak Terblokir', 'Browser memblokir dialog cetak. Silakan gunakan tombol "Unduh HTML" untuk mencetak.');
                        }
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="py-2 px-4 bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 active:bg-cyan-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen (A4)</span>
                </button>

                <button
                  id="btn-close-print-cards"
                  type="button"
                  onClick={() => setIsPrintCardsOpen(false)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Bar (Hidden on Print) */}
            <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 my-3 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden shrink-0">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Cari Nama / NIS / NIP..."
                  value={printSearch}
                  onChange={(e) => setPrintSearch(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />

                {/* Filter Kategori / Kelas */}
                <select
                  value={printFilterClass}
                  onChange={(e) => setPrintFilterClass(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                >
                  <option value="ALL">Semua Pemilih</option>
                  <option value="GURU_ONLY">👔 Khusus Dewan Guru & Staf</option>
                  <option value="SISWA_ONLY">🎓 Khusus Siswa</option>
                  {classesList.map((c) => (
                    <option key={c} value={c}>
                      {c.toLowerCase().includes('guru') ? `Dewan Guru (${c})` : `Kelas ${c}`}
                    </option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={printFilterStatus}
                  onChange={(e) => setPrintFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="unvoted">Belum Memilih</option>
                  <option value="voted">Sudah Memilih</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Tip: Dokumen cetak tetap bersih dengan format kertas A4 putih standar.
              </div>
            </div>

            {/* Print Content Area (Format Formal Hemat Kertas: Pas 4 per A4) */}
            <div className="overflow-y-auto flex-1 pr-1 print:overflow-visible print:pr-0 print-page-a4">
              
              {printFilteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Tidak ada data pemilih yang sesuai dengan kriteria filter.
                </div>
              ) : (
                <div id="printable-cards-container" className="flex flex-col gap-2.5 print:gap-[3mm]">
                  {printFilteredStudents.map((s) => {
                    const isTeacher = s.class_name.toLowerCase().includes('guru') || s.major.toLowerCase().includes('guru') || s.major.toLowerCase().includes('pendidik');
                    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const qrLoginUrl = `${originUrl}/?user=${encodeURIComponent(s.nis)}&pin=${encodeURIComponent(s.pin)}`;
                    
                    // Robust Schedule Formatting (no raw ISO timestamps)
                    let scheduleDate = 'Hari Pemungutan Suara';
                    const rawDate = settings?.start_datetime || settings?.start_time;
                    if (rawDate) {
                      try {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                          scheduleDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                        }
                      } catch {
                        scheduleDate = 'Hari Pemungutan Suara';
                      }
                    }

                    const parseTime = (timeVal?: string | null, fallback = '08.00') => {
                      if (!timeVal) return fallback;
                      if (timeVal.includes('T')) {
                        try {
                          const d = new Date(timeVal);
                          if (!isNaN(d.getTime())) {
                            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
                          }
                        } catch {
                          return fallback;
                        }
                      }
                      return timeVal.replace(':', '.').slice(0, 5);
                    };

                    const startTimeStr = parseTime(settings?.start_time, '08.00');
                    const endTimeStr = parseTime(settings?.end_time, '14.00');
                    const scheduleTime = `${startTimeStr} – ${endTimeStr} WIB`;

                    return (
                      <div
                        key={s.id}
                        className="voter-card-print-item bg-white border border-black rounded p-2 text-black flex flex-col justify-between relative print:break-inside-avoid print:shadow-none shadow-xs font-sans leading-tight"
                      >
                        {/* 1. Kop Surat Panitia Pemilihan (Header Formal KPU OSIS) */}
                        <div className="pb-1 mb-1 border-b-2 border-black flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Logo Sekolah (Monokrom) */}
                            <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden">
                              {settings?.school_logo ? (
                                <img
                                  src={settings.school_logo}
                                  alt="Logo"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain filter grayscale contrast-125"
                                />
                              ) : (
                                <School className="w-5 h-5 text-black" />
                              )}
                            </div>

                            {/* Info Lembaga Kop */}
                            <div className="leading-tight">
                              <h4 className="text-[10px] font-black uppercase tracking-tight text-black">
                                KOMISI PEMILIHAN UMUM (KPU) OSIS
                              </h4>
                              <p className="text-[8.5px] font-bold text-black uppercase">
                                {settings?.school_name || 'SMAN 1 SUKABUMI'} • TP {settings?.academic_year || '2026/2027'}
                              </p>
                              <p className="text-[7.5px] font-medium text-black">
                                PEMILIHAN KETUA & WAKIL KETUA OSIS
                              </p>
                            </div>
                          </div>

                          {/* Info No DPT */}
                          <div className="text-right shrink-0 leading-tight">
                            <span className="inline-block border border-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white text-black">
                              KARTU HAK PILIH
                            </span>
                            <p className="text-[8px] font-mono font-bold text-black mt-0.5">
                              NO. DPT: DPT/{s.class_name.replace(/\s+/g, '-')}/{s.nis}
                            </p>
                          </div>
                        </div>

                        {/* 2. Isi Utama: 2 Kolom Padat & Seimbang (Kiri: Data & Jadwal, Kanan: QR Besar & Kredensial) */}
                        <div className="grid grid-cols-12 gap-2.5 items-center my-0.5">
                          
                          {/* Kolom Kiri: Identitas Pemilih, Jadwal & Pengesahan (7/12) */}
                          <div className="col-span-7 space-y-1">
                            {/* Box Identitas */}
                            <div className="border border-black p-1.5 rounded text-black bg-white">
                              <p className="text-[7.5px] text-black font-semibold mb-0.5">
                                Kepada Yth. {isTeacher ? 'Bapak/Ibu Guru/Staf' : 'Pemilih Siswa/i'}:
                              </p>
                              <div className="text-[11.5px] font-black text-black leading-snug truncate">
                                {s.name}
                              </div>
                              <div className="flex items-center gap-3 text-[8.5px] font-mono font-bold mt-0.5 text-black">
                                <span>{isTeacher ? 'NIP' : 'NIS'}: {s.nis}</span>
                                <span>Kelas: {s.class_name}</span>
                              </div>
                            </div>

                            {/* Box Jadwal & Bilik */}
                            <div className="border border-black p-1 rounded text-[7.5px] leading-tight space-y-0.5">
                              <div className="flex justify-between items-center font-bold">
                                <span>📅 Jadwal: {scheduleDate}</span>
                                <span>⏰ {scheduleTime}</span>
                              </div>
                              <div className="flex justify-between items-center text-[7px]">
                                <span>📍 Lokasi: Bilik Suara E-Voting / HP Pemilih</span>
                                <span className="font-bold italic">*1 akun = 1 hak suara</span>
                              </div>
                            </div>

                            {/* Petunjuk / Catatan Keamanan Singkat */}
                            <div className="text-[7px] text-black">
                              <span>Hak suara sah bersifat <strong>LUBER & JURDIL</strong> (Langsung, Umum, Bebas, Rahasia, Jujur & Adil).</span>
                            </div>
                          </div>

                          {/* Kolom Kanan: QR Code BESAR & Kotak Kredensial (5/12) */}
                          <div className="col-span-5 space-y-1">
                            <div className="border border-black rounded p-1.5 flex items-center gap-2 bg-white">
                              {/* QR Code BESAR (Mudah Di-scan Kamera HP) */}
                              <div className="shrink-0 flex flex-col items-center">
                                <div className="p-1 border border-black bg-white inline-block">
                                  <QRCodeSVG
                                    value={qrLoginUrl}
                                    size={58}
                                    level="M"
                                    fgColor="#000000"
                                    bgColor="#ffffff"
                                  />
                                </div>
                                <span className="text-[6px] font-black uppercase tracking-tighter text-black mt-0.5">
                                  SCAN LOGIN
                                </span>
                              </div>

                              {/* Kredensial Login */}
                              <div className="grow space-y-1 font-mono text-center">
                                <div className="border border-black p-1 rounded text-left">
                                  <div className="text-[7px] font-sans font-bold leading-none mb-0.5">
                                    USER ({isTeacher ? 'NIP' : 'NIS'})
                                  </div>
                                  <div className="text-[10px] font-black text-black tracking-wider leading-none mb-1">
                                    {s.nis}
                                  </div>
                                  <div className="text-[7px] font-sans font-bold leading-none mb-0.5 pt-0.5 border-t border-black">
                                    PASSWORD (PIN)
                                  </div>
                                  <div className="text-[10px] font-black text-black tracking-wider leading-none">
                                    {s.pin}
                                  </div>
                                </div>

                                <div className="border border-black py-0.5 text-center text-[7px] font-bold uppercase tracking-tight">
                                  🗳️ BILIK SUARA
                                </div>
                              </div>
                            </div>

                            <p className="text-[6px] text-center font-semibold text-black leading-none">
                              ⚠️ Rahasiakan PIN/Kode ini kepada orang lain
                            </p>
                          </div>

                        </div>

                        {/* 3. Pengesahan & Cap Stempel Panitia Pemilihan (Tanpa Garis Pembatas Horizontal) */}
                        <div className="pt-0.5 pb-0 flex items-end justify-between text-black">
                          <div className="text-[6.5px] leading-tight space-y-0.5 max-w-[55%]">
                            <p className="font-bold uppercase tracking-tight">DOKUMEN RESMI PANITIA PEMILIHAN OSIS</p>
                            <p className="italic text-[6px]">Simpan kartu ini sebagai bukti hak pilih sah pada pemilihan OSIS.</p>
                          </div>

                          {/* Cap Stempel & TTD Ketua Panitia */}
                          <div className="relative text-right leading-none shrink-0 min-w-[120px]">
                            <p className="font-semibold text-[7px] text-black mb-2.5">Ketua Panitia,</p>

                            {/* Stempel Cap Persegi Panjang Asli Sesuai Referensi (Overlapping Nama) */}
                            <div className="absolute -left-6 -top-2 w-[84px] h-[34px] pointer-events-none -rotate-6 select-none z-10">
                              <svg viewBox="0 0 140 54" className="w-full h-full" style={{ color: '#00257a' }}>
                                {/* Double rectangular border */}
                                <rect x="2" y="2" width="136" height="50" fill="none" stroke="currentColor" strokeWidth="2.2" />
                                <rect x="5" y="5" width="130" height="44" fill="none" stroke="currentColor" strokeWidth="1.0" />
                                
                                {/* Teks Atas: PANITIA PEMILIHAN */}
                                <text
                                  x="70"
                                  y="22"
                                  textAnchor="middle"
                                  className="font-black tracking-wider uppercase font-sans"
                                  style={{ fontSize: '11px', fontWeight: 900 }}
                                  fill="currentColor"
                                >
                                  PANITIA PEMILIHAN
                                </text>
                                
                                {/* Garis Ganda Pembatas Tengah */}
                                <line x1="10" y1="28" x2="130" y2="28" stroke="currentColor" strokeWidth="1.3" />
                                <line x1="10" y1="31" x2="130" y2="31" stroke="currentColor" strokeWidth="0.8" />
                                
                                {/* Teks Bawah: — KETUA & WAKIL KETUA OSIS — */}
                                <text
                                  x="70"
                                  y="43"
                                  textAnchor="middle"
                                  className="font-bold tracking-tight uppercase font-sans"
                                  style={{ fontSize: '8px', fontWeight: 800 }}
                                  fill="currentColor"
                                >
                                  — KETUA & WAKIL KETUA OSIS —
                                </text>
                              </svg>
                            </div>

                            {/* Teks Nama Ketua Panitia */}
                            <p className="font-black text-[8px] underline text-black relative z-0">
                              {settings?.committee_chair || 'Ketua Panitia'}
                            </p>
                          </div>
                        </div>

                        {/* 4. Garis Potong Panduan Gunting Kertas A4 */}
                        <div className="pt-0.5 border-t border-dashed border-black flex items-center justify-between text-[6.5px] text-black font-mono leading-none">
                          <span>✂ Gunting di sini</span>
                          <span>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                          <span>✂ Potong</span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
