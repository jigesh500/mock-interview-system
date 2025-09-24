import  { useEffect } from 'react';
import { Box, Grid, Typography} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { startTest } from '../../../redux/reducers/testSlice';
import TestSidebar from '../../../Components/candidate/TestSidebar';
import StartTest from '../../../Components/candidate/StartTest';

const TestInterface = () => {
  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, isLoading, error } = useAppSelector(state => state.test);

  useEffect(() => {
    dispatch(startTest());
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
    <Box className="h-screen bg-gray-50 p-4">
      <Grid container spacing={3} className="h-full">
         {/* Sidebar */}
        <Grid item xs={4}>
          <TestSidebar />
        </Grid>
        {/* Main Question Area */}
        <Grid item xs={8}>
          <StartTest/>
        </Grid>
       
      </Grid>
    </Box>
  );
};

export default TestInterface;
