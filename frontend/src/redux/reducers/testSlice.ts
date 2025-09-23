import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

export interface Question {
    id:string,
    type:string,
    question:string,
    options?:string[]
}

export interface TestState {
    userId:string,
    questions: Question[],
    currentQuestionIndex: number,
    isLoading: boolean,
    error: string | null,
    markedQuestions:string[],
    visitedQuestions: string[];
  isSubmitted: boolean;
  answers: { [questionId: string]: string | string[] }; 
}

const initialState:TestState={
    userId:"",
    questions:[],
    currentQuestionIndex:0,
    isLoading:false,
    error:null,
    markedQuestions:[],
    visitedQuestions:["1"],
    isSubmitted:false,
    answers:{}
}

export const startTest = createAsyncThunk(
  'interview/startTest',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:8081/interview/start', {
        withCredentials: true,
      });
      return response.data; // { questions: Question[], userId: string }
    } catch (err: any) {
      return rejectWithValue('Failed to start interview');
    }
  }
);

const testSlice =createSlice({
name:'test',
initialState,
reducers:{
    setCurrentQuestionIndex:(state,action:PayloadAction<number>)=>{
        state.currentQuestionIndex=action.payload;
    },
    saveAnswer(state,action:PayloadAction<{questionId:string,answer:string | string[]}>){
        // state.questions[action.payload.questionId]=action.payload.answer;
         const question = state.questions.find(q => q.id === action.payload.questionId);
        if (question) {
            // @ts-ignore
            question.answer = action.payload.answer;
        }
    //     state.questions=state.questions.map(q=>{
    //         if(q.id===action.payload.questionId){
    //             return {...q,answer:action.payload.answer};
    //         }       
    //         return q;
    //     });
    // }
}
},
extraReducers: (builder) => {
    builder
      .addCase(startTest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startTest.fulfilled, (state, action: PayloadAction<{ questions: Question[]; userId: string }>) => {
        state.isLoading = false;
        state.questions = action.payload.questions;
        state.userId = action.payload.userId;
      })
      .addCase(startTest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
    }

})
export const { setCurrentQuestionIndex,saveAnswer } = testSlice.actions;
export default testSlice.reducer;