# OfferCheck

Upload your resume. Get AI-powered feedback specialized for software engineer roles at big tech companies (Google, Meta, Amazon, Apple, Microsoft, Netflix).

**Live:** https://offercheck-five.vercel.app

## What it does

- Upload a PDF or DOCX resume (up to 5 MB)
- AI agent analyzes it across impact signals, ATS compatibility, big tech alignment, and section quality
- Returns a score (0–100), strengths, priority fixes, ATS warnings, and per-section notes

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| AI Agent | [Strands Agents](https://strandsagents.com) + Claude Sonnet via Anthropic API |
| Rate limiting | Upstash Redis — 10 requests/day per IP |
| Hosting | Vercel (frontend) · Railway (backend) |

## Local development

**Prerequisites:** Node.js 18+, Python 3.12, Vercel CLI

```bash
# Clone
git clone https://github.com/isaramirezb/offercheck.git
cd offercheck

# Backend env
cp backend/.env.example backend/.env   # fill in keys
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Frontend env
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > frontend/.env.local

# Run both
vercel dev --listen 3000
```

## Environment variables

### Backend (Railway)
| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `RATE_LIMIT_ALLOWLIST` | Comma-separated IPs that bypass rate limiting |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |

### Frontend (Vercel)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Public URL of the Railway backend |
