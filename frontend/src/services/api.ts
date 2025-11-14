import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000, // 15 second timeout
});

// Add response interceptor with retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      window.location.href = 'http://localhost:5173/auth/login';
      return Promise.reject(error);
    }
    
    // Retry logic for network errors and 5xx errors
    if (!config.retry) config.retry = 0;
    
    if (config.retry < 2 && 
        (error.code === 'NETWORK_ERROR' || 
         error.code === 'ECONNABORTED' ||
         (error.response?.status >= 500))) {
      
      config.retry++;
      console.log(`Retrying request (attempt ${config.retry})`);
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * Math.pow(2, config.retry - 1))
      );
      
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  getCurrentUser: () => api.get('/api/auth/user'),
  logout: () => api.get('/hr/logout'),
};

// HR APIs
export const hrAPI = {
  getMyMeetings: () => api.get('/hr/meetings'),
  getCandidates: () => api.get('/hr/dashboard'),
  getDashboard: () => api.get('/hr/dashboard'),
  uploadResume: (formData: FormData) => api.post('/hr/upload-resume', formData),
  addCandidate: (candidateData: any) => api.post('/hr/candidates', candidateData),
  deleteCandidate: (candidateName: string) =>
    api.delete(`/hr/candidates/${encodeURIComponent(candidateName)}`),
  scheduleInterview: (candidateEmail: string) => api.post('/hr/schedule-interview', null, {
    params: { candidateEmail }
  }),
  updateResume: (formData: FormData) => api.put('/hr/update-resume', formData),
  getInterviewSummary: (candidateEmail: string) =>
    api.get(`/hr/interview-summary/${candidateEmail}`),
  getCandidateByEmail: (candidateEmail: string) =>
    api.get(`/hr/candidates/${candidateEmail}`),
  selectCandidate: (candidateEmail: string) =>
    api.post(`/hr/candidate/${candidateEmail}/round/select`),
  rejectCandidate: (candidateEmail: string) =>
    api.post(`/hr/candidate/${candidateEmail}/round/reject`),
  scheduleSecondRound: async (scheduleData: any) => {
    const response = await api.post('/hr/schedule-second-round', scheduleData);
    return response.data;
  },
}

// Candidate APIs
export const candidateAPI = {
  getPortalInfo: (sessionId: string) => api.get(`/candidate/portal-info/${sessionId}`),
};

// Interview APIs
export const interviewAPI = {
  startInterviewWithSession: (sessionId: string) => {
    return api.get(`/interview/start-with-session/${sessionId}`);
  },
  submitAnswers: (answers: { [key: string]: string }, sessionId: string) => {
    return api.post(`/interview/submit-answers`, {sessionId, answers});
  },
  logEvent: (eventData: any) => {
    return api.post(`/api/monitoring/log-event`, eventData);
  }
};

export default api;