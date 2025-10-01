import React from 'react'
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { 
  Card, 
  CardContent, 
  Typography, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  FormControl,
  Box,
  Button
} from '@mui/material';
import { saveAnswer, nextQuestion, previousQuestion, markQuestionForReview, unmarkQuestionForReview, markQuestionAsAnswered } from '../../redux/reducers/testSlice';

const StartTest:React.FC = () => {
    const dispatch = useAppDispatch();
    const {questions,currentQuestionIndex, answers} = useAppSelector((state) => state.test);
    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = answers ? answers[currentQuestion.id] : undefined;

    const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        dispatch(saveAnswer({ questionId: currentQuestion.id, answer: value }));
    };

  return (
     <Card className="h-full bg-white shadow-lg w-[1430px] mx-auto">
      <CardContent className="p-6">
        <Box className="mb-4">
          <Typography variant="h6" className="text-gray-600 mb-2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Typography>
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </Box>

        <Typography variant="h5" className="mb-6 font-semibold leading-relaxed"
        sx={{ minHeight: 120 }} >
          {currentQuestion.question}
        </Typography>

        <FormControl component="fieldset" className="w-full">
          <RadioGroup
            value={selectedAnswer}
            onChange={handleAnswerChange}
            name={`question-${currentQuestion.id}`}
          >
            {currentQuestion?.options?.map((option, index) => (
              <FormControlLabel
                key={index}
                value={option}
                control={<Radio color="primary" />}
                label={
                  <Typography variant="body1" className="ml-2">
                    {option}
                  </Typography>
                }
                className="mb-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                sx={{
                  margin: 0,
                  width: '100%',
                  border: selectedAnswer === option ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Box className="mt-8 flex justify-between items-center">
          <Button
            variant="outlined"
            onClick={() => dispatch(previousQuestion())}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2"
          >
            Previous
          </Button>

          <Box className="flex gap-3">
            <Button
              variant="contained"
              color="info"
              onClick={() => {
                dispatch(markQuestionForReview(currentQuestion.id));
                dispatch(nextQuestion());
              }}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-6 py-2"
            >
              Mark for Review & Next
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() => {
                if (selectedAnswer) {
                  dispatch(markQuestionAsAnswered(currentQuestion.id));
                }
                dispatch(nextQuestion());
              }}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-6 py-2"
            >
              Next
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default StartTest