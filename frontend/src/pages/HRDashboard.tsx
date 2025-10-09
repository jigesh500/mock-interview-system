import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch } from '../redux/hooks';
import AddCandidateModal from '../Components/hr/AddCandidateModal';

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [meetingResult, setMeetingResult] = useState<any>(null);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);

  const createMeeting = async () => {
    try {
      const response = await hrAPI.createMeeting();
      setMeetingResult(response.data);
      setMeetingId(response.data.meetingId);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const assignCandidate = async () => {
    if (!meetingId || !candidateEmail) {
      alert('Please fill in both Meeting ID and Candidate Email');
      return;
    }

    try {
      const response = await hrAPI.assignCandidate(meetingId, candidateEmail);
      alert('Candidate assigned successfully!');
      console.log('Assignment response:', response.data);
    } catch (error: any) {
      console.error('Error assigning candidate:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to assign candidate'}`);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      console.log('Loading candidates...');
      const response = await hrAPI.getCandidates();
      console.log('Candidates response:', response.data);
      setCandidates(response.data);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

const deleteCandidate = async (candidateName: string) => {
  if (!window.confirm(`Are you sure you want to delete ${candidateName}?`)) {
    return;
  }

  try {
    await hrAPI.deleteCandidate(candidateName);
    alert('Candidate deleted successfully!');
    loadCandidates(); // Reload the list
  } catch (error: any) {
    console.error('Error deleting candidate:', error);
    alert(`Error: ${error.response?.data?.message || 'Failed to delete candidate'}`);
  }
};

const handleLogout = async () => {
  try {
    // Call backend logout
    await authAPI.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear Redux state
    dispatch(clearAuth());
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Navigate to login
    navigate('/', { replace: true });
  }
};



  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">HR Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex gap-4">
          <button
            onClick={createMeeting}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Teams Meeting
          </button>
          <button
            onClick={() => setShowAddCandidateModal(true)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Add New Candidate
          </button>
        </div>

        {meetingResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p><strong>Meeting ID:</strong> {meetingResult.meetingId}</p>
            <p><strong>Teams URL:</strong> {meetingResult.meetingUrl}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Assign Candidate</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Meeting ID"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Candidate Email"
            value={candidateEmail}
            onChange={(e) => setCandidateEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={assignCandidate}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Assign Candidate
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Candidates List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Position</th>
                <th className="px-4 py-2 text-left">Experience</th>
                <th className="px-4 py-2 text-left">Skills</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Actions</th>

              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{candidate.candidateName}</td>
                  <td className="px-4 py-2">{candidate.candidateEmail}</td>
                  <td className="px-4 py-2">{candidate.positionApplied}</td>
                  <td className="px-4 py-2">{candidate.experienceYears} years</td>
                  <td className="px-4 py-2 max-w-xs truncate">{candidate.skills}</td>
                  <td className="px-4 py-2">{candidate.phoneNumber}</td>
                  <td className="px-4 py-2">{candidate.location}</td>
                  <td className="px-4 py-2">
                          <button
                            onClick={() => deleteCandidate(candidate.candidateName)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidates.length === 0 && (
            <p className="text-gray-500 text-center py-4">No candidates found</p>
          )}
        </div>
      </div>

      <AddCandidateModal
        isOpen={showAddCandidateModal}
        onClose={() => setShowAddCandidateModal(false)}
        onCandidateAdded={loadCandidates}
      />
    </div>
  );
};

export default HRDashboard;
