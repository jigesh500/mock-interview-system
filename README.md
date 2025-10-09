# AI-Powered Mock Interview Platform

A comprehensive enterprise-grade interview management system with AI-powered question generation, real-time proctoring, and automated evaluation.

## 🏗️ Architecture

**Full-Stack Enterprise Application:**
- **Backend**: Spring Boot 3.5.5 (Java 21) - REST API
- **Frontend**: React 19 + TypeScript + Vite
- **Database**: MySQL with JPA/Hibernate
- **Authentication**: OAuth2 (Auth0)
- **AI Integration**: Spring AI with Gemini 2.0 Flash
- **Cloud Integration**: Microsoft Teams API, Azure Graph API

## 🚀 Key Features

### 1. **HR Management Dashboard**
- **Candidate Management**:AI-powered resume upload
- **Microsoft Teams Integration**: Create real Teams meeting links automatically
- **Interview Scheduling**: Assign candidates to interview sessions
- **Resume Parsing**: AI extracts candidate information (name, email, skills, experience)
- **Real-time Monitoring**: Track candidate activities during interviews
- **Candidate Database**: Full CRUD operations with MySQL persistence

### 2. **Candidate Experience**
- **Secure Authentication**: OAuth2 with Auth0 integration
- **Interview Dashboard**: View scheduled interviews and join meetings
- **Teams Integration**: Seamless Microsoft Teams meeting participation
- **Exam Interface**: Professional exam environment with Monaco code editor
- **Real-time Proctoring**: Face detection and behavior monitoring
- **Session Management**: Secure session handling with violation tracking

### 3. **AI-Powered Interview System**
- **Smart Question Generation**: 8 MCQ + 2 Coding questions tailored to candidate profile
- **Adaptive Difficulty**: Questions adjust based on experience level:
  - **0-1 years**: Beginner (basic syntax, fundamentals)
  - **2-4 years**: Intermediate (problem-solving, APIs, design)
  - **5+ years**: Advanced (system design, architecture, optimization)
- **Comprehensive Evaluation**: AI scoring (1-10) with detailed feedback
- **Performance Analysis**: Strengths, improvements, and hiring recommendations
- **Resume-Based Customization**: Questions generated from candidate's actual skills and experience

### 4. **Advanced Proctoring & Security**
- **Face Detection**: Real-time face tracking using face-api.js
- **Behavior Monitoring**: Tab switching, window focus, and violation detection
- **Security Violations**: Automatic detection and logging of suspicious activities
- **Session Security**: Exam environment isolation and security controls
- **Monitoring Dashboard**: HR can track candidate behavior in real-time

### 5. **Enterprise Features**
- **File Processing**: Multi-format support (PDF, DOCX, TXT) with OCR capabilities
- **Database Persistence**: Complete interview history and candidate profiles
- **API Integration**: Microsoft Graph API for Teams meeting creation
- **Scalable Architecture**: Microservices-ready with proper separation of concerns
- **Environment Configuration**: Environment-based configuration with .env support

## 🛠️ Setup & Installation

### Prerequisites
- Java 21
- Node.js 18+
- MySQL 8.0+
- Maven 3.6+

### Backend Setup
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Configuration
Create `.env` file in backend root:
```properties
# Auth0 Configuration
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_ISSUER_URI=https://your-domain.auth0.com/

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Microsoft Azure/Teams Configuration
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_USER_ID=your_azure_user_id

# Database Configuration
DB_URL=jdbc:mysql://localhost:3306/mock_interview
DB_USERNAME=root
DB_PASSWORD=your_password
```

### Database Setup
```sql
CREATE DATABASE mock_interview;
-- Tables are auto-created via JPA
```

## 🌐 Application URLs

- **Frontend (React)**: http://localhost:5173
- **Backend API**: http://localhost:8081
- **HR Dashboard**: http://localhost:5173/hr-dashboard
- **Candidate Dashboard**: http://localhost:5173/candidate-dashboard
- **Interview Interface**: http://localhost:5173/interview/start

## 📊 API Endpoints

### HR Management
- `GET /hr/dashboard` - Get all candidates
- `POST /hr/candidates` - Add new candidate
- `POST /hr/upload-resume` - Upload and parse resume with AI
- `POST /hr/create-meeting` - Create Microsoft Teams meeting
- `POST /hr/assign-candidate` - Assign candidate to meeting
- `DELETE /hr/candidates/{name}` - Delete candidate

### Candidate Operations
- `GET /candidate/interview-info` - Get interview details
- `POST /candidate/join-interview` - Join interview session

### Interview Management
- `GET /interview/start` - Start interview with AI question generation
- `POST /interview/submit-answers` - Submit answers for AI evaluation
- `GET /interview/start-with-session` - Resume interview session

### Monitoring & Security
- `POST /api/monitoring/log-event` - Log security/behavior events
- `GET /api/monitoring/events/{sessionId}` - Get session events
- `GET /api/monitoring/active-sessions` - Get active interview sessions
- `GET /api/monitoring/summary/{sessionId}` - Get session summary

## 🔧 Technology Stack

### Backend Technologies
- **Framework**: Spring Boot 3.5.5
- **Security**: Spring Security + OAuth2 (Auth0)
- **Database**: Spring Data JPA + MySQL
- **AI**: Spring AI Framework with Gemini 2.0 Flash
- **File Processing**: Apache PDFBox, Apache POI, Tess4j (OCR)
- **Communication**: WebSocket with STOMP protocol
- **Cloud**: Microsoft Graph API, Azure Identity
- **Build Tool**: Maven

### Frontend Technologies
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (VS Code editor)
- **Face Detection**: face-api.js
- **HTTP Client**: Axios
- **Authentication**: Auth0 React SDK

### Database Schema
- **candidate_profile**: Candidate information and skills
- **interview_meeting**: Teams meeting and assignment data
- **interview_session**: Active interview sessions
- **interview_result**: Interview results and AI feedback
- **monitoring_event**: Real-time proctoring events

## 🎯 Use Cases

- **Enterprise HR Teams**: Streamline technical interview process
- **Technical Recruiters**: Automated assessment with consistent evaluation
- **Remote Hiring**: Secure online interviews with proctoring
- **Candidate Assessment**: Standardized evaluation across all interviews
- **Interview Analytics**: Data-driven hiring decisions
- **Scalable Recruitment**: Handle multiple concurrent interviews

## 🔒 Security Features

- **OAuth2 Authentication**: Secure login with Auth0
- **CORS Configuration**: Proper cross-origin resource sharing
- **File Upload Security**: Validated and secure file processing
- **Session Management**: Secure session handling with timeout
- **Real-time Monitoring**: Continuous candidate behavior tracking
- **Violation Detection**: Automatic detection of exam violations
- **SSL/TLS Support**: Encrypted communication
- **Environment Variables**: Secure configuration management

## 📈 Monitoring & Analytics

- **Real-time Proctoring**: Face detection and behavior monitoring
- **Interview Analytics**: Performance metrics and reporting
- **Violation Logging**: Comprehensive security event logging
- **Session Summaries**: Detailed interview session reports
- **HR Dashboard**: Real-time monitoring of active interviews

## 🚀 Deployment

### Production Considerations
- Configure SSL certificates for HTTPS
- Set up production database with proper credentials
- Configure Auth0 for production domain
- Set up Microsoft Azure app registration
- Configure Gemini AI API limits
- Set up monitoring and logging
- Configure CORS for production domains

---

**Transform your hiring process with AI-powered automation and real-time proctoring!** 🚀