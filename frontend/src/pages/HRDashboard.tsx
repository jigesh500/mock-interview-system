import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { hrAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch } from '../redux/hooks';
import AddCandidateModal from '../Components/hr/AddCandidateModal';
import CreateMeetingModal from '../Components/hr/CreateMeetingModal';
import toast, { Toaster } from 'react-hot-toast';
import ViewCandidateModal from '../Components/hr/ViewCandidateModal';
import ViewSummaryModal from '../Components/hr/ViewSummaryModal';
import { useAppSelector } from '../redux/hooks';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

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
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
   const { questions } = useAppSelector((state) => state.test);


  // Cell renderer components
  const StatusRenderer = (props: any) => {
    const status = props.value;
    const colorClass =
      status === 'Completed' ? 'bg-green-100 text-green-700 border border-green-200' :
      status === 'Scheduled' ? 'text-white border' :
      status === 'Pending' ? 'text-white border' :
      'text-white border';
    
    const bgStyle = 
      status === 'Scheduled' ? { backgroundColor: '#56C5D0', borderColor: '#56C5D0' } :
      status === 'Pending' ? { backgroundColor: '#F58220', borderColor: '#F58220' } :
      status === 'Completed' ? {} :
      { backgroundColor: '#ED1C24', borderColor: '#ED1C24' };
    
    return (
      <span 
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}
        style={bgStyle}
      >
        {status}
      </span>
    );
  };

  const SummaryRenderer = (props: any) => {
    if (props.data.summaryStatus) {
      return (
        <button 
          className="text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#F58220' }}
          onClick={() => handleViewSummary(props.data.candidateEmail)}
        >
          View Summary
        </button>
      );
    }
    return <span className="text-slate-400 text-xs italic">No Summary</span>;
  };

  const ActionsRenderer = (props: any) => {
    return (
      <div className="flex gap-1.5">
        <button 
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#56C5D0' }}
          onClick={() => handleViewCandidate(props.data.candidateEmail)}
          title="View Details"
        >
          View
        </button>
        <button 
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#F58220' }}
          onClick={() => handleUpdateResume(props.data.candidateEmail)}
          title="Update Resume"
        >
          Update
        </button>
        <button 
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#ED1C24' }}
          onClick={() => deleteCandidate(props.data.candidateName)}
          title="Delete Candidate"
        >
          Delete
        </button>
      </div>
    );
  };

  const columnDefs = useMemo(() => [
    { 
      field: 'candidateName', 
      headerName: 'Name', 
      width: 200,
      cellStyle: { 
        fontWeight: '600',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    { 
      field: 'candidateEmail', 
      headerName: 'Email', 
      width: 240,
      cellStyle: { 
        color: '#4F46E5',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    { 
      field: 'positionApplied', 
      headerName: 'Role', 
      width: 180,
      cellStyle: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    { 
      field: 'experienceYears', 
      headerName: 'Experience', 
      width: 130,
      cellRenderer: (params: any) => `${params.value} `,
      cellStyle: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '500'
      }
    },
    { 
      field: 'skills', 
      headerName: 'Skills', 
      width: 280, 
      tooltipField: 'skills',
      cellStyle: { 
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    {
      field: 'interviewStatus',
      headerName: 'Interview Status',
      width: 180,
      cellRenderer: StatusRenderer,
      cellStyle: { 
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    {
      headerName: 'Interview Summary',
      width: 180,
      cellRenderer: SummaryRenderer,
      cellStyle: { 
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    {
      headerName: 'Actions',
      width: 240,
      cellRenderer: ActionsRenderer,
      cellStyle: { 
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      sortable: false,
      filter: false
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

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

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleUpdateResume = (candidateEmail: string) => {
    setUpdateCandidateEmail(candidateEmail);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.txt';
    fileInput.onchange = (e) => uploadUpdatedResume(e, candidateEmail);
    fileInput.click();
  };

  const handleViewCandidate = async (candidateEmail: string) => {
    try {
      const response = await hrAPI.getCandidateByEmail(candidateEmail);
      setSelectedCandidate(response.data);
      setShowViewCandidateModal(true);
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      toast.error('Failed to load candidate details');
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
        loadCandidates();
      }
    } catch (error: any) {
      console.error('Update error:', error);
      alert(`Error: ${error.response?.data?.error || 'Failed to update resume'}`);
    }
  };

  const handleViewSummary = async (candidateEmail: string) => {
    try {
      const response = await hrAPI.getInterviewSummary(candidateEmail);
      console.log('Summary response:', response.data);

      if (response.data) {
        setSelectedSummary(response.data);
        setShowSummaryModal(true);
      } else {
        toast.error('No summary data found');
      }
    } catch (error: any) {
      console.log('Error:', error);
      toast.error('No interview summary found');
    }
  };

  const deleteCandidate = async (candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${candidateName}?`)) {
      return;
    }

    try {
      await hrAPI.deleteCandidate(candidateName);
      toast.success('Candidate deleted successfully!');
      loadCandidates();
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      alert(`Error: ${error.response?.data?.message || 'Failed to delete candidate'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(clearAuth());
      localStorage.clear();
      sessionStorage.clear();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 bg-white shadow-sm border-b border-slate-200 flex-shrink-0">
        <h1 className="text-3xl font-bold" style={{ color: '#F58220' }}>HR Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#ED1C24' }}
        >
          Logout
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-6 pb-4 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-3 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
          </div>
          <div className="p-4">
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateMeetingModal(true)}
                className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#56C5D0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Create Meeting
              </button>
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#F58220' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates List - Takes remaining space */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Candidates List</h2>
              </div>
              <div className="text-sm text-slate-500">
                Total: <span className="font-semibold text-slate-700">{candidates.length}</span> candidates
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <div className="ag-theme-alpine rounded-lg border border-slate-200 h-full">
              <AgGridReact
                rowData={candidates}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={10}
                domLayout="normal"
                rowHeight={50}
                headerHeight={45}
                animateRows={true}
                suppressCellFocus={true}
                rowClass="hover:bg-gray-50"
                suppressRowHoverHighlight={false}
              />
            </div>
          </div>
        </div>
      </div>

      {showAddCandidateModal && (
        <AddCandidateModal
          isOpen={showAddCandidateModal}
          onClose={() => setShowAddCandidateModal(false)}
          onCandidateAdded={loadCandidates}
        />
      )}

      {showCreateMeetingModal && (
        <CreateMeetingModal
          isOpen={showCreateMeetingModal}
          onClose={() => setShowCreateMeetingModal(false)}
          candidates={candidates}
        />
      )}

      {showViewCandidateModal && selectedCandidate && (
        <ViewCandidateModal
          isOpen={showViewCandidateModal}
          candidate={selectedCandidate}
          onClose={() => setShowViewCandidateModal(false)}
        />
      )}

      {showSummaryModal && selectedSummary && (
        <ViewSummaryModal
          isOpen={showSummaryModal}
          summary={selectedSummary}
          totalQuestions={questions.length}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </div>
  );
};

export default HRDashboard;