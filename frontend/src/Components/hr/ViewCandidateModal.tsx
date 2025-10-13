import React from 'react';

interface ViewCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
}

const ViewCandidateModal: React.FC<ViewCandidateModalProps> = ({ isOpen, onClose, candidate }) => {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 " >
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-black-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Candidate Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Name:</label>
            <p className="text-gray-700">{candidate.candidateName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Email:</label>
            <p className="text-gray-700">{candidate.candidateEmail || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone:</label>
            <p className="text-gray-700">{candidate.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Position:</label>
            <p className="text-gray-700">{candidate.positionApplied || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Experience:</label>
            <p className="text-gray-700">{candidate.experienceYears || 0} years</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Location:</label>
            <p className="text-gray-700">{candidate.location || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Skills:</label>
            <p className="text-gray-700">{candidate.skills || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Description:</label>
            <p className="text-gray-700">{candidate.description || 'N/A'}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ViewCandidateModal;
