import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  Loader2,
} from 'lucide-react';
import { Candidate } from '../types';

interface AdminCandidatesProps {
  onShowAlert: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export function AdminCandidates({ onShowAlert, onShowConfirm }: AdminCandidatesProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Form State
  const [candidateNumber, setCandidateNumber] = useState<number>(1);
  const [chairmanName, setChairmanName] = useState('');
  const [chairmanPhoto, setChairmanPhoto] = useState('');
  const [viceChairmanName, setViceChairmanName] = useState('');
  const [viceChairmanPhoto, setViceChairmanPhoto] = useState('');
  const [vision, setVision] = useState('');
  const [missions, setMissions] = useState<string[]>(['']);
  const [workPrograms, setWorkPrograms] = useState<string[]>(['']);
  const [videoUrl, setVideoUrl] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Upload States
  const [uploadingChairman, setUploadingChairman] = useState(false);
  const [uploadingVice, setUploadingVice] = useState(false);

  const handleChairmanPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowAlert('warning', 'File Terlalu Besar', 'Ukuran foto maksimal 5 MB.');
      return;
    }

    setUploadingChairman(true);
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
          body: JSON.stringify({ image: base64, folder: 'evoting/candidates' }),
        });
        const data = await res.json();
        if (data.success) {
          setChairmanPhoto(data.url);
          onShowAlert('success', 'Foto Terunggah', 'Foto Calon Ketua berhasil diunggah ke Cloudinary.');
        } else {
          onShowAlert('error', 'Gagal Upload', data.message);
        }
      } catch (err) {
        onShowAlert('error', 'Error Upload', 'Gagal mengunggah foto Calon Ketua.');
      } finally {
        setUploadingChairman(false);
      }
    };
    reader.onerror = () => {
      onShowAlert('error', 'Error File', 'Gagal membaca file gambar.');
      setUploadingChairman(false);
    };
    reader.readAsDataURL(file);
  };

  const handleVicePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowAlert('warning', 'File Terlalu Besar', 'Ukuran foto maksimal 5 MB.');
      return;
    }

    setUploadingVice(true);
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
          body: JSON.stringify({ image: base64, folder: 'evoting/candidates' }),
        });
        const data = await res.json();
        if (data.success) {
          setViceChairmanPhoto(data.url);
          onShowAlert('success', 'Foto Terunggah', 'Foto Calon Wakil Ketua berhasil diunggah ke Cloudinary.');
        } else {
          onShowAlert('error', 'Gagal Upload', data.message);
        }
      } catch (err) {
        onShowAlert('error', 'Error Upload', 'Gagal mengunggah foto Calon Wakil.');
      } finally {
        setUploadingVice(false);
      }
    };
    reader.onerror = () => {
      onShowAlert('error', 'Error File', 'Gagal membaca file gambar.');
      setUploadingVice(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveChairmanPhoto = async () => {
    if (chairmanPhoto && chairmanPhoto.includes('cloudinary.com')) {
      try {
        const token = localStorage.getItem('evoting_token');
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: chairmanPhoto }),
        });
      } catch (err) {
        console.error('Error deleting chairman photo from Cloudinary:', err);
      }
    }
    setChairmanPhoto('');
    onShowAlert('info', 'Foto Dihapus', 'Foto Calon Ketua telah dihapus dari Cloudinary.');
  };

  const handleRemoveVicePhoto = async () => {
    if (viceChairmanPhoto && viceChairmanPhoto.includes('cloudinary.com')) {
      try {
        const token = localStorage.getItem('evoting_token');
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: viceChairmanPhoto }),
        });
      } catch (err) {
        console.error('Error deleting vice chairman photo from Cloudinary:', err);
      }
    }
    setViceChairmanPhoto('');
    onShowAlert('info', 'Foto Dihapus', 'Foto Calon Wakil Ketua telah dihapus dari Cloudinary.');
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('evoting_token');
      const res = await fetch('/api/candidates?include_votes=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data);
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCandidate(null);
    setCandidateNumber(candidates.length + 1);
    setChairmanName('');
    setChairmanPhoto('');
    setViceChairmanName('');
    setViceChairmanPhoto('');
    setVision('');
    setMissions(['']);
    setWorkPrograms(['']);
    setVideoUrl('');
    setBrochureUrl('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Candidate) => {
    setEditingCandidate(c);
    setCandidateNumber(c.candidate_number);
    setChairmanName(c.chairman_name);
    setChairmanPhoto(c.chairman_photo);
    setViceChairmanName(c.vice_chairman_name);
    setViceChairmanPhoto(c.vice_chairman_photo);
    setVision(c.vision);
    setMissions(c.missions && c.missions.length > 0 ? [...c.missions] : ['']);
    setWorkPrograms(c.work_programs && c.work_programs.length > 0 ? [...c.work_programs] : ['']);
    setVideoUrl(c.video_url || '');
    setBrochureUrl(c.brochure_url || '');
    setIsActive(c.is_active);
    setIsModalOpen(true);
  };

  // Missions helper
  const handleAddMission = () => setMissions([...missions, '']);
  const handleMissionChange = (index: number, val: string) => {
    const updated = [...missions];
    updated[index] = val;
    setMissions(updated);
  };
  const handleRemoveMission = (index: number) => {
    setMissions(missions.filter((_, i) => i !== index));
  };

  // Work Programs helper
  const handleAddProgram = () => setWorkPrograms([...workPrograms, '']);
  const handleProgramChange = (index: number, val: string) => {
    const updated = [...workPrograms];
    updated[index] = val;
    setWorkPrograms(updated);
  };
  const handleRemoveProgram = (index: number) => {
    setWorkPrograms(workPrograms.filter((_, i) => i !== index));
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairmanName.trim() || !viceChairmanName.trim() || !vision.trim()) {
      onShowAlert('warning', 'Validasi Gagal', 'Nama Calon Ketua, Calon Wakil Ketua, dan Visi wajib diisi.');
      return;
    }

    const payload = {
      candidate_number: candidateNumber,
      chairman_name: chairmanName.trim(),
      chairman_photo: chairmanPhoto.trim() || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
      vice_chairman_name: viceChairmanName.trim(),
      vice_chairman_photo: viceChairmanPhoto.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      vision: vision.trim(),
      missions: missions.filter((m) => m.trim().length > 0),
      work_programs: workPrograms.filter((p) => p.trim().length > 0),
      video_url: videoUrl.trim() || undefined,
      brochure_url: brochureUrl.trim() || undefined,
      is_active: isActive,
    };

    try {
      const token = localStorage.getItem('evoting_token');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      let res;
      if (editingCandidate) {
        res = await fetch(`/api/candidates/${editingCandidate.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/candidates', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        onShowAlert('success', 'Berhasil', data.message);
        setIsModalOpen(false);
        loadCandidates();
      } else {
        onShowAlert('error', 'Gagal', data.message);
      }
    } catch (err) {
      onShowAlert('error', 'Error', 'Gagal menyimpan data kandidat.');
    }
  };

  const handleDeleteCandidate = (c: Candidate) => {
    onShowConfirm(
      'Hapus Paslon',
      `Yakin ingin menghapus data Paslon No. 0${c.candidate_number} (${c.chairman_name} & ${c.vice_chairman_name})?`,
      async () => {
        try {
          const token = localStorage.getItem('evoting_token');
          const res = await fetch(`/api/candidates/${c.id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          if (data.success) {
            onShowAlert('success', 'Terhapus', data.message);
            loadCandidates();
          } else {
            onShowAlert('error', 'Gagal', data.message);
          }
        } catch (e) {
          onShowAlert('error', 'Error', 'Gagal menghapus data kandidat.');
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-300 border border-transparent dark:border-cyan-800">
              <Award className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
              Kandidat Calon Ketua & Wakil
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{candidates.length} Paslon Terdaftar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
            Manajemen Pasangan Calon (Paslon)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Atur nomor urut, foto profil, visi, misi, dan program kerja unggulan pasangan calon OSIS.
          </p>
        </div>

        <button
          id="btn-add-candidate"
          type="button"
          onClick={handleOpenAdd}
          className="py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start lg:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pasangan Calon</span>
        </button>
      </div>

      {/* Candidates List Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 dark:text-slate-500">Memuat data kandidat...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">Belum Ada Paslon</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Tambahkan pasangan calon ketua dan wakil ketua untuk memulai pemilihan.
          </p>
          <button
            onClick={handleOpenAdd}
            className="py-2 px-4 bg-cyan-700 text-white font-bold text-xs rounded-xl"
          >
            + Tambah Paslon Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Number & Status Bar */}
                <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-cyan-300">PASLON</span>
                    <span className="w-6 h-6 rounded-md bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      0{c.candidate_number}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    Kandidat Resmi
                  </div>
                </div>

                {/* Candidate Photos preview */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-center">
                  <div className="space-y-1">
                    <div className="aspect-3/4 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                      <img
                        src={c.chairman_photo}
                        alt={c.chairman_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Ketua</span>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{c.chairman_name}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="aspect-3/4 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                      <img
                        src={c.vice_chairman_photo}
                        alt={c.vice_chairman_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Wakil</span>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{c.vice_chairman_name}</p>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                      Visi Utama:
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3 leading-relaxed">
                      "{c.vision}"
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                      {c.missions?.length || 0} Misi
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                      {c.work_programs?.length || 0} Program Kerja
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions footer */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  id={`btn-edit-cand-${c.candidate_number}`}
                  type="button"
                  onClick={() => handleOpenEdit(c)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                  <span>Edit Paslon</span>
                </button>
                <button
                  id={`btn-delete-cand-${c.candidate_number}`}
                  type="button"
                  onClick={() => handleDeleteCandidate(c)}
                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                  title="Hapus Paslon"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT CANDIDATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto relative">
            <button
              id="btn-close-cand-modal"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display mb-1">
              {editingCandidate ? 'Edit Data Paslon' : 'Tambah Pasangan Calon Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Lengkapi profil calon Ketua & Wakil Ketua OSIS serta dokumen visi misi resmi.
            </p>

            <form onSubmit={handleSaveCandidate} className="space-y-4">
              
              {/* Row 1: Nomor Urut */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Urut Pasangan Calon</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-cyan-400 font-black text-sm flex items-center justify-center shrink-0 border border-slate-700">
                    0{candidateNumber}
                  </div>
                  <input
                    id="input-cand-number"
                    type="number"
                    min="1"
                    required
                    value={candidateNumber}
                    onChange={(e) => setCandidateNumber(Number(e.target.value))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none"
                    placeholder="Nomor Urut (misal 1, 2, 3)"
                  />
                </div>
              </div>

              {/* Row 2: Calon Ketua */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-extrabold text-cyan-900 dark:text-cyan-400 uppercase tracking-wider block">
                  Identitas Calon Ketua OSIS:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Ketua</label>
                    <input
                      id="input-chair-name"
                      type="text"
                      required
                      placeholder="Nama Calon Ketua"
                      value={chairmanName}
                      onChange={(e) => setChairmanName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Foto Profil Ketua</label>
                    <div className="flex items-center gap-2">
                      {chairmanPhoto ? (
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 shrink-0">
                          <img src={chairmanPhoto} alt="Ketua" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : null}
                      <label
                        htmlFor="upload-chair-photo-file"
                        className="flex-1 py-2 px-3 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-xs"
                      >
                        {uploadingChairman ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{chairmanPhoto ? 'Ganti Foto Ketua' : 'Upload Foto Ketua'}</span>
                          </>
                        )}
                      </label>
                      {chairmanPhoto && (
                        <button
                          type="button"
                          onClick={handleRemoveChairmanPhoto}
                          className="py-2 px-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:text-rose-700 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          title="Hapus foto"
                        >
                          Hapus
                        </button>
                      )}
                      <input
                        id="upload-chair-photo-file"
                        type="file"
                        accept="image/*"
                        onChange={handleChairmanPhotoUpload}
                        disabled={uploadingChairman}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Calon Wakil Ketua */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-extrabold text-cyan-900 dark:text-cyan-400 uppercase tracking-wider block">
                  Identitas Calon Wakil Ketua OSIS:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Wakil</label>
                    <input
                      id="input-vice-name"
                      type="text"
                      required
                      placeholder="Nama Calon Wakil"
                      value={viceChairmanName}
                      onChange={(e) => setViceChairmanName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Foto Profil Wakil</label>
                    <div className="flex items-center gap-2">
                      {viceChairmanPhoto ? (
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 shrink-0">
                          <img src={viceChairmanPhoto} alt="Wakil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : null}
                      <label
                        htmlFor="upload-vice-photo-file"
                        className="flex-1 py-2 px-3 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-xs"
                      >
                        {uploadingVice ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{viceChairmanPhoto ? 'Ganti Foto Wakil' : 'Upload Foto Wakil'}</span>
                          </>
                        )}
                      </label>
                      {viceChairmanPhoto && (
                        <button
                          type="button"
                          onClick={handleRemoveVicePhoto}
                          className="py-2 px-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:text-rose-700 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          title="Hapus foto"
                        >
                          Hapus
                        </button>
                      )}
                      <input
                        id="upload-vice-photo-file"
                        type="file"
                        accept="image/*"
                        onChange={handleVicePhotoUpload}
                        disabled={uploadingVice}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Row 4: Visi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visi Pasangan Calon</label>
                <textarea
                  id="input-cand-vision"
                  required
                  rows={3}
                  placeholder="Tuliskan visi paslon secara jelas..."
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none"
                />
              </div>

              {/* Row 5: Misi List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Misi (Poin-Poin)</label>
                  <button
                    id="btn-add-mission-point"
                    type="button"
                    onClick={handleAddMission}
                    className="text-xs font-bold text-cyan-800 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Tambah Misi</span>
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {missions.map((m, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => handleMissionChange(idx, e.target.value)}
                        placeholder={`Misi poin ke-${idx + 1}`}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none"
                      />
                      {missions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMission(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 6: Program Kerja List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Program Kerja Unggulan</label>
                  <button
                    id="btn-add-program-point"
                    type="button"
                    onClick={handleAddProgram}
                    className="text-xs font-bold text-cyan-800 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Tambah Proker</span>
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {workPrograms.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={p}
                        onChange={(e) => handleProgramChange(idx, e.target.value)}
                        placeholder={`Nama program kerja ${idx + 1}`}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none"
                      />
                      {workPrograms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProgram(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 7: Media Kampanye (Video & Brosur) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Link Video Kampanye (YouTube/URL)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... (Opsional)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Link Brosur/Poster Digital (URL)</label>
                  <input
                    type="url"
                    value={brochureUrl}
                    onChange={(e) => setBrochureUrl(e.target.value)}
                    placeholder="https://... (Poster PDF/Gambar Opsional)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="btn-cancel-cand-modal"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-cand-modal"
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Data Paslon
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
