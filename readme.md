# 🎓 AI Tutor Platform

> An intelligent tutoring platform with document processing, OCR, and interactive chat capabilities

## Overview

AI Tutor Platform is a modern web application designed to provide an interactive learning experience. The platform features document processing with OCR capabilities, user authentication, and an interactive chat interface with voice capabilities.

## ✨ Features

- **Document Processing** – Upload and process various document types
  - Multiple OCR engines (Tesseract, EasyOCR, PdfJS)
  - Automatic document classification
  - PDF text extraction
  - Image preprocessing

- **User Authentication** – Secure login and registration
  - Role-based access control
  - Session management

- **Interactive Chat** – Engage with the AI tutor
  - Voice chat with animated Cat Avatar
  - Context-aware responses
  - Multi-language support
  - Session-based memory for continuous conversations

- **SOLID Architecture** – Maintainable and extensible codebase
  - Interface-based design
  - Dependency injection
  - Factory patterns

## 🏗️ Architecture

The application has been refactored to follow SOLID design principles:

### Single Responsibility Principle (SRP)
- Each class has only one reason to change
- Example: `TesseractOCR` focuses solely on OCR operations

### Open/Closed Principle (OCP)
- Software entities are open for extension but closed for modification
- Example: `OCREngineFactory` creates engines based on document type

### Liskov Substitution Principle (LSP)
- Subtypes are substitutable for their base types
- Example: All OCR engines implement the `IOCREngine` interface

### Interface Segregation Principle (ISP)
- Clients only depend on methods they use
- Example: Focused interfaces like `IOCREngine`, `IDocumentClassifier`

### Dependency Inversion Principle (DIP)
- High-level modules depend on abstractions
- Example: `DIContainer` for dependency injection

## 🧠 Session Memory

The platform features a session-based memory system that maintains context throughout user conversations:

### Key Capabilities

- **Conversation Persistence** – Maintains the full history of interactions within a session
- **Document Memory** – Remembers previously uploaded and processed documents
- **Context-Aware Responses** – AI responses consider previous questions and documents
- **Follow-up Questions** – Users can ask follow-up questions about previously uploaded documents

### Implementation

- **In-Memory Session Storage** – Stores session data during runtime
- **Session Factory** – Creates and manages session instances
- **Session Storage Adapter** – Integrates with document processing and chat services
- **Future-Ready Design** – Architecture supports future integration with user authentication

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:GaikaGroup/CI.git
   cd CI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:5173](http://localhost:5173) in your browser

## 📂 Project Structure

```
src/
├── lib/
│   ├── modules/
│   │   ├── auth/            # Authentication module
│   │   ├── chat/            # Chat and voice interface
│   │   ├── document/        # Document processing and OCR
│   │   ├── i18n/            # Internationalization
│   │   ├── navigation/      # Navigation components
│   │   ├── session/         # Session-based memory
│   │   └── theme/           # Theming and styling
│   ├── shared/
│   │   ├── di/              # Dependency injection
│   │   └── utils/           # Utility functions
│   └── stores/              # Svelte stores
├── routes/                  # SvelteKit routes
└── app.html                 # HTML template
```

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm test
```

## 🔧 Troubleshooting

### Cat Avatar Cache Issues

If you're not seeing the updated Cat Avatar in Voice Chat mode:

1. Visit [http://localhost:5173/clear-cache](http://localhost:5173/clear-cache)
2. Follow the instructions to clear your cache and reload

For detailed instructions, see [README-CACHE.md](README-CACHE.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Branching strategy
- Commit message format
- Pull request process
- Code style and standards

## 📚 Documentation

Additional documentation:

- [SOLID Refactoring Summary](SOLID_REFACTORING_SUMMARY.md) - Details on the SOLID principles implementation
- [Changelog](CHANGELOG.md) - Version history and changes
