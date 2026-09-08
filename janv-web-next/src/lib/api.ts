import type {
  Assessment,
  Attempt,
  AttemptStartResponse,
  AttemptSubmitResponse,
  AssessmentTemplate,
  LeaderboardRow,
  Faq,
  FacultyDashboardStats,
  AssessmentAnalytics,
  TimerResponse,
  User,
  Question,
  QuestionBank,
  PaginatedResponse,
  CandidateAttemptDetail,
  LiveTestDetails,
  StudentAssessmentListResponse,
  PdfReportResponse,
  ProctoringReport,
  UpdateProctoringRequest,
  LinkedAssessmentsResponse,
  AssessmentSectionResponse,
} from './types';

export class ApiError extends Error {
  status: number;
  data?: unknown;
  url?: string;

  constructor(message: string, status: number, data?: unknown, url?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
    : null;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText || 'Unknown Error' }));
    const errorMsg = body.message || body.error || `Request to ${path} failed with status ${res.status}`;
    console.error(`[API Error] ${options.method || 'GET'} ${url} [${res.status}]:`, body);
    throw new ApiError(errorMsg, res.status, body, url);
  }

  return res.json();
}

// ── Auth ────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; full_name: string; role?: string }) =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<User>('/auth/me'),

  refresh: (refresh_token: string) =>
    request<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),
};

// ── Assessments ─────────────────────────────────────────────

export const assessments = {
  list: (params?: { page?: number; per_page?: number; course_id?: string; is_published?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.course_id) query.set('course_id', params.course_id);
    if (params?.is_published !== undefined) query.set('is_published', String(params.is_published));
    return request<PaginatedResponse<Assessment>>(`/assessments?${query}`);
  },

  get: (id: string) =>
    request<{ assessment: Assessment; questions: unknown[]; question_count: number }>(`/assessments/${id}`),

  create: (data: Partial<Assessment>) =>
    request<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Assessment>) =>
    request<Assessment>(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ status: string }>(`/assessments/${id}`, { method: 'DELETE' }),

  publish: (id: string) =>
    request<Assessment>(`/assessments/${id}/publish`, { method: 'POST' }),

  duplicate: (id: string, new_title?: string) =>
    request<Assessment>(`/assessments/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ new_title }),
    }),

  // Questions
  addQuestions: (assessmentId: string, questionIds: string[]) =>
    request(`/assessments/${assessmentId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ question_ids: questionIds }),
    }),

  // Attempts
  start: (id: string) =>
    request<AttemptStartResponse>(`/assessments/${id}/start`, { method: 'POST' }),

  submitAttempt: (attemptId: string, answers: Record<string, unknown>) =>
    request<AttemptSubmitResponse>(`/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getAttempt: (attemptId: string) =>
    request<{ attempt: Attempt; assessment_title: string }>(`/assessments/attempts/${attemptId}`),

  myAttempts: () =>
    request<Attempt[]>('/assessments/my-attempts'),

  // Timer
  checkTimer: (attemptId: string) =>
    request<TimerResponse>(`/assessments/attempts/${attemptId}/timer`),

  // Analytics
  analytics: (id: string) =>
    request<AssessmentAnalytics>(`/assessments/${id}/analytics`),

  // Leaderboard
  leaderboard: (id: string, page?: number) => {
    const query = page ? `?page=${page}` : '';
    return request<{ leaderboard: LeaderboardRow[]; total: number }>(`/assessments/${id}/leaderboard${query}`);
  },

  globalLeaderboard: (page?: number) => {
    const query = page ? `?page=${page}` : '';
    return request<{ leaderboard: unknown[] }>(`/assessments/leaderboard/global${query}`);
  },

  // Passcode
  setPasscode: (id: string, passcode: string) =>
    request(`/assessments/${id}/passcode`, {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  verifyPasscode: (passcode: string) =>
    request<{ valid: boolean; assessment_id: string; title?: string; message?: string }>('/assessments/passcode/verify', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  getCurrentPasscode: () =>
    request<{
      passcode: string;
      institution_id: number;
      institution_name: string;
      expires_at: string;
      window_start: string;
      remaining_seconds: number;
      interval_hours: number;
    }>('/assessments/passcode/current'),

  regeneratePasscode: () =>
    request<{
      passcode: string;
      institution_id: number;
      institution_name: string;
      expires_at: string;
      window_start: string;
      remaining_seconds: number;
      interval_hours: number;
    }>('/assessments/passcode/regenerate', {
      method: 'POST',
    }),

  // Proctoring
  updateProctoring: (id: string, data: UpdateProctoringRequest) =>
    request(`/assessments/${id}/proctoring`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getProctoringReport: (attemptId: string) =>
    request<ProctoringReport>(`/assessments/attempts/${attemptId}/proctoring`),

  // Test Details & Reports
  getTestDetails: (
    id: string,
    params?: { page?: number; per_page?: number; search?: string; branch?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.search) query.set('search', params.search);
    if (params?.branch) query.set('branch', params.branch);
    return request<{
      assessment: Assessment;
      candidates: CandidateAttemptDetail[];
      total: number;
    }>(`/assessments/${id}/details?${query}`);
  },

  getPdfReport: (id: string) =>
    request<PdfReportResponse>(`/assessments/${id}/report/pdf`),

  createPdfReport: (id: string) =>
    request<PdfReportResponse>(`/assessments/${id}/report/pdf`, { method: 'POST' }),

  getLiveTest: (testCode: string) =>
    request<LiveTestDetails>(`/assessments/live/${testCode}`),

  listHackathons: () =>
    request<{ data: Assessment[] }>('/assessments/hackathons'),

  getForStudent: (params?: { page?: number; per_page?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    return request<StudentAssessmentListResponse>(`/assessments/student?${query}`);
  },

  getSection: (sectionId: string) =>
    request<AssessmentSectionResponse>(`/assessments/sections/${sectionId}`),

  updateSection: (sectionId: string, data: Partial<AssessmentSectionResponse>) =>
    request<AssessmentSectionResponse>(`/assessments/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getProctoring: (assessmentId: string) =>
    request<UpdateProctoringRequest>(`/assessments/${assessmentId}/proctoring`),

  listLibrary: () =>
    request<{ data: Assessment[] }>('/assessments/library'),

  getLinkedAssessments: (questionIds: string[]) =>
    request<LinkedAssessmentsResponse>('/assessments/linked-assessments', {
      method: 'POST',
      body: JSON.stringify({ question_ids: questionIds }),
    }),

  getLiveUsersCount: () =>
    request<{ count: number; live_users_count: number }>('/assessments/live-users-count'),

  listCourseAssessments: (courseId?: string) =>
    request<{ data: Assessment[] }>(`/assessments${courseId ? `?course_id=${courseId}` : ''}`),
};

// ── Templates ───────────────────────────────────────────────

export const templates = {
  list: () => request<AssessmentTemplate[]>('/assessments/templates'),

  create: (data: Partial<AssessmentTemplate>) =>
    request<AssessmentTemplate>('/assessments/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createFrom: (data: { template_id: string; course_id: string; title?: string }) =>
    request('/assessments/templates/create-from', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveAs: (assessmentId: string) =>
    request<AssessmentTemplate>(`/assessments/${assessmentId}/save-as-template`, { method: 'POST' }),
};

// ── Question Banks & Questions ─────────────────────────────

export const questionBanks = {
  list: () => request<QuestionBank[]>('/assessments/banks'),

  listQuestions: (bankId: string) =>
    request<Question[]>(`/assessments/banks/${bankId}/questions`),

  create: (data: { title: string; subject?: string }) =>
    request<QuestionBank>('/assessments/banks', { method: 'POST', body: JSON.stringify(data) }),

  addQuestion: (bankId: string, data: unknown) =>
    request(`/assessments/banks/${bankId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const questions = {
  get: (id: string) => request<Question>(`/assessments/questions/${id}`),

  update: (id: string, data: Partial<Question>) =>
    request<Question>(`/assessments/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ status: string }>(`/assessments/questions/${id}`, {
      method: 'DELETE',
    }),
};


// ── Analytics / Dashboard ───────────────────────────────────

export const analytics = {
  dashboard: () => request<FacultyDashboardStats>('/analytics/dashboard'),

  studentProgress: () => request('/analytics/student/progress'),

  studentStreak: () => request('/analytics/student/streak'),

  faqs: () => request<Faq[]>('/analytics/faqs'),

  batches: () => request<{ batches: number[] }>('/analytics/filters/batches'),

  branches: () => request<{ branches: string[] }>('/analytics/filters/branches'),
};

// ── Admin ───────────────────────────────────────────────────

export const admin = {
  searchStudents: (queryOrParams: string | { search?: string; batch?: string; branch?: string; page?: number; per_page?: number; role?: string }) => {
    let params: URLSearchParams;
    if (typeof queryOrParams === 'string') {
      params = new URLSearchParams({ search: queryOrParams });
    } else {
      params = new URLSearchParams();
      if (queryOrParams.search) params.set('search', queryOrParams.search);
      if (queryOrParams.batch) params.set('batch', queryOrParams.batch);
      if (queryOrParams.branch) params.set('branch', queryOrParams.branch);
      if (queryOrParams.role) params.set('role', queryOrParams.role);
      if (queryOrParams.page) params.set('page', String(queryOrParams.page));
      if (queryOrParams.per_page) params.set('per_page', String(queryOrParams.per_page));
    }
    return request<{ data: User[]; total: number }>(`/admin/users?${params}`);
  },

  getDashboard: () =>
    request<FacultyDashboardStats>('/admin/dashboard'),
};

// ── Reports ─────────────────────────────────────────────────

export const reports = {
  overall: (params?: {
    page?: number;
    per_page?: number;
    batch?: string;
    branch?: string;
    course?: string;
    assessment_id?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.batch) query.set('batch', params.batch);
    if (params?.branch) query.set('branch', params.branch);
    if (params?.course) query.set('course', params.course);
    if (params?.assessment_id) query.set('assessment_id', params.assessment_id);
    return request<{ data: unknown[]; total: number; stats: FacultyDashboardStats }>(
      `/analytics/reports/overall?${query}`
    );
  },

  download: (params: {
    batch?: string;
    branch?: string;
    course?: string;
    assessment_id?: string;
    format?: 'csv' | 'xlsx';
  }) => {
    const query = new URLSearchParams();
    if (params.batch) query.set('batch', params.batch);
    if (params.branch) query.set('branch', params.branch);
    if (params.course) query.set('course', params.course);
    if (params.assessment_id) query.set('assessment_id', params.assessment_id);
    if (params.format) query.set('format', params.format);
    // For file downloads, we return a fetch call directly
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
      : null;
    return fetch(`${API_BASE}/analytics/reports/download?${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  },

  studentReport: (studentId: string) =>
    request<{ data: unknown }>(`/analytics/reports/student/${studentId}`),
};

// ── Certificates ────────────────────────────────────────────

export const certificates = {
  list: (params?: { page?: number; per_page?: number; assessment_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.assessment_id) query.set('assessment_id', params.assessment_id);
    return request<{ data: unknown[]; total: number }>(`/analytics/certificates?${query}`);
  },

  downloadReport: (params: {
    assessment_id?: string;
    format?: 'csv' | 'xlsx';
  }) => {
    const query = new URLSearchParams();
    if (params.assessment_id) query.set('assessment_id', params.assessment_id);
    if (params.format) query.set('format', params.format);
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
      : null;
    return fetch(`${API_BASE}/analytics/certificates/download?${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  },
};
