## NarrativeOps
ET AI Hackathon 2026 | Track 1: AI for Enterprise Content Operations

NarrativeOps is an AI-powered editorial pipeline that takes a brief, generates enterprise-ready content, runs compliance checks, localizes outputs for Hindi audiences, formats channel-specific variants, and pauses for human approval before publishing, while persisting outputs, feedback, and audit trails for continuous improvement.

## Architecture
- Frontend: React + Vite on Vercel
- Backend: FastAPI + LangGraph on Render (NOT Vercel — see note below)
- Database: Supabase
- LLMs: Groq (Llama 3.3 70B + Llama 3.1 8B) — free, no credit card

Note: The backend cannot run on Vercel free tier because the pipeline takes 60-120 seconds
and Vercel's free serverless function timeout is 10 seconds.

## Local Development

### Prerequisites
Python 3.11+, Node 20+, Groq API keys (2 accounts), Supabase project, Google AI Studio key

### Backend
```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env
# Fill in .env with your keys
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd web
npm install
npm run dev
```

### Running tests
```bash
# Backend unit tests (no API quota used)
cd api && pytest tests/ -m "not integration" -v

# Backend integration tests (uses Groq API quota)
cd api && pytest tests/ -m integration -v -s

# Frontend tests
cd web && npm test
```

## Deployment
- Backend: Push to GitHub -> Render auto-deploys
- Frontend: Push to GitHub -> Vercel auto-deploys

## Environment Variables
See .env.example for all required variables.
