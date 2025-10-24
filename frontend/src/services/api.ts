import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Auth APIs
export const authAPI = {
  getCurrentUser: () => api.get('/api/auth/user'),
  logout: () => api.get('/hr/logout'), // Use the HRController logout endpoint
};

// HR APIs
export const hrAPI = {
  createMeeting: () => api.post('/hr/create-meeting'),
  getMyMeetings: () => api.get('/hr/meetings'),
  getCandidates: () => api.get('/hr/dashboard'),
  assignCandidate: (meetingId, candidateEmail) =>
    api.post(`/hr/assign-candidate?meetingId=${meetingId}&candidateEmail=${candidateEmail}`),
  uploadResume: (formData) => api.post('/hr/upload-resume', formData),
  addCandidate: (candidateData) => api.post('/hr/candidates', candidateData),
  deleteCandidate: (candidateName) =>
    api.delete(`/hr/candidates/${encodeURIComponent(candidateName)}`),
  updateResume: (formData) => api.put('/hr/update-resume', formData),
  getInterviewSummary: (candidateEmail) =>
    api.get(`/hr/interview-summary/${candidateEmail}`),
  getCandidateByEmail: (candidateEmail) =>
    api.get(`/hr/candidates/${candidateEmail}`),
  selectCandidate: (candidateEmail) =>
    api.post(`/hr/candidate/${candidateEmail}/round/select`),
  rejectCandidate: (candidateEmail) =>
    api.post(`/hr/candidate/${candidateEmail}/round/reject`),

  // ✅ Keep only one version of scheduleSecondRound
  scheduleSecondRound: async (scheduleData) => {
    const response = await api.post('/hr/schedule-second-round', scheduleData);
    return response.data;
  },
};

// Candidate APIs
export const candidateAPI = {
  getInterviewInfo: () => api.get('/candidate/interview-info'),
  joinInterview: () => api.post('/candidate/join-interview'),
};

// Interview APIs
export const interviewAPI = {
  startWithSession: (sessionId) =>
    api.get(`/interview/start-with-session?sessionId=${sessionId}`),
  submitAnswers: (sessionId, answers) =>
    api.post(`/interview/submit-answers?sessionId=${sessionId}`, answers),
};

export default api;
