// ── Enums ──────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'faculty' | 'student';
export type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'coding';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

// ── Core Models ────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  department?: string;
  branch?: string;
  institution_id?: string;
  batch?: string;
  class?: string;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  course_id?: string;
  faculty_id?: string;
  duration_mins: number;
  total_marks: number;
  pass_percentage: number;
  is_published: boolean;
  shuffle_questions: boolean;
  show_results: boolean;
  start_time?: string;
  end_time?: string;
  test_code?: string;
  status?: string | AssessmentStatus;
  num_sections?: number;
  tab_switch_limit?: number;
  tab_switches_allowed?: number;
  proctoring_enabled?: boolean;
  webcam_enabled?: boolean;
  screen_share_enabled?: boolean;
  audio_enabled?: boolean;
  is_hackathon?: boolean;
  is_subscriber_only?: boolean;
  is_in_library?: boolean;
  proctoring_service?: string;
  is_proctoring?: boolean;
  instructions?: string;
  institution_visibility?: (number | string)[];
  batch_visibility?: string[];
  question_count?: number;
  created_at: string;
}

export interface AssessmentSection {
  id: string;
  assessment_id: string;
  title: string;
  section_type: string;
  instructions?: string;
  default_marks: number;
  penalty_marks: number;
  display_questions?: number;
  sort_order: number;
  duration_mins?: number;
  created_at: string;
}

export interface Question {
  id: string;
  bank_id?: string;
  title?: string;
  question_type: QuestionType;
  content: string;
  options?: QuestionOption[];
  explanation?: string;
  difficulty: Difficulty;
  tags?: string[];
  points: number;
  penalty_marks?: number;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  constraints?: string;
  test_cases?: unknown[];
  created_at: string;
}

export interface QuestionOption {
  text: string;
  is_correct?: boolean;
}

export interface QuestionBank {
  id: string;
  title: string;
  subject?: string;
  faculty_id?: string;
  created_at: string;
}

export interface Attempt {
  id: string;
  assessment_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string;
  score?: number;
  total_marks: number;
  percentage?: number;
  is_passed?: boolean;
  answers?: Record<string, unknown>;
  status: AttemptStatus;
}

export interface AssessmentTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  duration_mins: number;
  total_marks: number;
  pass_percentage: number;
  shuffle_questions: boolean;
  show_results: boolean;
  question_config?: Record<string, unknown>;
  faculty_id?: string;
  is_public: boolean;
  created_at: string;
}

export interface LeaderboardRow {
  rank: number;
  student_id: string;
  student_name: string;
  score: number;
  total_marks: number;
  percentage: number;
  time_taken_secs?: number;
  completed_at?: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

// ── Dashboard / Analytics ──────────────────────────────────

export interface FacultyDashboardStats {
  total_students: number;
  current_rating: number;
  total_assessments: number;
  total_attempts: number;
  avg_score: number;
  pass_rate: number;
  videos_watched?: number;
  watch_time_mins?: number;
  most_watched_courses?: string[];
}

// Legacy alias
export type DashboardStats = FacultyDashboardStats;

export type AssessmentStatus = 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface AssessmentAnalytics {
  assessment_id: string;
  total_attempts: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  score_distribution: ScoreBucket[];
}

export interface ScoreBucket {
  range: string;
  count: number;
}

// ── API Response Wrappers ──────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}

export interface AttemptStartResponse {
  attempt: Attempt;
  questions: Question[];
  duration_mins: number;
  total_marks: number;
  resumed: boolean;
}

export interface AttemptSubmitResponse {
  attempt: Attempt;
  score: number;
  total_marks: number;
  percentage: number;
  is_passed: boolean;
  time_taken_secs: number;
  show_results: boolean;
  graded_answers?: GradedAnswer[];
}

export interface GradedAnswer {
  question_id: string;
  student_answer: unknown;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
}

export interface TimerResponse {
  remaining_seconds: number;
  elapsed_seconds: number;
  total_seconds: number;
  expired: boolean;
  status: string;
}

// ── Request Types ──────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface CreateAssessmentRequest {
  title: string;
  description?: string;
  course_id: string;
  duration_mins: number;
  total_marks: number;
  pass_percentage: number;
  shuffle_questions: boolean;
  show_results: boolean;
  start_time?: string;
  end_time?: string;
}

export interface CreateQuestionRequest {
  question_type: QuestionType;
  content: string;
  options?: QuestionOption[];
  explanation?: string;
  difficulty: Difficulty;
  tags?: string[];
  points: number;
}

export interface CandidateAttemptDetail {
  attempt_id: string;
  student_id: string;
  student_name: string;
  email: string;
  student_email?: string;
  batch?: number;
  branch?: string;
  student_branch?: string;
  score?: number;
  total_marks: number;
  percentage?: number;
  percentile?: number;
  is_passed?: boolean;
  status: string;
  started_at: string;
  submitted_at?: string;
  completed_at?: string;
  answers?: Record<string, unknown>;
}

export interface ProctoringReport {
  id: string;
  attempt_id: string;
  tab_switches: number;
  tab_switch_count?: number;
  webcam_violations?: number;
  screen_violations?: number;
  events?: Array<{ timestamp?: string; created_at?: string; event_type: string; message: string }>;
}

export interface LiveTestDetails {
  assessment: Assessment;
  candidates: CandidateAttemptDetail[];
  total_started: number;
  total_submitted: number;
  title?: string;
  test_name?: string;
  duration_mins?: number;
  total_appeared?: number;
  total_yet_to_start?: number;
  total_ongoing?: number;
  total_eligible?: number;
  total_completed?: number;
}

export interface StudentAssessmentSummary {
  id: string;
  title: string;
  test_code?: string;
  course_id?: string;
  course_title?: string;
  duration_mins: number;
  start_time?: string;
  end_time?: string;
  status: string;
  attempt_id?: string;
  score?: number;
  total_marks?: number;
  is_passed?: boolean;
}

export interface StudentAssessmentListResponse {
  data: StudentAssessmentSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface PdfReportResponse {
  report_id: string;
  assessment_id: string;
  status: string;
  file_url?: string;
  created_at: string;
  completed_at?: string;
}

export interface UpdateProctoringRequest {
  proctoring_enabled: boolean;
  webcam_enabled?: boolean;
  screen_share_enabled?: boolean;
  audio_enabled?: boolean;
  tab_switch_limit?: number;
  proctoring_service?: string;
}

export interface LinkedAssessmentItem {
  question_id: string;
  assessment_id: string;
  assessment_title: string;
  test_code?: string;
}

export interface LinkedAssessmentsResponse {
  linked_assessments: LinkedAssessmentItem[];
}

export interface AssessmentSectionResponse {
  id: string;
  assessment_id: string;
  title: string;
  description?: string;
  instructions?: string;
  sectionInstructions?: string;
  section_type?: string;
  sectionType?: string;
  duration_mins?: number;
  sectionDuration?: number;
  default_marks?: number;
  defaultMarks?: number;
  penalty_marks?: number;
  penaltyMarks?: number;
  display_questions?: number;
  displayQuestions?: number;
}


