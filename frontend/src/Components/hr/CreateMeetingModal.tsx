import React, { useState } from 'react';
import { hrAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: any[];
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({ isOpen, onClose, candidates }) => {
  const [meetingResult, setMeetingResult] = useState<any>(null);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const createMeeting = async () => {
    setLoading(true);
    try {
      const response = await hrAPI.createMeeting();
      setMeetingResult(response.data);
      toast.success('Meeting created successfully!');
    } catch (error) {
      toast.error('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const assignCandidate = async () => {
    if (!meetingResult?.meetingId || !candidateEmail) {
      toast.error('Please create a meeting first and enter candidate email');
      return;
    }

    try {
      await hrAPI.assignCandidate(meetingResult.meetingId, candidateEmail);
      toast.success('Candidate assigned successfully!');
      setCandidateEmail('');
    } catch (error: any) {
      toast.error(`Error: ${error.response?.data?.message || 'Failed to assign candidate'}`);
    }
  };

  const handleClose = () => {
    setMeetingResult(null);
    setCandidateEmail('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-300 max-w-md h-auto">
        <h2 className="text-xl font-semibold mb-4">Create Teams Meeting</h2>
        
        <div className="space-y-4">
          <button
            onClick={createMeeting}
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Meeting'}
          </button>

          {meetingResult && (
            <div className="p-4 bg-gray-100 rounded">
              <p className="text-sm"><strong>Meeting ID:</strong> {meetingResult.meetingId}</p>
              <p className="text-sm break-all"><strong>Teams URL:</strong> {meetingResult.meetingUrl}</p>
            </div>
          )}

          {meetingResult && (
              <div className="space-y-2">
                <h3 className="font-medium">Assign Candidate</h3>
                <select
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.candidateEmail}>
                      {candidate.candidateName} - {candidate.candidateEmail}
                    </option>
                  ))}
                </select>
                <button
                  onClick={assignCandidate}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Assign Candidate
                </button>
              </div>
          )}

          <button
            onClick={handleClose}
            className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateMeetingModal;