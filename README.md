# Mock Interview System

A comprehensive mock interview platform built with Spring Boot backend and modern frontend technologies.

## Features

- **AI-Powered Interviews**: Integration with Gemini AI for intelligent interview questions
- **Authentication**: Secure login via Auth0
- **Microsoft Teams Integration**: Schedule and conduct interviews through Teams
- **Real-time Communication**: WebSocket support for live interviews
- **File Upload**: Resume and document management
- **Database**: MySQL for persistent data storage

## Tech Stack

### Backend
- Spring Boot 3.x
- Spring Security with OAuth2
- Spring Data JPA
- Hibernate
- MySQL Database
- Gemini AI Integration
- Microsoft Graph API

### Authentication & Integration
- Auth0 for user authentication
- Azure/Microsoft Teams integration
- OpenAI/Gemini API for AI features

## Prerequisites

- Java 17 or higher
- MySQL 8.0+
- Maven 3.6+
- Node.js (for frontend)

## Setup Instructions

### 1. Database Setup

```sql
CREATE DATABASE mock_interview;
```

### 2. Environment Configuration

Create `application-local.properties` in `backend/src/main/resources/`:

```properties
# Auth0 Configuration
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_ISSUER_URI=https://your-domain.auth0.com/

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Database Configuration
DB_PASSWORD=your_mysql_password

# Azure/Teams Configuration
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_USER_ID=your_email@domain.com
```

### 3. Running the Application

#### Backend
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8081`

#### Frontend
```bash
cd frontend
npm install
npm start
```

## Configuration

### Database Configuration
- **URL**: `jdbc:mysql://localhost:3306/mock_interview`
- **Username**: `root`
- **Password**: Set in `DB_PASSWORD` environment variable
- **DDL**: Auto-update enabled

### Security Configuration
- OAuth2 with Auth0
- Session timeout: 2 hours
- Secure cookies enabled

### File Upload
- Max file size: 10MB
- Max request size: 10MB

## API Endpoints

The application runs on port 8081 with the following base configuration:
- Base URL: `http://localhost:8081`
- Profile: `local`

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running
   - Verify database credentials
   - Check if `mock_interview` database exists

2. **Authentication Issues**
   - Verify Auth0 configuration
   - Check client ID and secret
   - Ensure redirect URIs are configured

3. **AI Integration Issues**
   - Verify Gemini API key
   - Check API quotas and limits

### Error: "Access denied for user 'root'@'localhost'"
- Check MySQL root password
- Ensure `DB_PASSWORD` is set correctly
- Verify MySQL service is running

## Development

### Project Structure
```
mock-interview-system/
├── backend/
│   ├── src/main/java/com/msbcgroup/mockinterview/
│   ├── src/main/resources/
│   └── pom.xml
├── frontend/
└── README.md
```

### Key Dependencies
- Spring Boot Starter Web
- Spring Boot Starter Security
- Spring Boot Starter Data JPA
- MySQL Connector
- Spring AI OpenAI
- Microsoft Graph SDK

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.