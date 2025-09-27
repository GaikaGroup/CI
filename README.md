# AI Tutor Platform

## Overview

AI Tutor Platform is a SvelteKit-based web application that demonstrates how modern language models, speech tools and computer vision can come together to build an engaging learning assistant. The project offers both text and voice chat modes, understands documents and images, and can run on either cloud models such as OpenAI or locally hosted models via [Ollama](https://github.com/ollama/ollama).

This README is split into two parts:

1. **Product summary** – high level description aimed at product owners.
2. **Developer guide** – technical information for engineers who want to explore or extend the codebase.

---

## 1. Product Summary

- **Conversational tutoring** – learners interact with an AI tutor that keeps track of the conversation and previously uploaded materials to provide contextual answers.
- **Voice experience** – the app converts speech to text, speaks the response back, and shows an animated cat avatar that lip-syncs and displays emotions. While the tutor thinks, it plays a friendly “waiting phrase” so the student knows something is happening.
- **Document understanding** – students can attach pictures or PDFs of their assignments. Optical Character Recognition (OCR) extracts the text so the AI can refer to it in explanations.
- **Multi-language interface** – user interface strings are available in English, Russian and Spanish, making the tutor approachable to a wider audience.
- **Flexible AI providers** – the tutor can run completely locally for privacy and cost savings or fall back to OpenAI’s API when more capability is required.

These features make the project a strong starting point for experimenting with AI-enhanced education tools, proof-of-concepts or bespoke tutoring products.

---

## 2. Developer Guide

### Technology Stack

- [SvelteKit](https://kit.svelte.dev/) for the web application framework
- [Vite](https://vitejs.dev/) for development and building
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro) for unit, integration and e2e tests
- Optional local LLM support through [Ollama](https://ollama.ai)

### Key Features and Architecture

#### Modular LLM Provider System

A provider manager selects between OpenAI and local Ollama models, enabling fallback and provider switching in development.

#### GraphRAG Architecture

The platform implements a foundational GraphRAG (Graph Retrieval-Augmented Generation) system with the following components:

**Core Services:**

- `GraphRAGService`: Main service for creating and querying knowledge graphs from documents
- `DocumentGraphRAGProcessor`: Extends document processing to integrate GraphRAG capabilities
- `AgentContextManager`: Manages agent-specific context and material access with GraphRAG integration

**Knowledge Graph Structure:**

- **Nodes**: Represent chunks of processed document content with metadata
- **Relationships**: Connect related content both within and across documents
- **Embeddings**: Placeholder for vector representations (ready for integration with embedding models)
- **Material Assignments**: Control which agents can access which materials

**Processing Flow:**

1. Documents uploaded → OCR/text extraction
2. Content chunked → Knowledge graph nodes created
3. Relationships established → Cross-material connections identified
4. User queries → Relevant content retrieved → Agent responses augmented

**Extensibility:**
The current implementation provides a solid foundation that can be extended with:

- Real vector embedding models (currently uses placeholder embeddings)
- Advanced entity extraction and relationship detection
- Integration with vector databases for production-scale deployment
- Semantic similarity search instead of keyword-based matching

#### Admin Finance Dashboard

Administrators can review per-model usage counts and estimated OpenAI spend on the Finance page. Usage metrics are stored in-memory inside the application server; restart events clear the history. For production deployments consider persisting these aggregates to a database or analytics warehouse to avoid data loss.

OpenAI costs are calculated using the official [per-million token pricing](https://openai.com/api/pricing/) (e.g. \$0.50 per 1M prompt tokens and \$1.50 per 1M completion tokens for `gpt-3.5-turbo-0125`). Totals are tracked and displayed to eight decimal places so even micro-dollar spending is visible to administrators.

#### Voice Mode

Speech-to-text uses the OpenAI Whisper API, while text-to-speech uses the OpenAI TTS API (or a simulated response in development). The animated cat avatar with lip-syncing and emotion detection is documented in `docs/cat-avatar-implementation.md`.

#### Document Processing & RAG (Retrieval-Augmented Generation)

The platform implements a sophisticated GraphRAG system for intelligent document processing and knowledge retrieval:

**Document Processing Pipeline:**

- Uploaded images or PDFs are classified, preprocessed and sent through configurable OCR engines
- Recognized text is processed through the GraphRAG system to create knowledge graphs
- Documents are chunked into smaller pieces for better retrieval and processing
- Each chunk is converted into nodes in a knowledge graph with relationships

**GraphRAG Knowledge System:**

- **Knowledge Graph Creation**: Documents are processed to extract entities and create interconnected knowledge graphs per subject/course
- **Intelligent Chunking**: Content is split into manageable chunks (500 characters) with semantic boundaries
- **Relationship Mapping**: The system creates relationships between document chunks, both within documents and across different materials
- **Vector Embeddings**: Each chunk gets embedded for semantic similarity search (placeholder implementation ready for real embedding models)
- **Cross-Material Relationships**: The system identifies and creates relationships between similar content across different uploaded materials

**Agent Context Integration:**

- Each AI agent has access to relevant materials based on assignments and permissions
- When users ask questions, the system queries the knowledge graph to find relevant information
- Agent responses are augmented with contextual information from the knowledge base
- Conversation history is maintained per agent for better context understanding

**Query and Retrieval:**

- Simple keyword-based search with scoring and ranking (extensible to vector similarity)
- Results are limited and ranked by relevance to prevent information overload
- Supports real-time updates when materials are modified or deleted
- Fallback mechanisms ensure the system works even without GraphRAG processing

#### Internationalisation

All interface strings live in `src/lib/modules/i18n/translations.js` with helpers to fetch the correct language.

#### Waiting Phrases

While the AI prepares a response, short phrases are displayed and synthesized sentence by sentence for a smooth user experience.

### Project Structure

```
├── docs/                  Additional documentation (cat avatar, waiting phrases…)
├── src/
│   ├── lib/
│   │   ├── config/        API and LLM configuration
│   │   ├── modules/       Feature modules (auth, chat, document, llm, session…)
│   │   │   ├── subjects/  Subject/course management with GraphRAG
│   │   │   │   └── services/
│   │   │   │       ├── GraphRAGService.js              # Core GraphRAG functionality
│   │   │   │       ├── DocumentGraphRAGProcessor.js    # Document processing with RAG
│   │   │   │       └── AgentContextManager.js          # Agent context with RAG integration
│   │   │   ├── courses/   Course management (refactored from subjects)
│   │   │   │   └── services/
│   │   │   │       ├── GraphRAGService.js              # Course-specific GraphRAG
│   │   │   │       └── DocumentGraphRAGProcessor.js    # Course document processing
│   │   │   └── chat/      Chat interface and components
│   │   ├── shared/        DI container, utilities and UI components
│   │   └── stores/        Global Svelte stores
│   ├── routes/            SvelteKit routes and API endpoints
│   └── app.html/css       Application entry points
└── tests/                 Unit, integration and e2e tests
```

### Prerequisites / System Requirements

- **Node.js**: version 18 or later
- **npm**: version 9 or later
- **Optional local models**: [Ollama](https://ollama.ai) running locally (8 GB RAM recommended)
- **Browsers**: recent Chrome, Firefox, Safari or Edge
- **Audio hardware**: microphone and speakers for voice mode

### Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Copy environment template**

   ```bash
   cp .env.example .env
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Build for production preview**

   ```bash
   npm run build
   npm run preview
   ```

### Installation Troubleshooting

- Use the required Node version (`node -v`) if `npm install` fails
- Run `npm cache clean --force` and reinstall if dependency resolution errors appear
- Ensure `VITE_OPENAI_API_KEY` is set to avoid 401 errors from OpenAI
- If Ollama is unreachable, verify it is running and matches `VITE_OLLAMA_API_URL`

### Configuration

| Variable                           | Description                         | Default                   | Required |
| ---------------------------------- | ----------------------------------- | ------------------------- | -------- |
| `VITE_OPENAI_API_KEY`              | OpenAI key for LLM, Whisper and TTS | –                         | **Yes**  |
| `VITE_DEFAULT_LLM_PROVIDER`        | `openai` or `ollama`                | `ollama`                  | No       |
| `VITE_ENABLE_LOCAL_LLM`            | Enable local model usage            | `true`                    | No       |
| `VITE_ENABLE_LLM_FALLBACK`         | Fall back to OpenAI if local fails  | `true`                    | No       |
| `VITE_ENABLE_PROVIDER_SWITCHING`   | Allow switching in UI               | `false` (true in dev)     | No       |
| `VITE_LLM_FALLBACK_TIMEOUT`        | ms before provider fallback         | `10000`                   | No       |
| `VITE_OLLAMA_API_URL`              | Ollama endpoint                     | `http://127.0.0.1:11434`  | No       |
| `VITE_OLLAMA_MODELS`               | Comma list of Ollama models         | `qwen2.5:1.5b,qwen2.5:7b` | No       |
| `VITE_OLLAMA_MODEL`                | Single model (legacy)               | first of MODELS           | No       |
| `VITE_OLLAMA_MAX_TOKENS`           | Max tokens from Ollama              | `256`                     | No       |
| `VITE_OLLAMA_TEMPERATURE`          | Sampling temperature                | `0.7`                     | No       |
| `VITE_OLLAMA_NUM_CTX`              | Context window tokens               | `2048`                    | No       |
| `VITE_OLLAMA_STRICT`               | Restrict to MODELS list             | `true`                    | No       |
| `VITE_OLLAMA_REPEAT_PENALTY`       | Repetition penalty                  | `1.1`                     | No       |
| `VITE_OLLAMA_TOP_P`                | Nucleus sampling parameter          | `0.9`                     | No       |
| `VITE_OLLAMA_TOP_K`                | Top-k sampling size                 | `40`                      | No       |
| `VITE_LLM_MEMORY_THRESHOLD`        | MB before switching to cloud        | `2048`                    | No       |
| `VITE_LLM_CPU_THRESHOLD`           | CPU load threshold                  | `0.95`                    | No       |
| `VITE_LLM_RESOURCE_CHECK_INTERVAL` | Resource check ms                   | `5000`                    | No       |
| `VITE_OPENAI_MODEL`                | OpenAI model                        | `gpt-3.5-turbo`           | No       |
| `VITE_OPENAI_MAX_TOKENS`           | Tokens for OpenAI replies           | `500`                     | No       |
| `VITE_OPENAI_DETAILED_MAX_TOKENS`  | Tokens for detailed replies         | `4000`                    | No       |
| `VITE_OPENAI_TEMPERATURE`          | OpenAI sampling temperature         | `0.7`                     | No       |
| `VITE_OPENAI_MAX_RETRIES`          | API retry attempts                  | `3`                       | No       |
| `VITE_OPENAI_RETRY_DELAY`          | Delay between retries (ms)          | `1000`                    | No       |
| `VITE_OPENAI_TIMEOUT`              | Request timeout ms                  | `30000`                   | No       |
| `VITE_WAITING_PHRASES_DEFAULT`     | ID of default waiting phrase        | `DefaultWaitingAnswer`    | No       |
| `VITE_WAITING_PHRASES_DETAILED`    | ID for detailed waiting phrase      | `DetailedWaitingAnswer`   | No       |

Example `.env`:

```bash
VITE_OPENAI_API_KEY=your-api-key
VITE_DEFAULT_LLM_PROVIDER=ollama
VITE_ENABLE_LOCAL_LLM=true
VITE_ENABLE_LLM_FALLBACK=true
VITE_ENABLE_PROVIDER_SWITCHING=false
VITE_LLM_FALLBACK_TIMEOUT=10000

VITE_OLLAMA_API_URL=http://127.0.0.1:11434
VITE_OLLAMA_MODELS=qwen2.5:1.5b,qwen2.5:7b
VITE_OLLAMA_MAX_TOKENS=256
VITE_OLLAMA_TEMPERATURE=0.7
VITE_OLLAMA_NUM_CTX=2048
VITE_OLLAMA_STRICT=true
VITE_OLLAMA_REPEAT_PENALTY=1.1
VITE_OLLAMA_TOP_P=0.9
VITE_OLLAMA_TOP_K=40

VITE_LLM_MEMORY_THRESHOLD=2048
VITE_LLM_CPU_THRESHOLD=0.95
VITE_LLM_RESOURCE_CHECK_INTERVAL=5000

VITE_OPENAI_MODEL=gpt-3.5-turbo
VITE_OPENAI_MAX_TOKENS=500
VITE_OPENAI_DETAILED_MAX_TOKENS=4000
VITE_OPENAI_TEMPERATURE=0.7
VITE_OPENAI_MAX_RETRIES=3
VITE_OPENAI_RETRY_DELAY=1000
VITE_OPENAI_TIMEOUT=30000
VITE_WAITING_PHRASES_DEFAULT=DefaultWaitingAnswer
VITE_WAITING_PHRASES_DETAILED=DetailedWaitingAnswer
```

### Usage Examples

- **Text chat** – open the app and type a question to start a conversation
- **Voice chat** – click the microphone button, speak your question and listen to the tutor's spoken reply
- **Document upload** – attach an image or PDF via the paperclip icon; recognized text is processed through GraphRAG and becomes part of the knowledge base
- **Knowledge-enhanced responses** – ask questions about uploaded materials; the AI will retrieve relevant information from the knowledge graph to provide contextual answers
- **Multi-document queries** – upload multiple related documents; the system will find connections between them and provide comprehensive answers drawing from all materials

### API Documentation

_To be documented in a future update._

### Deployment Guide

1. Ensure required environment variables are set as in `.env`
2. Build the application

   ```bash
   npm run build
   ```

3. Run the production server (uses `adapter-auto`)

   ```bash
   node build
   ```

4. For previewing locally

   ```bash
   npm run preview
   ```

### Testing & Quality

- **Unit/Integration tests**

  ```bash
  npm test          # run auth tests
  npm run test:run  # run entire test suite
  ```

- **Lint selected files**

  ```bash
  npm run lint
  ```

### Performance & Limitations

- File uploads are limited to 10 MB and common image/PDF formats
- Local LLM models should be small enough for available RAM (8 GB machines are assumed)
- Throughput depends on external APIs; concurrent users are limited by server resources

### Security Considerations

_Security best practices and threat models will be documented later._

### Changelog / Version History

See [CHANGELOG.md](CHANGELOG.md) for full release notes.

### FAQ / Troubleshooting

- **App fails to start** – reinstall dependencies and verify Node version
- **OCR results are poor** – ensure the image is clear and under 10 MB
- **No response from tutor** – check network connectivity and API keys, or disable local provider to force OpenAI
- **Debugging** – run `npm run dev` and inspect browser console or server output for logs

### Architecture Diagrams

```mermaid
flowchart LR
    user((User)) -->|web UI| svelte[SvelteKit App]
    svelte -->|API calls| provider[LLM Provider Manager]
    provider -->|local| ollama[Ollama]
    provider -->|cloud| openai[OpenAI]
    svelte --> doc[Document Pipeline]
    doc --> ocr[OCR Engines]
    doc --> graphrag[GraphRAG Service]
    graphrag --> kg[Knowledge Graph]
    kg --> agents[Agent Context Manager]
    agents --> svelte
```

**GraphRAG Data Flow:**

```mermaid
flowchart TD
    upload[Document Upload] --> ocr[OCR Processing]
    ocr --> chunk[Text Chunking]
    chunk --> nodes[Create Graph Nodes]
    nodes --> relations[Build Relationships]
    relations --> kg[Knowledge Graph Storage]

    query[User Query] --> search[Knowledge Search]
    search --> kg
    kg --> relevant[Relevant Content]
    relevant --> context[Agent Context]
    context --> llm[LLM Response]
    llm --> user[Enhanced Answer]
```

### Additional Documentation

Further design notes and troubleshooting guides live in the `docs/` folder:

- `cat-avatar-implementation.md` – animated avatar and lip-sync feature
- `waiting-phrases.md` and `waiting-phrases-troubleshooting.md` – configuration for the “waiting” messages

### GraphRAG Implementation Details

The platform's GraphRAG system is designed as a foundational implementation that can be extended with production-ready components:

**Current Implementation:**

- **Knowledge Graph Storage**: In-memory storage using Maps (suitable for development and small deployments)
- **Text Chunking**: Simple sentence-based chunking with configurable size limits (500 characters default)
- **Relationship Detection**: Basic sequential and keyword-based relationship creation
- **Query System**: Keyword matching with relevance scoring and ranking
- **Embeddings**: Placeholder random vectors (ready for real embedding model integration)

**Production Readiness Path:**

- Replace in-memory storage with persistent vector databases (Pinecone, Weaviate, etc.)
- Integrate real embedding models (OpenAI embeddings, sentence-transformers, etc.)
- Implement advanced entity extraction and relationship detection
- Add semantic similarity search using vector operations
- Scale to handle larger document collections and concurrent users

**Key Classes:**

- `GraphRAGService`: Core knowledge graph operations and querying
- `DocumentGraphRAGProcessor`: Document processing pipeline with GraphRAG integration
- `AgentContextManager`: Agent-specific context management with material access control

The modular design allows for incremental upgrades from the current foundational implementation to a production-scale GraphRAG system.

### Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for coding guidelines and workflow.

### License

This project is released under the [MIT License](LICENSE).

Happy teaching!
