# AI Tutor Platform

## Table of Contents
- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Docker Deployment](#docker-deployment)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Design System](#design-system)
- [User Account Types](#user-account-types)
- [Text-to-Speech Integration](#text-to-speech-integration)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Potential Future Enhancements](#potential-future-enhancements)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Project Overview

The AI Tutor Platform is a comprehensive educational technology solution designed to provide personalized learning experiences through artificial intelligence. Built as a modular monolith using Rust for the backend and Svelte for the frontend, the platform enables users to interact with an AI tutor through both text and voice interfaces.

The platform features two user roles (Admin and Student), a Sources module for managing educational materials in PDF format, and a Learning Path module for tracking user progress. It supports multiple languages, offers voice and text interaction modes, and provides detailed analytics on learning activities.

## Quick Start

### Prerequisites
- Rust 1.70+ and Cargo
- Node.js 18+ and npm
- PostgreSQL 14+
- Docker (optional, for containerized deployment)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ai-tutor-platform.git
cd ai-tutor-platform

# Install backend dependencies and build
cargo build --release

# Install frontend dependencies
cd frontend
npm install
npm run build
cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
cargo run --bin migrations

# Start the application
cargo run --release
```

### Docker Deployment
```bash
docker-compose up -d
```

Visit `http://localhost:8080` to access the application.

## Key Features

### 1. User Account Management
- Two user roles: Admin and Student
- Secure authentication with JWT
- Role-based access control
- User profile management
- Customizable preferences

### 2. Multilingual Support
- Supports multiple languages (English, Russian, Spanish)
- Complete UI localization for each supported language
- Language selection on initial load
- Ability to change language during the session

### 3. Dual Communication Modes
- **Text Chat**: Traditional text-based messaging interface
- **Voice Chat**: Voice-based interaction with the AI tutor
  - Speech-to-Text (STT) using Whisper API
  - Text-to-Speech (TTS) with multiple provider options
- Easy toggle between both modes

### 4. Sources Module
- PDF upload and management for educational materials
- Subject and topic organization
- Text extraction and semantic indexing
- Integrated PDF viewer with annotation capabilities
- Search functionality across educational content

### 5. Learning Path Module
- Subject enrollment for students
- Progress tracking across different dimensions
- Achievement and milestone system
- Learning goals setting and monitoring
- Detailed analytics on learning activities

### 6. Rich Media Support
- Image upload and attachment functionality
- Multi-image selection and preview
- PDF viewing and interaction
- Voice recording and playback

### 7. User Interface
- Modern, clean design with rounded corners and subtle shadows
- Responsive layout that adapts to different screen sizes
- Mobile-friendly navigation with collapsible menu
- Dark/light theme toggle for user preference
- Admin and Student dashboards

### 8. Message History
- Chronological display of conversation history
- Different message styles for user, tutor, and system messages
- Timestamp display for all messages
- Support for text, image, and voice content in messages

### 9. Accessibility Features
- Clear visual feedback for active states
- Consistent navigation patterns
- Keyboard navigation support
- Voice interaction options

## Technical Architecture

The AI Tutor Platform is designed as a modular monolith - a single deployable application with clear internal boundaries between functional modules. This approach simplifies initial development and deployment while maintaining the flexibility to evolve toward microservices in the future if needed.

### Technology Stack

#### Frontend
- **Framework**: Svelte + SvelteKit
- **UI Components**: Custom Svelte components with Tailwind CSS
- **State Management**: Svelte stores
- **Internationalization**: svelte-i18n
- **API Communication**: Fetch API, WebSockets
- **PDF Rendering**: pdf.js for browser-based PDF viewing
- **Build Tools**: Vite

#### Backend
- **Language**: Rust
- **Web Framework**: Axum
- **Database**: PostgreSQL with SQLx for type-safe queries
- **Authentication**: JWT with Argon2 for password hashing
- **AI Integration**: OpenAI API client
- **WebSockets**: tokio-tungstenite
- **Speech Processing**: 
  - Whisper API for voice-to-text (STT)
  - TTS Service for text-to-speech
- **PDF Processing**: pdf-rs for parsing and text extraction
- **Vector Database**: Qdrant for semantic search of educational materials
- **Containerization**: Docker

### Modular Architecture

The application is organized into the following modules:

1. **Authentication Module**
   - User registration and login
   - Role-based access control (Admin/Student)
   - JWT token management
   - Password management and security

2. **User Module**
   - User profile management
   - User preferences
   - Admin user management functions

3. **Learning Path Module**
   - Subject enrollment
   - Progress tracking
   - Achievement and milestone management
   - Learning goals

4. **Sources Module**
   - PDF management and processing
   - Subject organization
   - Educational material metadata
   - Content search and retrieval

5. **AI Tutor Module**
   - Chat message processing
   - AI response generation
   - Voice processing (STT and TTS)
   - Context management

6. **Analytics Module**
   - Usage tracking
   - Learning analytics
   - Admin reporting
   - Performance insights

### Frontend Components
- **Navigation Bar**: Contains branding, navigation links, theme toggle, and mobile menu
- **Mode Selector**: Allows switching between text and voice chat modes
- **Language Selector**: Interface for choosing the application language
- **Chat Display**: Shows conversation history with the AI tutor
- **Input Area**: Context-aware input mechanism (text field or voice recording button)
- **PDF Viewer**: Integrated viewer for educational materials
- **Learning Dashboard**: Overview of user's learning progress
- **Admin Dashboard**: Interface for platform administration

### State Management
- Svelte stores for managing application state:
  - Chat mode (text/voice)
  - Theme preference (dark/light)
  - Selected language
  - Message history
  - Input message content
  - Recording status
  - Mobile menu visibility
  - Selected images
  - User authentication
  - Learning progress
  - Educational materials

### User Experience Considerations
- Smooth transitions between states
- Immediate feedback for user actions
- Simulated AI responses for demonstration
- Clear visual distinction between different types of messages
- Intuitive icons from Lucide React library

## Design System

### Color Palette
- Primary: Amber/Orange gradient for branding and primary actions
- Neutral: Stone/Gray for UI elements, varying based on theme
- Functional: Blue for system messages, Red for destructive actions

### Typography
- Sans-serif font family
- Varied font weights for visual hierarchy
- Responsive text sizing

### UI Components
- Rounded buttons and input fields
- Card-based layout for the chat interface
- Avatar representation for the AI tutor
- Flag icons for language selection

## User Account Types

The platform supports two types of user accounts with different permissions and capabilities:

### Admin Accounts
- **Capabilities**:
  - Manage educational materials (upload, edit, delete PDFs)
  - Organize subjects and their hierarchical structure
  - View all user information and learning activities
  - Access analytics dashboards for platform usage
  - Manage user accounts (create, suspend, delete)
  - Configure system settings

### Student Accounts
- **Capabilities**:
  - Enroll in subjects
  - Interact with AI Tutor via text or voice
  - Access educational materials (PDFs)
  - Track personal learning progress
  - Set and monitor learning goals
  - View achievements and milestones

## Text-to-Speech Integration

The platform includes a comprehensive Text-to-Speech (TTS) system to complement the existing Speech-to-Text functionality:

### TTS Implementation Options

1. **Open-Source Solution**
   - Self-hosted TTS system
   - No usage costs
   - Full control over deployment
   - Privacy (no data sent to external services)

2. **ElevenLabs API Integration**
   - Commercial API with high-quality, natural-sounding voices
   - Superior voice quality and naturalness
   - Wide range of voice options
   - Regular improvements without maintenance overhead

3. **Hybrid Approach (Recommended)**
   - Provider-agnostic interface that can switch between options
   - Fallback options if one system is unavailable
   - Tiered service levels (basic voices free, premium voices paid)
   - Flexibility to change providers as technology evolves

### Voice Customization
- Voice selection from available options
- Speed and pitch adjustments
- User voice preferences stored in profile

## API Documentation

The AI Tutor Platform provides a comprehensive RESTful API for integration with other systems. All API endpoints are versioned to ensure backward compatibility.

### Authentication

```
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### User Management

```
GET /api/v1/users
GET /api/v1/users/{id}
PUT /api/v1/users/{id}
DELETE /api/v1/users/{id}
GET /api/v1/users/{id}/progress
```

### Learning Path

```
GET /api/v1/subjects
GET /api/v1/subjects/{id}
POST /api/v1/subjects/{id}/enroll
GET /api/v1/progress
GET /api/v1/achievements
```

### Sources

```
GET /api/v1/materials
GET /api/v1/materials/{id}
POST /api/v1/materials
PUT /api/v1/materials/{id}
DELETE /api/v1/materials/{id}
GET /api/v1/materials/search?q={query}
```

### AI Tutor

```
POST /api/v1/chat/message
GET /api/v1/chat/history
POST /api/v1/chat/voice
GET /api/v1/chat/voices
```

For detailed API documentation, refer to the [API Reference](https://github.com/yourusername/ai-tutor-platform/wiki/API-Reference) in the project wiki.

## Contributing

We welcome contributions to the AI Tutor Platform! Here's how you can help:

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow the Rust style guide for backend code
- Use ESLint and Prettier for frontend code
- Write tests for new features
- Update documentation for changes

### Reporting Issues

- Use the GitHub issue tracker to report bugs
- Include detailed steps to reproduce the issue
- Mention your environment (OS, browser, etc.)

For more information, see the [Contributing Guide](https://github.com/yourusername/ai-tutor-platform/blob/main/CONTRIBUTING.md).

## Potential Future Enhancements
- Mobile application development
- Advanced AI capabilities (personalized learning paths)
- Integration with third-party educational platforms
- Expanded language support
- Real-time collaboration features
- Gamification elements
- Extended analytics and reporting

This AI Tutor platform represents a modern approach to educational technology, leveraging artificial intelligence to provide personalized learning experiences in a user-friendly, accessible interface.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the AI capabilities
- ElevenLabs for text-to-speech technology
- The Rust and Svelte communities for excellent tools and frameworks
- All contributors who have helped shape this project
