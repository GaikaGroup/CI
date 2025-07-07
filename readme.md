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
- [Contributing](#contributing)
- [License](#license)

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
- **Voice Chat**: Simulated voice-based interaction

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

## Project Structure

The frontend follows a modular architecture with clear separation of concerns:

```
src/
├── app.html            # HTML template
├── app.css             # Global styles with Tailwind CSS
├── routes/             # SvelteKit routes
│   ├── +layout.svelte  # Main layout with navigation
│   ├── +page.svelte    # Main page with chat interface
├── lib/
│   ├── modules/        # Functional modules
│   │   ├── auth/       # Authentication module
│   │   ├── chat/       # Chat interface module
│   │   ├── i18n/       # Internationalization module
│   │   ├── theme/      # Theme management module
│   │   └── navigation/ # Navigation components
│   ├── shared/         # Shared components and utilities
│   └── stores/         # Application-wide stores
└── static/             # Static assets
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

3. **Mock Functionality**:
   - Authentication is simulated with mock users
   - AI responses are simulated with predefined messages
   - Voice recording is simulated without actual audio processing

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
- All contributors who have helped shape this project
