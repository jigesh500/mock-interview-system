# AI-Powered Mock Interview System

## 🚀 Features

### 1. **Resume-Based Question Generation**
- Upload your resume (PDF, TXT, DOC, DOCX)
- AI analyzes your skills and experience
- Generates 5 personalized interview questions

### 2. **Interactive Interview Exam**
- Answer questions in a user-friendly interface
- No time limits - take your time to think
- Submit all answers at once

### 3. **AI-Powered Review & Feedback**
- Comprehensive analysis of your answers
- Performance scoring (1-10)
- Specific feedback for each response
- Strengths and improvement areas
- Hiring recommendation

### 4. **AI Chat Assistant**
- General career and interview guidance
- Technical question assistance
- Real-time chat interface

## 🛠️ How to Use

1. **Start the Application**
   ```bash
   mvn spring-boot:run
   ```

2. **Access the System**
   - Open browser: `http://localhost:8081`
   - Click "Start Mock Interview"

3. **Upload Resume**
   - Enter your name/ID
   - Upload resume file
   - Click "Generate Interview Questions"

4. **Take the Interview**
   - Answer all 5 generated questions
   - Provide detailed responses
   - Submit when ready

5. **Review Results**
   - Get AI analysis and feedback
   - See your performance score
   - Review improvement suggestions

## 🔧 Technical Stack

- **Backend**: Spring Boot 3.5.5, Java 21
- **AI Integration**: Spring AI with Gemini 2.0 Flash
- **Authentication**: OAuth2 (Auth0)
- **Frontend**: Thymeleaf, HTML5, CSS3, JavaScript
- **File Upload**: Spring Boot Multipart

## 📝 Configuration

The system uses Gemini AI through Google's Generative Language API. Make sure your API key is configured in `application.properties`.

## 🎯 Use Cases

- **Job Seekers**: Practice interviews with personalized questions
- **Students**: Prepare for technical interviews
- **Career Changers**: Get feedback on domain-specific knowledge
- **Recruiters**: Understand AI-based interview assessment

## 🔒 Security

- OAuth2 authentication with Auth0
- Secure file upload handling
- Session-based question/answer storage
- No persistent storage of sensitive data

---

**Ready to ace your next interview? Start practicing now!** 🎉