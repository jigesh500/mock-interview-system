import React, { useState } from 'react';
import { hrAPI } from '../../services/api';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  isOpen,
  onClose,
  onCandidateAdded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await hrAPI.uploadResume(formData);
      
      if (response.data.success) {
        setExtractedData(response.data.data);
      } else {
        alert('Error extracting data: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Error uploading file: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCandidate = async () => {
    if (!extractedData) return;

    try {
      const candidateData = {
        candidateName: extractedData.name || '',
        candidateEmail: extractedData.email || '',
        phoneNumber: extractedData.phone || '',
        positionApplied: extractedData.position || '',
        experienceYears: extractedData.experience || 0,
        skills: extractedData.skills || '',
        location: extractedData.location || '',
        description: extractedData.description || '',
      };

      const response = await hrAPI.addCandidate(candidateData);

          // ✅ Check response for success/error
          if (response.data.success) {
            alert('Candidate added successfully!');
            onCandidateAdded();
            handleClose();
          } else {
            alert('Error: ' + response.data.error);
          }
        } catch (error: any) {
          console.error('Save error:', error);
          // ✅ Handle duplicate candidate error
          alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleClose = () => {
    setFile(null);
    setExtractedData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Add New Candidate</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Resume (PDF, DOCX, TXT)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Extract Data from Resume'}
            </button>
            <button
              onClick={handleClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>

          {extractedData && (
            <div className="mt-6 p-4 bg-gray-50 rounded">
              <h3 className="text-lg font-semibold mb-3">Extracted Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Name:</label>
                  <p className="text-gray-700">{extractedData.name || 'Not found'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Email:</label>
                  <p className="text-gray-700">{extractedData.email || 'Not found'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Phone:</label>
                  <p className="text-gray-700">{extractedData.phone || 'Not found'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Position:</label>
                  <p className="text-gray-700">{extractedData.position || 'Not found'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Experience:</label>
                  <p className="text-gray-700">{extractedData.experience || 0} years</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Location:</label>
                  <p className="text-gray-700">{extractedData.location || 'Not found'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium">Skills:</label>
                  <p className="text-gray-700">{extractedData.skills || 'Not found'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium">Description:</label>
                  <p className="text-gray-700">{extractedData.description || 'Not found'}</p>
                </div>
              </div>

              <button
                onClick={handleSaveCandidate}
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Save Candidate to Database
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCandidateModal;