import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Auth APIs
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
   // CORRECT - This sends query parameters
   assignCandidate: (meetingId: string, candidateEmail: string) =>
     api.post(`/hr/assign-candidate?meetingId=${meetingId}&candidateEmail=${candidateEmail}`),

};

// Candidate APIs
export const candidateAPI = {
  getInterviewInfo: () => api.get('/candidate/interview-info'),
  joinInterview: () => api.post('/candidate/join-interview'),
};

// Interview APIs
export const interviewAPI = {
  startWithSession: (sessionId: string) => api.get(`/interview/start-with-session?sessionId=${sessionId}`),
  submitAnswers: (sessionId: string, answers: any) =>
    api.post(`/interview/submit-answers?sessionId=${sessionId}`, answers),
};

export default api;
