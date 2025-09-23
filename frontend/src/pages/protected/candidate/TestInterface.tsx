// src/pages/protected/candidate/TestInterface.tsx
import React, { useEffect } from 'react';
import { Box, Grid, Card, Typography, Button, Radio, RadioGroup, FormControlLabel, Checkbox, FormGroup, LinearProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { startTest, setCurrentQuestionIndex, saveAnswer } from '../../../redux/reducers/testSlice';
import TestSidebar from '../../../Components/candidate/TestSidebar';

const TestInterface = () => {
  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, answers, isLoading, error, userId } = useAppSelector(state => state.test);

  useEffect(() => {
    dispatch(startTest());
  }, [dispatch]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : '';

  const handleAnswerChange = (answer: string | string[]) => {
    if (currentQuestion) {
      dispatch(saveAnswer({ questionId: currentQuestion.id, answer }));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      dispatch(setCurrentQuestionIndex(currentQuestionIndex + 1));
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      dispatch(setCurrentQuestionIndex(currentQuestionIndex - 1));
    }
  };

  const handleMarkForReview = () => {
    if (currentQuestion) {
    //   dispatch(toggleMarkQuestion(currentQuestion.id));
    }
  };

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
        {/* Main Question Area */}
        <Grid item xs={8}>
          <Card className="h-full p-6">
            {/* Progress Bar */}
            <Box className="mb-4">
              <Typography variant="body2" className="mb-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={((currentQuestionIndex + 1) / questions.length) * 100} 
                className="h-2 rounded"
              />
            </Box>

            {/* Question */}
            <Typography variant="h6" className="mb-6 font-medium">
              {currentQuestion.question}
            </Typography>

            {/* Answer Options */}
            <Box className="mb-8">
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options ? (
                <RadioGroup
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                >
                  {currentQuestion.options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option}
                      control={<Radio />}
                      label={option}
                      className="mb-2"
                    />
                  ))}
                </RadioGroup>
              ) : currentQuestion.type === 'multiple-select' && currentQuestion.options ? (
                <FormGroup>
                  {currentQuestion.options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      control={
                        <Checkbox
                          checked={Array.isArray(currentAnswer) && currentAnswer.includes(option)}
                          onChange={(e) => {
                            const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                            if (e.target.checked) {
                              handleAnswerChange([...currentAnswers, option]);
                            } else {
                              handleAnswerChange(currentAnswers.filter(ans => ans !== option));
                            }
                          }}
                        />
                      }
                      label={option}
                      className="mb-2"
                    />
                  ))}
                </FormGroup>
              ) : (
                <textarea
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                  placeholder="Type your answer here..."
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                />
              )}
            </Box>

            {/* Navigation Buttons */}
            <Box className="flex justify-between items-center">
              <Button
                variant="outlined"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              <Box className="space-x-2">
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleMarkForReview}
                >
                  Mark for Review
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={4}>
          <TestSidebar />
        </Grid>
      </Grid>
    </Box>
  );
};

export default TestInterface;
