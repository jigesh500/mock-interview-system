import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { hrAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch } from '../redux/hooks';
import AddCandidateModal from '../Components/hr/AddCandidateModal';
 import ScheduleInterviewModal from '../Components/hr/ScheduleInterviewModal';
import toast, { Toaster } from 'react-hot-toast';
import ViewCandidateModal from '../Components/hr/ViewCandidateModal';
import ScheduleSecondRoundModal from '../Components/hr/ScheduleSecondRoundModal';
import ViewSummaryModal from '../Components/hr/ViewSummaryModal';
import { useAppSelector } from '../redux/hooks';
 import { FaCopy } from 'react-icons/fa';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [candidateEmail, setCandidateEmail] = useState('');

  const [candidates, setCandidates] = useState<any[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [updateCandidateEmail, setUpdateCandidateEmail] = useState<string>('');

    const [showScheduleInterviewModal, setShowScheduleInterviewModal] = useState(false);
  const [showViewCandidateModal, setShowViewCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
   const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
   const { questions } = useAppSelector((state) => state.test);
    const [magicLink, setMagicLink] = useState<string | null>(null);

  // Derived counts for dashboard overview
  const { passedCount, failedCount, inProgressCount } = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let inProgress = 0;

    candidates.forEach(candidate => {
      if (candidate.secondRoundStatus === 'PASS') {
        passed++;
      } else if (candidate.firstRoundStatus === 'FAIL' || candidate.secondRoundStatus === 'FAIL') {
        failed++;
      } else {
        // If not explicitly passed or failed, consider them in progress
        // This covers 'Pending', 'Scheduled', 'Completed' (first round, no decision),
        // and 'PASS' (first round) but second round is 'PENDING' or scheduled.
        inProgress++;
      }
    });
    return {
      passedCount: passed,
      failedCount: failed,
      inProgressCount: inProgress,
    };
  }, [candidates]);

// Filter candidates available for first-round scheduling
   const availableForSchedulingCandidates = useMemo(() => {
     return candidates.filter(c => c.interviewStatus === 'Pending');
   }, [candidates]);

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

// const refreshGrid = () => {
//   if (gridApi) {
//     gridApi.refreshCells({ force: true });
//   }
// };

const handleViewSummary = useCallback(async (candidateEmail: string) => {
    try {
      const response = await hrAPI.getInterviewSummary(candidateEmail);

      if (response.data) {
        setSelectedSummary({ ...response.data, candidateEmail });
        setShowSummaryModal(true);
      } else {
        toast.error('No summary data found');
      }
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
      toast.error('No interview summary found');
    }
  }, []);

  // New function to open the scheduling modal
  const handleOpenScheduleModal = useCallback((candidateEmail: string) => {
     setCandidateEmail(candidateEmail);
     setShowScheduleModal(true);
   }, []);


  const FirstRoundRenderer = useMemo(() => (props: any) => {
    const firstRoundStatus = props.data.firstRoundStatus;
    const interviewStatus = props.data.interviewStatus;
    const summaryStatus = props.data.summaryStatus;
     const secondRoundInterviewerName = props.data.secondRoundInterviewerName;
         const candidateEmail = props.data.candidateEmail;
    const currentRound = props.data.currentRound;

    if (firstRoundStatus === 'FAIL') {
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
          style={{ backgroundColor: '#ED1C24', borderColor: '#ED1C24' }}
        >
          Fail
        </span>
      );
    }

    if (firstRoundStatus === 'PASS') {
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
          style={{ backgroundColor: '#56C5D0', borderColor: '#56C5D0' }}
        >
          Pass
        </span>
      );
    }

    // Show "View Summary" button if interview is completed and no decision has been made
    if (interviewStatus === 'Completed' && summaryStatus && !firstRoundStatus) {
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

    return <span className="text-slate-400 text-xs italic">Pending</span>;
  }, [candidates, handleViewSummary]); // handleViewSummary is now stable due to useCallback

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

  const SecondRoundRenderer = useMemo(() => (props: any) => {
    const {
      secondRoundInterviewerName,
      candidateEmail,
      secondRoundStatus,
      firstRoundStatus,
      summaryStatus,
    } = props.data;

    // If first round failed, show nothing
    if (firstRoundStatus === 'FAIL') {
      return <span className="text-slate-400 text-xs">-</span>;
    }

    // If an interviewer is assigned, show their name and a change button
    // If second round has a final PASS/FAIL status, show it
    if (secondRoundStatus === 'PASS') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
              style={{ backgroundColor: '#56C5D0', borderColor: '#56C5D0' }}>
          Pass
        </span>
      );
    }

    if (secondRoundStatus === 'FAIL') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
              style={{ backgroundColor: '#ED1C24', borderColor: '#ED1C24' }}>
          Fail
        </span>
      );
    }

    // If the 2nd round interview is completed and has a summary, show View Summary button
    if (secondRoundStatus === 'COMPLETED' && summaryStatus) {
      return (
        <button
          className="text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#F58220' }}
          onClick={() => handleViewSummary(candidateEmail)}
        >
          View Summary
        </button>
      );
    }

    // If an interviewer is assigned (i.e., scheduled), show their name and a change button
    if (secondRoundInterviewerName) {
      return (
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-xs font-semibold text-slate-700">{secondRoundInterviewerName}</span>
          <button
            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            onClick={() => handleOpenScheduleModal(candidateEmail)}
          >
            (Change)
          </button>
        </div>
      );
    }

    // If first round passed and second round is pending (and not yet scheduled), show Schedule button
    if (firstRoundStatus === 'PASS' && secondRoundStatus === 'PENDING') {
      return (
        <button
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#56C5D0' }}
          onClick={() => handleOpenScheduleModal(candidateEmail)}
        >
            Assign
        </button>
      );
    }

    return <span className="text-slate-400 text-xs">-</span>;
  }, [candidates, handleViewSummary, handleOpenScheduleModal]); // Added handleOpenScheduleModal to dependencies

  const columnDefs = useMemo(() => [
    { 
      field: 'candidateName', 
      headerName: 'Name', 
      flex: 1,
      minWidth: 150,
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
      flex: 1.5,
      minWidth: 200,
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
      flex: 1,
      minWidth: 120,
      cellStyle: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    { 
      field: 'experienceYears', 
      headerName: 'Experience', 
      flex: 0.7,
      minWidth: 100,
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
      flex: 1.2,
      minWidth: 150,
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
      headerName: 'Status',
      flex: 0.8,
      minWidth: 100,
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
        field: 'firstRoundStatus',
      headerName: 'First Round',
      flex: 1,
      minWidth: 120,
      cellRenderer: FirstRoundRenderer,
      cellStyle: { 
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    {
      field: 'secondRoundStatus',
      headerName: 'Second Round',
      flex: 1,
      minWidth: 130,
      cellRenderer: SecondRoundRenderer,
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
      flex: 1.2,
      minWidth: 180,
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
  ], [FirstRoundRenderer, SecondRoundRenderer]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    headerClass: 'center-header',
    suppressSizeToFit: false
  }), []);

    const loadCandidates = useCallback(async () => {
    try {
      const response = await hrAPI.getCandidates();
      setCandidates(response.data);
//       // Force grid to refresh all cells after data update
//       if (gridApi) {
//         setTimeout(() => {
//           gridApi.refreshCells({ force: true });
//         }, 50);
//       }
    } catch (error) {
      console.error('Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    }
// }, [gridApi]);
 }, []);

const validateCandidateAction = (candidateEmail: string, interviewStatus: string) => {
  if (interviewStatus === 'Scheduled') {
    toast.error('Interview is scheduled. Please wait for candidate to complete the interview before making a decision.');
    return false;
  }
  return true;
};

const handleSelectCandidate = async (candidateEmail: string) => {
  const candidate = candidates.find(c => c.candidateEmail === candidateEmail);
  if (!validateCandidateAction(candidateEmail, candidate?.interviewStatus)) return;
  
  if (!window.confirm(`Are you sure you want to SELECT candidate ${candidateEmail}?`)) return;
  
  try {
    const response = await hrAPI.selectCandidate(candidateEmail);
    if (response.data.success) {
      toast.success(response.data.message);
      await loadCandidates();

    } else {
      toast.error(response.data.message);
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to select candidate');
  }
  setShowSummaryModal(false);
};



// Update the handleRejectCandidate function
const handleRejectCandidate = async (candidateEmail: string) => {
  const candidate = candidates.find(c => c.candidateEmail === candidateEmail);
  if (!validateCandidateAction(candidateEmail, candidate?.interviewStatus)) return;

  if (!window.confirm(`Are you sure you want to REJECT candidate ${candidateEmail}?`)) return;

  try {
    const response = await hrAPI.rejectCandidate(candidateEmail);
    if (response.data.success) {
      toast.success(response.data.message);
      await loadCandidates();

    } else {
      toast.error(response.data.message);
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to reject candidate');
  }
  setShowSummaryModal(false);
};

   useEffect(() => {
      // Load candidates immediately when the component mounts
      loadCandidates();

      // Set up an interval to refresh the data every 30 seconds
      const intervalId = setInterval(() => {
        loadCandidates();
      }, 30000); // 30000 milliseconds = 30 seconds

      // Cleanup function: clear the interval when the component unmounts
      return () => clearInterval(intervalId);
    }, [loadCandidates]); // Re-run if loadCandidates changes

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
      console.error('Operation failed:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load candidate details');
    }
  };



  const uploadUpdatedResume = async (e: any, candidateEmail: string) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('candidateEmail', candidateEmail);

    try {

      const response = await hrAPI.updateResume(formData);
      if (response.data.success) {
        toast.success('Resume updated successfully!');
        loadCandidates();
      }
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
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
      loadCandidates();
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
      alert(`Error: ${error.response?.data?.message || 'Failed to delete candidate'}`);
    }
  };
 // This function will be called from the CreateMeetingModal after a candidate is assigned
   const handleCandidateAssigned = (link: string) => {
     setMagicLink(link); // Set the link to show the modal
     loadCandidates(); // Refresh the candidate list
   };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Operation failed:', error instanceof Error ? error.message : 'Unknown error');
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
                onClick={() => setShowScheduleInterviewModal(true)}
                className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#56C5D0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule Interview
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
                <h2 className="text-xl font-bold text-slate-800 mb-1">Candidates List</h2>
                <div className="flex gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Total: <span className="font-semibold text-slate-700">{candidates.length}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Passed: <span className="font-semibold text-slate-700">{passedCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span> In Progress: <span className="font-semibold text-slate-700">{inProgressCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Failed: <span className="font-semibold text-slate-700">{failedCount}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <div className="ag-theme-alpine rounded-lg border border-slate-200 h-full w-full">
              <style>{`
                .center-header .ag-header-cell-label {
                  justify-content: center;
                }
            .ag-tooltip {
                background-color: white !important;
                color: black !important;
                border: 1px solid #ccc !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
              }
              `}</style>
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
                onGridReady={(params) => {
                  setGridApi(params.api);
                  params.api.sizeColumnsToFit();
                }}
                onGridSizeChanged={(params) => {
                  params.api.sizeColumnsToFit();
                }}
                onFirstDataRendered={(params) => {
                  params.api.sizeColumnsToFit();
                }}
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

      {showScheduleInterviewModal && (
               <ScheduleInterviewModal
                 isOpen={showScheduleInterviewModal}
                 onClose={() => setShowScheduleInterviewModal(false)}
          candidates={availableForSchedulingCandidates}
          onInterviewScheduled={handleCandidateAssigned}
        />
      )}

{showScheduleModal && (
         <ScheduleSecondRoundModal
           isOpen={showScheduleModal}
           onClose={() => setShowScheduleModal(false)}
           candidateEmail={candidateEmail}
           onScheduled={loadCandidates}
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
          onSelect={handleSelectCandidate}
          onReject={handleRejectCandidate}
          candidateEmail={selectedSummary.candidateEmail}
          interviewStatus={candidates.find(c => c.candidateEmail === selectedSummary.candidateEmail)?.interviewStatus}
        />
      )}

      {/* Modal to display the generated Magic Link */}
      {magicLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Candidate Dashboard Link</h3>
              <p className="text-sm text-slate-600 mb-2">Share this secure link with the candidate:</p>
              <div className="flex items-center gap-2 p-2 bg-slate-100 border border-slate-300 rounded">
                <input
                  type="text"
                  // Construct the full frontend URL for the candidate dashboard
                  value={`${window.location.origin}/candidate-dashboard/${magicLink.split('/').pop()}`}
                  readOnly
                  className="w-full bg-transparent outline-none text-slate-700"
                />
                <button
                  onClick={() => {
                    // Construct the correct frontend URL to copy
                    const portalLink = `${window.location.origin}/candidate-dashboard/${magicLink.split('/').pop()}`;
                    navigator.clipboard.writeText(portalLink);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 transition-colors"
                  title="Copy to clipboard"
                >
                  <FaCopy />
                </button>
              </div>
              <div className="mt-6 text-right">
                <button onClick={() => setMagicLink(null)} className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;