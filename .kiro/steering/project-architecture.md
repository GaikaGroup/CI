---
inclusion: always
---

# AI Tutor Platform - Project Architecture

## Tech Stack

**Frontend:** SvelteKit + Vite + Tailwind CSS  
**Backend:** Node.js + Prisma + PostgreSQL  
**AI:** OpenAI API + Ollama (local LLM)  
**Testing:** Vitest + Testing Library

## Key Modules

### Authentication (`src/lib/modules/auth/`)

- User authentication with sessions
- Admin and regular user roles
- Protected routes via `hooks.server.js`

### Chat System (`src/lib/modules/chat/`)

- Voice interaction with Whisper (STT) and TTS
- Animated cat avatar with lip-sync
- Waiting phrases during AI processing
- Multilingual support (EN, RU, ES)

### Course Management (`src/lib/modules/courses/`)

- Course creation and enrollment
- GraphRAG for document processing
- Agent-based tutoring system
- Material assignments per agent

### Document Processing (`src/lib/modules/document/`)

- OCR with Tesseract.js
- Vision API (GPT-4o) for images
- PDF processing
- GraphRAG knowledge graph creation

### LLM Providers (`src/lib/modules/llm/`)

- OpenAI API integration
- Ollama local models
- Automatic fallback system
- Provider switching in dev mode

## Important Patterns

### Module Structure

```
module/
├── components/     # Svelte UI components
├── services/       # Business logic
├── stores/         # Svelte stores for state
└── utils/          # Helper functions
```

### API Routes

- All API endpoints in `src/routes/api/`
- Use `+server.js` for API handlers
- Return JSON with `{ success, data/error }` pattern

### Database Access

- Use Prisma ORM exclusively
- Repositories in `src/lib/database/repositories/`
- Never write raw SQL unless absolutely necessary

### State Management

- Svelte stores for global state
- Component-level state for UI
- Session storage for temporary data

## Code Style

- Use ES6+ features (async/await, destructuring)
- Prefer functional programming patterns
- Keep components small and focused
- Write descriptive variable names
- Add JSDoc comments for complex functions

## Testing Requirements

- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test voice features thoroughly
- Mock external APIs (OpenAI, Ollama)
