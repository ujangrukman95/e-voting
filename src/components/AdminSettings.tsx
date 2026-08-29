import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  School,
  Calendar,
  Clock,
  Vote,
  Eye,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
  FileSignature,
  UserCheck,
  Building2,
  Users,
  Upload,
  Image as ImageIcon,
  Loader2,
  Database,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Settings } from '../types';

interface AdminSettingsProps {
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
}

export function AdminSettings({ settings, onUpdateSettings, onShowAlert }: AdminSettingsProps) {
  const [formData, setFormData] = useState<Settings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Synchronize form state if settings props change from server
  React.useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // Admin password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  const getAuthHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('evoting_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const toDatetimeLocal = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const deriveStatusFromDates = (startIso?: string | null, endIso?: string | null): 'draft' | 'ongoing' | 'ended' => {
    const now = Date.now();
    const start = startIso ? new Date(startIso).getTime() : NaN;
    const end = endIso ? new Date(endIso).getTime() : NaN;

    if (!isNaN(end) && now >= end) return 'ended';
    if (!isNaN(start) && now < start) return 'draft';
    if (!isNaN(start) && now >= start) return 'ongoing';
    return 'draft';
  };

  const handleStartDateChange = (isoVal: string | undefined) => {
    const nextStart = isoVal;
    const nextEnd = formData.end_datetime || formData.end_time;
    const computedStatus = deriveStatusFromDates(nextStart, nextEnd);
    setFormData({
      ...formData,
      start_datetime: nextStart,
      start_time: nextStart,
      election_status: computedStatus,
    });
  };

  const handleEndDateChange = (isoVal: string | undefined) => {
    const nextStart = formData.start_datetime || formData.start_time;
    const nextEnd = isoVal;
    const computedStatus = deriveStatusFromDates(nextStart, nextEnd);
    setFormData({
      ...formData,
      end_datetime: nextEnd,
      end_time: nextEnd,
      election_status: computedStatus,
    });
  };

  const handleStatusSelectChange = (newStatus: 'draft' | 'ongoing' | 'ended') => {
    const now = new Date();
    let nextStart = formData.start_datetime || formData.start_time;
    let nextEnd = formData.end_datetime || formData.end_time;

    if (newStatus === 'ongoing') {
      const startMs = nextStart ? new Date(nextStart).getTime() : NaN;
      if (isNaN(startMs) || startMs > now.getTime()) {
        nextStart = now.toISOString();
      }
      const endMs = nextEnd ? new Date(nextEnd).getTime() : NaN;
      if (isNaN(endMs) || endMs <= now.getTime()) {
        nextEnd = new Date(now.getTime() + 86400000).toISOString();
      }
    } else if (newStatus === 'ended') {
      const endMs = nextEnd ? new Date(nextEnd).getTime() : NaN;
      if (isNaN(endMs) || endMs > now.getTime()) {
        nextEnd = now.toISOString();
      }
    } else if (newStatus === 'draft') {
      const startMs = nextStart ? new Date(nextStart).getTime() : NaN;
      if (isNaN(startMs) || startMs <= now.getTime()) {
        nextStart = new Date(now.getTime() + 86400000).toISOString();
      }
    }

    setFormData({
      ...formData,
      election_status: newStatus,
      start_datetime: nextStart,
      start_time: nextStart,
      end_datetime: nextEnd,
      end_time: nextEnd,
    });
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowAlert('warning', 'Ukuran File Terlalu Besar', 'Maksimal ukuran gambar logo adalah 5MB.');
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const token = localStorage.getItem('evoting_token');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ image: base64, folder: 'evoting/logo' }),
        });
        const data = await res.json();
        if (data.success) {
          setFormData((prev) => ({ ...prev, school_logo: data.url }));
          onShowAlert('success', 'Logo Terunggah', 'Logo baru berhasil diunggah ke Cloudinary.');
        } else {
          onShowAlert('error', 'Gagal Upload', data.message || 'Gagal mengunggah logo.');
        }
      } catch (err) {
        onShowAlert('error', 'Error Upload', 'Terjadi kesalahan saat mengunggah gambar.');
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.onerror = () => {
      onShowAlert('error', 'Error File', 'Gagal membaca file gambar.');
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    const logoUrl = formData.school_logo;
    if (logoUrl && logoUrl.includes('cloudinary.com')) {
      try {
        const token = localStorage.getItem('evoting_token');
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: logoUrl }),
        });
      } catch (e) {
        console.error('Error deleting logo from Cloudinary:', e);
      }
    }
    setFormData((prev) => ({ ...prev, school_logo: '' }));
    onShowAlert('info', 'Logo Dihapus', 'Foto logo telah dihapus dari Cloudinary & pengaturan.');
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateSettings(formData);
      onShowAlert('success', 'Pengaturan Tersimpan', 'Konfigurasi pemilihan & penandatangan Berita Acara berhasil diperbarui.');
    } catch (err) {
      onShowAlert('error', 'Gagal', 'Gagal menyimpan perubahan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onShowAlert('warning', 'Validasi Gagal', 'Konfirmasi password baru tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      onShowAlert('warning', 'Password Terlalu Pendek', 'Password baru minimal 6 karakter.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await fetch('/api/auth/change-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        onShowAlert('success', 'Berhasil', data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        onShowAlert('error', 'Gagal', data.message);
      }
    } catch (err) {
      onShowAlert('error', 'Error', 'Gagal memperbarui password admin.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <SettingsIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              Konfigurasi Sistem
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
            Pengaturan Aplikasi E-Voting
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Konfigurasi identitas sekolah, periode pemilihan, penandatangan Berita Acara, status voting, dan keamanan.
          </p>
        </div>
      </div>

      {/* Form Settings */}
      <form onSubmit={handleSubmitSettings} className="space-y-6">
        
        {/* Section 1: Identitas Sekolah & Acara */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <School className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Identitas Sekolah & Kegiatan</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Sekolah</label>
              <input
                id="input-setting-school-name"
                type="text"
                required
                value={formData.school_name}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tahun Pelajaran</label>
              <input
                id="input-setting-academic-year"
                type="text"
                required
                placeholder="2026/2027"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Kegiatan Pemilihan</label>
            <input
              id="input-setting-event-title"
              type="text"
              required
              value={formData.event_title}
              onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Sekolah / Sekretariat</label>
              <input
                id="input-setting-school-address"
                type="text"
                value={formData.school_address || ''}
                onChange={(e) => setFormData({ ...formData, school_address: e.target.value })}
                placeholder="Jl. Ir. H. Djuanda No. 16, Kota Sukabumi"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Logo Aplikasi / Sekolah</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3">
                {formData.school_logo ? (
                  <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                    <img
                      src={formData.school_logo}
                      alt="Logo Sekolah"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}

                <div className="flex-1 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formData.school_logo ? 'Logo Tersimpan di Cloudinary' : 'Belum Ada Logo Terpasang'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {formData.school_logo
                        ? 'Logo lama di Cloudinary otomatis terhapus saat Anda mengunggah logo baru.'
                        : 'Unggah gambar logo sekolah/aplikasi (format PNG/JPG, maks 5MB)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      htmlFor="upload-setting-logo-file"
                      className="py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>{formData.school_logo ? 'Ganti Logo' : 'Upload Logo'}</span>
                        </>
                      )}
                    </label>
                    {formData.school_logo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="py-2.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:text-rose-700 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Hapus Logo
                      </button>
                    )}
                    <input
                      id="upload-setting-logo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Jadwal & Status Pemilihan (Countdown Trigger) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Vote className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Jadwal & Status Bilik Suara (E-Voting)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Waktu Mulai Voting (Pembukaan Countdown)
              </label>
              <input
                id="input-setting-start-time"
                type="datetime-local"
                value={toDatetimeLocal(formData.start_datetime || formData.start_time)}
                onChange={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                  handleStartDateChange(val);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Bila waktu belum tiba, pemilih melihat layar Hitung Mundur (Countdown).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Waktu Selesai Voting (Penutupan Bilik)
              </label>
              <input
                id="input-setting-end-time"
                type="datetime-local"
                value={toDatetimeLocal(formData.end_datetime || formData.end_time)}
                onChange={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                  handleEndDateChange(val);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Batas akhir pengumpulan hak suara secara online.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Pemilihan (Otomatis Terhubung / Override)</label>
              <select
                id="select-setting-election-status"
                value={formData.election_status}
                onChange={(e) => handleStatusSelectChange(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              >
                <option value="draft">🟡 Belum Dimulai (Draft - Tampilkan Countdown)</option>
                <option value="ongoing">🟢 Sedang Berlangsung (Bilik Suara Dibuka)</option>
                <option value="ended">🔴 Selesai (Bilik Suara Ditutup)</option>
              </select>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                ✨ Status & Jadwal saling sinkron otomatis: Mengubah tanggal akan menyesuaikan status, dan memilih status akan memperbarui tanggal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visibilitas Hasil bagi Pemilih</label>
              <select
                id="select-setting-result-vis"
                value={formData.result_visibility}
                onChange={(e) => setFormData({ ...formData, result_visibility: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              >
                <option value="hidden">🔒 Disembunyikan (Hanya Admin)</option>
                <option value="after_ended">⏳ Tampilkan Setelah Pemilihan Selesai</option>
                <option value="realtime">🌐 Tampilkan Realtime ke Siswa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: PENGATURAN PENANDATANGAN BERITA ACARA RESMI */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              <span>Penandatangan Berita Acara & Dokumen Resmi</span>
            </h3>
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 px-2 py-0.5 rounded-md">
              KPU OSIS & Sekolah
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nama pejabat dan nomor identitas (NIP/NIS) di bawah ini akan otomatis tercetak pada dokumen <strong>Berita Acara Rapat Pleno</strong> dan <strong>Laporan Hasil Pemilihan OSIS</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Kepala Sekolah */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2.5">
              <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">1. Kepala Sekolah</span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Lengkap & Gelar</label>
                <input
                  id="input-setting-principal-name"
                  type="text"
                  value={formData.principal_name || ''}
                  onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                  placeholder="Drs. H. Rachmat Hidayat, M.Pd."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">NIP Kepala Sekolah</label>
                <input
                  id="input-setting-principal-nip"
                  type="text"
                  value={formData.principal_nip || ''}
                  onChange={(e) => setFormData({ ...formData, principal_nip: e.target.value })}
                  placeholder="19680514 199403 1 004"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
            </div>

            {/* 2. Pembina OSIS */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2.5">
              <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">2. Pembina OSIS & Kesiswaan</span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Pembina & Gelar</label>
                <input
                  id="input-setting-osis-advisor"
                  type="text"
                  value={formData.osis_advisor || ''}
                  onChange={(e) => setFormData({ ...formData, osis_advisor: e.target.value })}
                  placeholder="Dra. Hj. Siti Nurjanah, M.Pd."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">NIP Pembina OSIS</label>
                <input
                  id="input-setting-advisor-nip"
                  type="text"
                  value={formData.advisor_nip || ''}
                  onChange={(e) => setFormData({ ...formData, advisor_nip: e.target.value })}
                  placeholder="19750822 200312 2 006"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
            </div>

            {/* 3. Ketua Panitia KPU OSIS */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2.5">
              <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">3. Ketua Panitia KPU OSIS</span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Ketua Panitia</label>
                <input
                  id="input-setting-committee-chair"
                  type="text"
                  value={formData.committee_chair || ''}
                  onChange={(e) => setFormData({ ...formData, committee_chair: e.target.value })}
                  placeholder="Muhammad Fajar Pratama"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">NIS Ketua Panitia</label>
                <input
                  id="input-setting-chair-nis"
                  type="text"
                  value={formData.chair_nis || ''}
                  onChange={(e) => setFormData({ ...formData, chair_nis: e.target.value })}
                  placeholder="102401"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
            </div>

            {/* 4. Sekretaris Panitia KPU OSIS */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2.5">
              <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">4. Sekretaris Panitia KPU OSIS</span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Sekretaris</label>
                <input
                  id="input-setting-committee-sec"
                  type="text"
                  value={formData.committee_secretary || ''}
                  onChange={(e) => setFormData({ ...formData, committee_secretary: e.target.value })}
                  placeholder="Aura Nadhira Putri"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">NIS Sekretaris</label>
                <input
                  id="input-setting-sec-nis"
                  type="text"
                  value={formData.secretary_nis || ''}
                  onChange={(e) => setFormData({ ...formData, secretary_nis: e.target.value })}
                  placeholder="102405"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
            </div>

            {/* 5. Saksi 1 & Saksi 2 */}
            <div className="sm:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Saksi Pemilihan 1</label>
                <input
                  id="input-setting-witness-1"
                  type="text"
                  value={formData.witness_1_name || ''}
                  onChange={(e) => setFormData({ ...formData, witness_1_name: e.target.value })}
                  placeholder="Bagas Aditya Pratama (Saksi Paslon 1)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Saksi Pemilihan 2</label>
                <input
                  id="input-setting-witness-2"
                  type="text"
                  value={formData.witness_2_name || ''}
                  onChange={(e) => setFormData({ ...formData, witness_2_name: e.target.value })}
                  placeholder="Fikri Haikal Akbar (Saksi Paslon 2 & 3)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
                />
              </div>
            </div>

          </div>

          <div className="pt-3 flex justify-end">
            <button
              id="btn-save-general-settings"
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
            </button>
          </div>
        </div>

      </form>

      {/* Section 4: Ganti Password Admin */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <KeyRound className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span>Keamanan Akun Administrator</span>
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password Saat Ini</label>
              <input
                id="input-curr-pwd"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password Baru</label>
              <input
                id="input-new-pwd"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Konfirmasi Password Baru</label>
              <input
                id="input-confirm-pwd"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-update-admin-password"
              type="submit"
              disabled={passwordUpdating}
              className="py-2.5 px-5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {passwordUpdating ? 'Memperbarui...' : 'Perbarui Password Admin'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 5: BACKUP & RESTORE DATA JSON */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-cyan-800 dark:text-cyan-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Cadangan & Pemulihan Data (Backup & Restore)</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Unduh salinan data cadangan (.json) seluruh database (Pengaturan, DPT Siswa, Paslon, Suara, dan Audit Log) untuk arsip aman panitia, atau pulihkan data dari file backup.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Download Backup */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-cyan-800 dark:text-cyan-400" />
                <span>Unduh Cadangan Data (Export JSON)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Menghasilkan file cadangan lengkap dalam format JSON yang dapat disimpan di komputer panitia.
              </p>
            </div>

            <a
              id="btn-download-backup-json"
              href="/api/backup/export"
              download
              className="py-2.5 px-4 bg-cyan-800 hover:bg-cyan-900 dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File Backup (.json)</span>
            </a>
          </div>

          {/* Restore Backup */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Pulihkan Data (Import JSON)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Unggah file cadangan (.json) untuk mengembalikan seluruh data sistem E-Voting.
              </p>
            </div>

            <label className="py-2.5 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer text-center">
              <Upload className="w-4 h-4" />
              <span>{restoring ? 'Memulihkan Data...' : 'Pilih File Backup (.json)'}</span>
              <input
                id="input-restore-backup-file"
                type="file"
                accept=".json,application/json"
                disabled={restoring}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setRestoring(true);
                  try {
                    const text = await file.text();
                    const jsonData = JSON.parse(text);
                    const res = await fetch('/api/backup/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(jsonData),
                    });
                    const data = await res.json();
                    if (data.success) {
                      onShowAlert('success', 'Pemulihan Berhasil', data.message);
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      onShowAlert('error', 'Gagal Pemulihan', data.message);
                    }
                  } catch (err) {
                    onShowAlert('error', 'File Rusak', 'Format file JSON backup tidak valid.');
                  } finally {
                    setRestoring(false);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

        </div>
      </div>

    </div>
  );
}
