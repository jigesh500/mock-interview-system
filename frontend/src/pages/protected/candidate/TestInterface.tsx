import { useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { startTest } from '../../../redux/reducers/testSlice';
import TestSidebar from '../../../Components/candidate/TestSidebar';
import StartTest from '../../../Components/candidate/StartTest';
import CameraMonitor from '../../../Components/CameraMonitor';

const TestInterface = () => {
  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, isLoading, error, sessionId } = useAppSelector(state => state.test);

  useEffect(() => {
    dispatch(startTest());

    // Disable right click
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Disable specific keyboard shortcuts
    const handleKeyDown = (e) => {
      // Block common shortcuts
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'p', 'u', 's', 'r'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
        ['F12', 'F5'].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);

  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return (
      <Box className="flex justify-center items-center h-screen">
        <Typography>Loading test...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex justify-center items-center h-screen">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!currentQuestion) {
    return (
      <Box className="flex justify-center items-center h-screen">
        <Typography>No questions available</Typography>
      </Box>
    );
  }

  return (
    <Box
      className="h-screen bg-gray-50 p-4"
      sx={{
        userSelect: 'none',   // disable text selection
        MozUserSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      <Grid container spacing={3} className="h-full">
        {/* Sidebar */}
        <Grid item xs={4}>
          <CameraMonitor sessionId={sessionId} />
          <TestSidebar />
        </Grid>

        {/* Main Question Area */}
        <Grid item xs={8}>
          <StartTest />
        </Grid>
      </Grid>
    </Box>
  );
};

export default TestInterface;

