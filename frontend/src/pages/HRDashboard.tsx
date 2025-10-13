import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch } from '../redux/hooks';
import AddCandidateModal from '../Components/hr/AddCandidateModal';
import CreateMeetingModal from '../Components/hr/CreateMeetingModal';
import toast, { Toaster } from 'react-hot-toast';
import ViewCandidateModal from '../Components/hr/ViewCandidateModal';

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [meetingResult, setMeetingResult] = useState<any>(null);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
   const [updateCandidateEmail, setUpdateCandidateEmail] = useState<string>('');
   const [showAssignCandidateModal, setShowAssignCandidateModal] = useState(false);
   const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
   const [showViewCandidateModal, setShowViewCandidateModal] = useState(false);
   const [selectedCandidate, setSelectedCandidate] = useState<any>(null);


const handleUpdateResume = (candidateEmail: string) => {
  setUpdateCandidateEmail(candidateEmail);
  const fileInput=document.createElement('input');
  fileInput.type='file';
  fileInput.accept = '.pdf,.docx,.txt';
    fileInput.onchange = (e) => uploadUpdatedResume(e, candidateEmail);
    fileInput.click();
};


const handleViewCandidate = (candidate: any) => {
  setSelectedCandidate(candidate);
  setShowViewCandidateModal(true);
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

const uploadUpdatedResume = async (e: any, candidateEmail: string) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('resume', file);
  formData.append('candidateEmail', candidateEmail);

  try {
      console.log('Uploading resume for:', candidateEmail);
    const response = await hrAPI.updateResume(formData);
    if (response.data.success) {
      toast.success('Resume updated successfully!');
      loadCandidates(); // Reload to show updated data
    }
  } catch (error: any) {
      console.error('Update error:', error);
    alert(`Error: ${error.response?.data?.error || 'Failed to update resume'}`);
  }
};

const deleteCandidate = async (candidateName: string) => {
  if (!window.confirm(`Are you sure you want to delete ${candidateName}?`)) {
    return;
  }

  try {
    await hrAPI.deleteCandidate(candidateName);
    toast.success('Candidate deleted successfully!');
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
    <Toaster position="top-right" />
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
              onClick={() => setShowCreateMeetingModal(true)}
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Candidates List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Experience</th>
                <th className="px-4 py-2 text-left">Skills</th>
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
                  <td className="px-4 py-2">
                          <div className="flex gap-2">
                          <button
                                onClick={() => handleViewCandidate(candidate)}
                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleUpdateResume(candidate.candidateEmail)}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                              >
                                Update
                              </button>
                              <button
                                onClick={() => deleteCandidate(candidate.candidateName)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </div>
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
      
      <CreateMeetingModal
        isOpen={showCreateMeetingModal}
        onClose={() => setShowCreateMeetingModal(false)}
        candidates={candidates}
      />

      <ViewCandidateModal
        isOpen={showViewCandidateModal}
        onClose={() => setShowViewCandidateModal(false)}
        candidate={selectedCandidate}
      />
    </div>
  );
};

export default HRDashboard;
