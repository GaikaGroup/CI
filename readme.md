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
- [Image Recognition Implementation](#image-recognition-implementation)
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

### 6. Image Recognition and OCR

- Upload and analyze images directly in chat
- Advanced OCR (Optical Character Recognition) for text extraction
- Adaptive image preprocessing for improved recognition
- Multi-approach text recognition with intelligent selection
- Seamless integration with chat context

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
- **OCR Engine**: Tesseract.js for text recognition in images
- **Image Processing**: Browser-based adaptive preprocessing pipeline
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
│   │   │   ├── enhancedServices.js  # OCR-enhanced chat services
│   │   ├── document/    # Document processing module
│   │   │   ├── engines/  # OCR engines (Tesseract)
│   │   │   ├── OCRService.js  # OCR service with memory
│   │   │   ├── ClientDocumentProcessor.js  # Client-side document processing
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

4. **Image Recognition and OCR**:
   - Client-side OCR processing using Tesseract.js
   - Enhanced preprocessing pipeline with adaptive techniques
   - Intelligent approach selection based on image characteristics
   - OCR memory system for maintaining context across conversations
   - Seamless integration with the chat interface

## Image Recognition Implementation

The Image Recognition feature allows users to upload images directly in the chat interface for analysis and text extraction. The implementation includes:

### Key Components

1. **Enhanced Tesseract OCR Engine**: A highly optimized implementation of Tesseract.js with improved preprocessing and recognition capabilities
2. **Adaptive Image Processing**: Intelligent image analysis and preprocessing pipeline that adapts to different image types and characteristics
3. **Multi-Approach Recognition**: Multiple recognition strategies with different parameters to maximize text extraction accuracy
4. **OCR Memory System**: Storage and retrieval of OCR results to maintain context across conversations
5. **Chat Integration**: Seamless integration with the chat interface for a unified user experience

### Image Recognition Flow

1. User uploads an image through the chat interface
2. The image is processed client-side using the browser's capabilities
3. The system analyzes the image characteristics to determine optimal preprocessing
4. Multiple recognition approaches are attempted with different parameters
5. Results are scored based on confidence, length, and quality metrics
6. The best result is selected and post-processed for accuracy
7. The extracted text is stored in memory and included in the chat context
8. The AI receives both the user's question and the extracted text
9. The AI response incorporates understanding of the image content

### Technical Implementation

- **Client-Side Processing**: All OCR processing happens in the browser for privacy and reduced server load
- **Adaptive Preprocessing**: Images are analyzed and preprocessed using techniques like contrast enhancement, thresholding, sharpening, and noise reduction
- **Intelligent Approach Selection**: The system selects the best preprocessing and recognition approaches based on image characteristics
- **Enhanced Post-Processing**: Advanced text cleaning and correction for improved accuracy
- **Memory Integration**: OCR results are stored with metadata and associated with specific messages for context

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
2. **Enhanced Lip Sync Animation**: The cat's mouth movements are synchronized with the audio playback, with a variety of mouth positions for different sounds (a, e, o, b, ch, j, m, p, r, s, sh, w), creating a natural and expressive speaking effect
3. **Smooth Transitions**: Implements smooth transitions between phrases and emotions to create a more natural and engaging experience
4. **Idle Animation**: Subtle breathing animation when not speaking to make the avatar appear more lifelike

#### Technical Implementation

- **Image-Based Approach**: Uses static cat emotion images and mouth position overlays instead of canvas manipulation for better performance
- **Audio Analysis**: Real-time analysis of audio amplitude to drive mouth animations with intelligent selection of appropriate mouth positions
- **Enhanced Variety**: Implements a variety of mouth positions for different sounds, with randomization for more natural and varied speech
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

### Image Recognition Pipeline

```
User Image Upload → Image Processing → Tesseract OCR Engine →
Multiple Recognition Approaches → Best Result Selection →
OCR Memory Storage → Enhanced Chat Context → AI Response with Image Understanding
```

1. **Image Upload Pipeline**:
   - User uploads image(s) through the chat interface
   - Images are converted to processable format
   - System adds a placeholder message indicating processing

2. **OCR Processing Pipeline**:
   - Images are analyzed to determine optimal preprocessing approach
   - Adaptive preprocessing enhances image quality for text recognition
   - Multiple recognition approaches are tried with different parameters
   - Results are scored based on confidence, length, and quality metrics
   - Best result is selected and post-processed for accuracy

3. **Memory Integration Pipeline**:
   - OCR results are stored in memory with metadata
   - Results are associated with specific messages
   - Previous OCR results are maintained for context
   - OCR context is built and included with future messages

4. **Enhanced Response Pipeline**:
   - Chat messages include OCR context from current and previous images
   - AI receives both the user's question and the extracted text
   - AI response incorporates understanding of image content
   - User receives contextually relevant answers about uploaded images

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
- [Max Kanevskiy](https://www.linkedin.com/in/kanevskiy/) - Project Author
