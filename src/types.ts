export type UserRole = 'admin' | 'superadmin' | 'student';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'superadmin' | 'student';
  created_at?: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  class_name: string;
  major: string;
  username?: string;
  pin: string;
  has_voted: boolean;
  voted_at?: string | null;
  created_at?: string;
}

export interface Candidate {
  id: string;
  candidate_number: number;
  chairman_name: string;
  chairman_photo: string;
  vice_chairman_name: string;
  vice_chairman_photo: string;
  vision: string;
  missions: string[];
  work_programs: string[];
  video_url?: string;
  brochure_url?: string;
  is_active: boolean;
  vote_count?: number;
}

export interface Vote {
  id: string;
  candidate_id: string;
  created_at: string;
}

export type ElectionStatus = 'draft' | 'ongoing' | 'ended';
export type ResultVisibility = 'hidden' | 'after_ended' | 'realtime';

export interface Settings {
  school_name: string;
  school_logo?: string;
  school_address?: string;
  academic_year: string;
  event_title: string;
  primary_color?: string;
  footer_text?: string;
  election_status: ElectionStatus;
  start_time?: string | null;
  end_time?: string | null;
  start_datetime?: string;
  end_datetime?: string;
  result_visibility: ResultVisibility;
  enable_sound_effects?: boolean;
  principal_name?: string;
  principal_nip?: string;
  committee_chair?: string;
  chair_nis?: string;
  osis_advisor?: string;
  advisor_nip?: string;
  committee_secretary?: string;
  secretary_nis?: string;
  witness_1_name?: string;
  witness_2_name?: string;
}

export interface AuditLog {
  id: string;
  user_name?: string;
  action: string;
  description: string;
  activity?: string;
  ip_address: string;
  timestamp: string;
}

export interface DashboardStats {
  total_students: number;
  total_voted: number;
  total_unvoted: number;
  participation_percentage: number;
  total_candidates: number;
  election_status: ElectionStatus;
  effective_status?: ElectionStatus;
  time_remaining_seconds?: number;
  can_vote_now?: boolean;
  hourly_votes?: { hour: string; count: number }[];
  class_participation: {
    class_name: string;
    total: number;
    voted: number;
    percentage: number;
  }[];
}

export interface CandidateResult {
  candidate: Candidate;
  votes: number;
  percentage: number;
  rank: number;
}

export interface ResultsData {
  visibility: ResultVisibility;
  is_visible_to_student: boolean;
  total_voters: number;
  total_voted: number;
  total_unvoted: number;
  participation_percentage: number;
  results: CandidateResult[];
  winner?: CandidateResult | null;
}

export interface AuthSession {
  token: string;
  type: 'admin' | 'student';
  user?: User;
  student?: Student;
}

export interface AlertState {
  isOpen: boolean;
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}
