# AI-Powered Mock Interview Platform

A comprehensive enterprise-grade interview management system with AI-powered real-time proctoring and automated evaluation.

## 🏗️ Architecture

**Full-Stack Enterprise Application:**
- **Backend**: Spring Boot 3.5.5 (Java 21) - REST API
- **Frontend**: React 19 + TypeScript + Vite
- **Database**: MySQL with JPA/Hibernate
- **Authentication**: OAuth2 (Auth0)
- **AI Integration**: Spring AI with Gemini 2.0 Flash

## 🚀 Key Features

### 1. **HR Management Dashboard**
- **Candidate Management**:AI-powered resume upload
- **Interview Scheduling**: Assign candidates to interview sessions
- **Resume Parsing**: AI extracts candidate information (name, email, skills, experience)
- **Real-time Monitoring**: Track candidate activities during interviews
- **Candidate Database**: Full CRUD operations with MySQL persistence

### 2. **Candidate Experience**
- **Secure Authentication**: OAuth2 with Auth0 integration
- **Interview Dashboard**: View scheduled interviews and join meetings
- **Exam Interface**: Professional exam environment with Monaco code editor
- **Real-time Proctoring**: Face detection and behavior monitoring
- **Session Management**: Secure session handling with violation tracking

### 3. **AI-Powered Interview System**
- **Smart Question Generation**: 25 MCQ + 5 Coding questions tailored to candidate profile
- **Adaptive Difficulty**: Questions adjust based on experience level:
   - **0-1 years**: Beginner (basic syntax, fundamentals)
   - **2-4 years**: Intermediate (problem-solving, APIs, design)
   - **5+ years**: Advanced (system design, architecture, optimization)
- **Comprehensive Evaluation**: AI scoring (1-30) with detailed feedback
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

# Install dependencies
mvn clean install

# Run the application (will start on port 8081)
mvn spring-boot:run

# Alternative: Run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Configuration
Create `application-local.properties` file in `backend/src/main/resources/`:
```properties
# Auth0 Configuration
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_ISSUER_URI=https://your-domain.auth0.com/

# Gemini AI Configuration (used as OpenAI API key)
GEMINI_API_KEY=your_gemini_api_key

# Database Configuration
DB_URL=jdbc:mysql://localhost:3306/mock_interview
DB_USERNAME=root
DB_PASSWORD=your_password
```

**Note**: The application uses Spring profiles with `local` profile active by default. Configuration is loaded from `application-local.properties`.

### Database Setup
```sql
# Create MySQL database
CREATE DATABASE mock_interview;

# Grant permissions (if needed)
GRANT ALL PRIVILEGES ON mock_interview.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

**Note**: Tables are automatically created via JPA with `spring.jpa.hibernate.ddl-auto=update` configuration.

## 🌐 Application URLs

- **Frontend (React + Vite)**: http://localhost:5173
- **Backend API (Spring Boot)**: http://localhost:8081
- **HR Dashboard**: http://localhost:5173/hr-dashboard
- **Candidate Dashboard**: http://localhost:5173/candidate-dashboard
- **Interview Interface**: http://localhost:5173/interview/start

**Default Ports:**
- Backend: 8081 (configured in application.properties)
- Frontend: 5173 (Vite default)

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

### Project Structure
```
MockInterviewDemo/
├── backend/                 # Spring Boot application
│   ├── src/main/java/      # Java source code
│   ├── src/main/resources/ # Configuration files
│   │   ├── application.properties
│   │   └── application-local.properties
│   ├── pom.xml            # Maven dependencies
│   └── target/            # Compiled classes
├── frontend/              # React application
│   ├── src/               # TypeScript/React source
│   ├── public/            # Static assets
│   ├── package.json       # NPM dependencies
│   └── vite.config.ts     # Vite configuration
└── README.md              # Project documentation
```

### Backend Technologies
- **Framework**: Spring Boot 3.5.5 (Java 21)
- **Security**: Spring Security + OAuth2 (Auth0)
- **Database**: Spring Data JPA + MySQL Connector
- **AI**: Spring AI 1.0.1 with Gemini 2.0 Flash (via OpenAI API compatibility)
- **File Processing**: Apache PDFBox 2.0.29, Apache POI 5.2.4, Tess4j 5.8.0 (OCR)
- **Communication**: WebSocket 3.5.5 with STOMP protocol
- **Configuration**: Spring DotEnv 4.0.0
- **Build Tool**: Maven with Java 21 compiler

### Frontend Technologies
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7.1.7
- **State Management**: Redux Toolkit 2.9.0
- **UI Library**: Material-UI (MUI) 7.3.2
- **Styling**: Tailwind CSS 4.1.13
- **Code Editor**: Monaco Editor 4.7.0 (VS Code editor)
- **Face Detection**: face-api.js 0.22.2
- **HTTP Client**: Axios 1.12.2
- **Authentication**: Auth0 React SDK 2.5.0
- **Data Grid**: AG Grid React 34.2.0
- **Notifications**: React Hot Toast 2.6.0
- **Icons**: React Icons 5.5.0 + MUI Icons 7.3.2

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