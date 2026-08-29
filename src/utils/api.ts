import {
  User,
  Student,
  Candidate,
  Settings,
  DashboardStats,
  ResultsData,
  AuditLog,
  ElectionStatus,
} from '../types';

// Support custom API Base URL for Vercel / External Server or fallback to default '/api'
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const API_BASE = metaEnv?.VITE_API_URL
  ? String(metaEnv.VITE_API_URL).replace(/\/$/, '')
  : '/api';

// Helper function to get effective election status (factoring in schedule and admin status)
export function getEffectiveStatus(settings: Settings): 'draft' | 'ongoing' | 'ended' {
  if (!settings) return 'draft';
  if (settings.election_status === 'ended') return 'ended';

  const now = Date.now();
  const startTime = settings.start_time || settings.start_datetime;
  const endTime = settings.end_time || settings.end_datetime;

  const start = startTime ? new Date(startTime).getTime() : NaN;
  const end = endTime ? new Date(endTime).getTime() : NaN;

  // 1. Check if ended by schedule
  if (!isNaN(end) && now >= end) {
    return 'ended';
  }

  // 2. Check if started by schedule
  const hasStartedBySchedule = !isNaN(start) && now >= start;

  // 3. Ongoing if admin manually forced 'ongoing' OR if scheduled start time has arrived
  if (settings.election_status === 'ongoing' || hasStartedBySchedule) {
    return 'ongoing';
  }

  return 'draft';
}

// Helper function to check if voting is currently active/ongoing
export function isVotingOngoing(settings: Settings): boolean {
  return getEffectiveStatus(settings) === 'ongoing';
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; message?: string; [key: string]: any }> {
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('evoting_token') : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${API_BASE}${cleanEndpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      return json;
    }

    const text = await res.text();
    // Non-JSON response (e.g. HTML 404/500)
    console.warn(`Non-JSON response from ${endpoint} (Status ${res.status}):`, text.slice(0, 100));
    return {
      success: res.ok,
      message: res.ok ? 'Sukses' : `Server mengembalikan status ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    return {
      success: false,
      message: err?.message || 'Gagal menghubungi server. Periksa koneksi atau konfigurasi endpoint.',
    };
  }
}

export const api = {
  // Auth
  login: (payload: any) =>
    fetchApi<{ token: string; role: 'admin' | 'student'; user?: User; student?: Student }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  changeAdminPassword: (payload: any) =>
    fetchApi('/auth/change-admin-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Stats
  getStats: () => fetchApi<DashboardStats>('/stats'),

  // Settings
  getSettings: () => fetchApi<Settings>('/settings'),
  updateSettings: (settings: Partial<Settings>) =>
    fetchApi<Settings>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  toggleElectionStatus: (status: ElectionStatus) =>
    fetchApi('/settings/toggle-status', { method: 'POST', body: JSON.stringify({ status }) }),

  // Candidates
  getCandidates: (includeVotes = false) =>
    fetchApi<Candidate[]>(`/candidates?include_votes=${includeVotes}`),
  createCandidate: (candidate: Partial<Candidate>) =>
    fetchApi<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(candidate) }),
  updateCandidate: (id: string, candidate: Partial<Candidate>) =>
    fetchApi<Candidate>(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(candidate) }),
  deleteCandidate: (id: string) =>
    fetchApi(`/candidates/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (params?: { search?: string; class_name?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.class_name) query.append('class_name', params.class_name);
    if (params?.status) query.append('status', params.status);
    return fetchApi<Student[]>(`/students?${query.toString()}`);
  },
  createStudent: (student: Partial<Student>) =>
    fetchApi<Student>('/students', { method: 'POST', body: JSON.stringify(student) }),
  updateStudent: (id: string, student: Partial<Student>) =>
    fetchApi<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(student) }),
  deleteStudent: (id: string) =>
    fetchApi(`/students/${id}`, { method: 'DELETE' }),
  importStudents: (students: Partial<Student>[]) =>
    fetchApi<{ addedCount: number; updatedCount: number; total: number }>('/students/import', {
      method: 'POST',
      body: JSON.stringify({ students }),
    }),
  resetStudentVote: (id: string) =>
    fetchApi(`/students/reset-vote/${id}`, { method: 'POST' }),
  resetAllVotes: () =>
    fetchApi('/students/reset-all-votes', { method: 'POST' }),

  // Voting
  castVote: (student_id: string, candidate_id: string) =>
    fetchApi<{ timestamp: string }>('/vote', {
      method: 'POST',
      body: JSON.stringify({ student_id, candidate_id }),
    }),

  // Results
  getResults: (role: 'admin' | 'student' = 'student') =>
    fetchApi<ResultsData>(`/results?role=${role}`),

  // Audit Logs
  getAuditLogs: () => fetchApi<AuditLog[]>('/audit-logs'),
};
