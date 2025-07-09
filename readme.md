# AI Tutor Platform

## Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Frontend](#running-the-frontend)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [Implementation Notes](#implementation-notes)
- [Voice Chat Implementation](#voice-chat-implementation)
- [Pipeline Architecture](#pipeline-architecture)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Project Overview

The AI Tutor Platform is a frontend prototype built with SvelteKit that demonstrates a user interface for interacting with an AI tutor. This implementation follows a modular architecture with clear separation of concerns, providing a foundation for a comprehensive educational technology solution.

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository using SSH
git clone git@github.com:GaikaGroup/CI.git
cd CI

# Install dependencies
npm install
```

> **Note:** This project uses SSH for GitHub authentication. If you haven't set up SSH for GitHub yet, please refer to the [GitHub SSH Setup](#github-ssh-setup) section in the [CONTRIBUTING.md](CONTRIBUTING.md) file.

### Running the Frontend

#### Using the Shell Script

```bash
# Make sure the script is executable
chmod +x start-frontend.sh

# Run the script
./start-frontend.sh
```

#### Using npm Directly

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

By default, the frontend runs on port 3000 and automatically opens in your browser. You can access it at `http://localhost:3000`.

## Key Features

### 1. Multilingual Support

- Supports multiple languages (English, Russian, Spanish)
- Language selection with persistence in localStorage

### 2. Dual Communication Modes

- **Text Chat**: Traditional text-based messaging interface
- **Voice Chat**: Voice-based interaction with speech-to-text and text-to-speech capabilities
- **Animated Cat Avatar**: Expressive cat avatar with lip sync animation that responds to voice

### 3. Theme Toggle

- Light and dark mode support
- Theme preference saved in localStorage

### 4. Responsive Design

- Works on mobile and desktop devices
- Clean, modern user interface

### 5. Modular Architecture

- Clear separation of concerns
- Reusable components

## Technical Architecture

### Technology Stack

- **Frontend Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Icons**: Lucide Svelte
- **State Management**: Svelte stores
- **Build Tools**: Vite
- **Speech-to-Text**: OpenAI Whisper API
- **Text-to-Speech**: OpenAI TTS API
- **AI Chat**: OpenAI GPT API
- **Animation**: Svelte tweened stores for smooth transitions
- **Audio Analysis**: Web Audio API for real-time amplitude analysis

## Project Structure

The frontend follows a modular architecture with clear separation of concerns:

```
src/
├── app.html            # HTML template
├── app.css             # Global styles with Tailwind CSS
├── routes/             # SvelteKit routes
│   ├── +layout.svelte  # Main layout with navigation
│   ├── +page.svelte    # Main page with chat interface
│   ├── api/            # API endpoints for voice features
│       ├── transcribe/ # Speech-to-text API endpoint
│       ├── synthesize/ # Text-to-speech API endpoint
├── lib/
│   ├── modules/        # Functional modules
│   │   ├── auth/       # Authentication module
│   │   ├── chat/       # Chat interface module
│   │   │   ├── components/  # Chat UI components
│   │   │   ├── voiceServices.js  # Voice chat functionality
│   │   ├── i18n/       # Internationalization module
│   │   ├── theme/      # Theme management module
│   │   └── navigation/ # Navigation components
│   ├── shared/         # Shared components and utilities
│   │   ├── components/  # Shared UI components
│   │   │   ├── CatAvatar.svelte  # Animated cat avatar with lip sync
│   ├── config/         # Configuration files
│   │   ├── api.js      # API configuration
│   └── stores/         # Application-wide stores
└── static/             # Static assets
    ├── images/         # Image assets
    │   ├── cat/        # Cat avatar images for different emotions and mouth positions
```

## Implementation Notes

This implementation is a frontend prototype that demonstrates the UI and interactions. It includes:

1. **Modular Architecture**: Each functional area (auth, chat, i18n, theme, navigation) is separated into its own module with components, stores, and services.

2. **State Management**: Uses Svelte stores for managing application state, including:
   - Chat mode (text/voice)
   - Theme preference (dark/light)
   - Selected language
   - Message history
   - User authentication
   - Voice recording state
   - Speaking state and audio amplitude for cat avatar
   - Emotion detection for cat avatar expressions

3. **Mock Functionality**:
   - Authentication is simulated with mock users
   - AI responses are simulated with predefined messages if API keys are not provided

## Voice Chat Implementation

The Voice Chat feature enables users to interact with the AI tutor using speech instead of typing. The implementation includes:

### Key Components

1. **Speech-to-Text (STT)**: Uses OpenAI's Whisper API to convert user's speech to text
2. **Text-to-Speech (TTS)**: Uses OpenAI's TTS API to convert AI responses to speech
3. **Audio Recording**: Browser's MediaRecorder API for capturing user's voice
4. **Audio Playback**: HTML5 Audio API for playing synthesized speech

### Voice Chat Flow

1. User clicks the microphone button to start recording
2. Audio is captured using the browser's MediaRecorder API
3. When recording stops, the audio is sent to the Whisper API for transcription
4. The transcribed text is displayed in the chat and sent to the AI
5. The AI's response is displayed in the chat and sent to the TTS API
6. The synthesized speech is played back to the user

### Multilingual Support

The Voice Chat feature supports multiple languages:

- English
- Russian
- Spanish

The selected language is used for both speech recognition and speech synthesis to ensure a consistent experience.

### Cat Avatar with Lip Sync Animation

The platform features an expressive cat avatar that enhances the voice chat experience:

#### Key Features

1. **Emotion Detection**: The avatar displays different emotions (neutral, happy, surprised, sad, angry) based on the content of the AI's responses
2. **Lip Sync Animation**: The cat's mouth movements are synchronized with the audio playback, creating a natural speaking effect
3. **Smooth Transitions**: Implements smooth transitions between phrases and emotions to create a more natural and engaging experience
4. **Idle Animation**: Subtle breathing animation when not speaking to make the avatar appear more lifelike

#### Technical Implementation

- **Image-Based Approach**: Uses static cat emotion images and mouth position overlays instead of canvas manipulation for better performance
- **Audio Analysis**: Real-time analysis of audio amplitude to drive mouth animations
- **Emotion Persistence**: Maintains consistent emotions between phrases for a more natural experience
- **Phrase Queuing**: Intelligently manages multiple audio phrases to maintain speaking state between consecutive responses

## Pipeline Architecture

The AI Tutor Platform implements several processing pipelines to handle different aspects of the application:

### Voice Processing Pipeline

```
User Speech → MediaRecorder → Audio Blob → Whisper API → Transcribed Text →
Chat API → AI Response → Emotion Detection → TTS API → Audio Playback + Cat Avatar Animation
```

1. **Recording Pipeline**:
   - User initiates recording through the UI
   - Browser's MediaRecorder captures audio
   - Audio is stored as a Blob

2. **Transcription Pipeline**:
   - Audio Blob is sent to the `/api/transcribe` endpoint
   - The endpoint forwards the request to OpenAI's Whisper API
   - Transcribed text is returned to the client

3. **Response Pipeline**:
   - Transcribed text is sent to the AI model
   - AI generates a response
   - Response is displayed in the chat interface
   - Response text is analyzed for emotional content
   - Cat avatar's emotion is updated based on the analysis

4. **Synthesis Pipeline**:
   - AI response is sent to the `/api/synthesize` endpoint
   - The endpoint forwards the request to OpenAI's TTS API
   - Synthesized speech is returned and played to the user
   - Audio amplitude is analyzed in real-time
   - Cat avatar's mouth animations are synchronized with the audio

### Text Chat Pipeline

```
User Input → Chat API → AI Response → Display
```

The text chat follows a simpler pipeline where user input is directly sent to the AI model and the response is displayed in the chat interface.

## Contributing

We welcome contributions to the AI Tutor Platform! Please follow our Git workflow and best practices outlined in the [CONTRIBUTING.md](CONTRIBUTING.md) file. This includes:

- Branching strategy
- Commit message format
- Pull request process
- Code review guidelines
- Release process

Before submitting your changes, please ensure you've followed the pre-commit checklist in the contributing guide.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The Svelte and SvelteKit communities for excellent tools and frameworks
- Tailwind CSS for the styling framework
- Lucide for the icon library
- OpenAI for the Whisper and TTS APIs
- All contributors who have helped shape this project
- [Max Kanevskiy](https://www.linkedin.com/in/kanevskiy/) - Project Author
