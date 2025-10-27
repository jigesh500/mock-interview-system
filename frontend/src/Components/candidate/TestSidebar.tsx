import { Box, Card, Chip, Grid, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setCurrentQuestionIndex } from '../../redux/reducers/testSlice';

const TestSidebar = () => {
  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, answers, markedForReview, answeredQuestions } = useAppSelector((state) => state.test);

  const getQuestionStatus = (questionId: string, index: number) => {
    const isAnswered = answeredQuestions?.includes(questionId) || false;
    const isMarked = markedForReview?.includes(questionId) || false;
    const isCurrent = currentQuestionIndex === index;

    if (isCurrent) {
      return { color: 'secondary' as const, variant: 'filled' as const, className: 'ring-2 ring-blue-400' };
    } else if (isAnswered) {
      return { color: 'success' as const, variant: 'filled' as const, className: '' };
    } else if (isMarked) {
      return { color: 'info' as const, variant: 'filled' as const, className: '' };
    }
    return { color: 'default' as const, variant: 'outlined' as const, className: 'opacity-60' };
  };

  const handleQuestionClick = (index: number) => {
    dispatch(setCurrentQuestionIndex(index));
  };

  const getStatusCounts = () => {
    let answered = answeredQuestions?.length || 0;
    let marked = markedForReview?.length || 0;
    return { answered, marked };
  };

  const statusCounts = getStatusCounts();

  return (
   <Card className="h-full bg-white shadow-lg">
         <Typography variant="h6" className="mb-4 text-center font-bold">
        Questions
      </Typography>

         <Box className="mb-4 p-3 bg-white rounded-lg shadow-sm">
        <Typography variant="subtitle2" className="mb-2 text-gray-600">
          Status Overview
        </Typography>
        <Box className="space-y-2 text-sm">
          <Box className="flex justify-between">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Answered
            </span>
            <span className="font-semibold">{statusCounts.answered}</span>
          </Box>
          <Box className="flex justify-between">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              Marked for Review
            </span>
            <span className="font-semibold">{statusCounts.marked}</span>
          </Box>
        </Box>
      </Box>

      {/* Question Grid */}
      <Grid container spacing={1}>
        {questions?.map((question, index) => {
          const status = getQuestionStatus(question.id, index);
          return (
            <Grid xs={3} key={question.id}>
              <Chip
                label={index + 1}
                color={status.color}
                variant={status.variant}
                className={`w-full cursor-pointer hover:scale-105 transition-transform ${status.className}`}
                onClick={() => handleQuestionClick(index)}
                size="small"
              />
            </Grid>
          );
        })}
      </Grid>
    </Card>
  )
}

export default TestSidebar
