# AI Story Writing Practice App

> Write. Get Feedback. Improve.

A practice app where you write stories, AI evaluates them from three perspectives (English Teacher, Story Editor, Director), and you learn to write better.

## Architecture

```
React + Vite + TypeScript (Frontend)
        ↕
Node + Express + TypeScript (Backend)
        ↕               ↕
PostgreSQL          Python + FastAPI (AI Service)
                         ↕
                    Ollama (Local LLM)
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Python >= 3.10
- PostgreSQL 16
- Ollama

### Setup

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start development
npm run dev
```

## Project Structure

```
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Node + Express backend
├── services/
│   └── ai/           # Python + FastAPI AI service
└── packages/
    └── shared-types/  # Shared TypeScript types
```

## Development Phases

- **Phase 1**: Writing Core (Challenge → Write → Submit → Summary)
- **Phase 2**: AI Integration (English Teacher analysis)
- **Phase 3+**: Story Editor, Director, Scoring, Profile, Revision, Progress
