# SvelteKit Frontend Implementation

This directory contains the SvelteKit frontend implementation of the AI Tutor Platform. This implementation follows the modular architecture described in the main README.md file and provides a user interface for interacting with the AI tutor.

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

## Features Implemented

- **Multilingual Support**: English, Russian, and Spanish
- **Dual Communication Modes**: Text chat and voice chat
- **Theme Toggle**: Light and dark mode
- **Responsive Design**: Works on mobile and desktop
- **Modular Architecture**: Clear separation of concerns
- **Authentication**: Mock implementation of user authentication

## Running the Frontend

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies
```bash
npm install
```

2. Start the development server
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
npm run build
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

3. **Component Hierarchy**:
   - Shared components (Button, Avatar, Modal) are reusable across modules
   - Module-specific components are contained within their respective modules
   - The main ChatInterface component combines components from different modules

4. **Mock Functionality**:
   - Authentication is simulated with mock users
   - AI responses are simulated with predefined messages
   - Voice recording is simulated without actual audio processing

## Integration with Backend

To connect this frontend to the backend described in the main README.md:

1. Update the API endpoints in `src/lib/shared/utils/constants.js`
2. Implement actual API calls in the service files of each module
3. Replace mock authentication with real JWT authentication
4. Implement WebSocket connection for real-time chat

## Technology Stack

- **Frontend Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Icons**: Lucide Svelte
- **State Management**: Svelte stores
- **Build Tools**: Vite