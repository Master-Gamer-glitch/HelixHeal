# 🤖 AI Code-Fixing Agent

An autonomous bug-fixing AI agent powered by **AGNO + Gemini**, with a full **React dashboard** for live monitoring.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              React Dashboard                │
│  (Input → Summary → Score → Fixes → CI)    │
└────────────────┬────────────────────────────┘
                 │ POST /run-agent
┌────────────────▼────────────────────────────┐
│         FastAPI Backend (Python)            │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │       AGNO Agent Orchestrator        │  │
│  │                                      │  │
│  │  1. RepoAnalyzerAgent                │  │
│  │  2. TestRunnerAgent                  │  │
│  │  3. BugClassifierAgent               │  │
│  │  4. FixGeneratorAgent (Gemini LLM)   │  │
│  │  5. CommitAgent                      │  │
│  │  6. CIMonitorAgent                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Prerequisites

- Python ≥ 3.11
- Node.js ≥ 18
- Git
- Docker & Docker Compose (optional, for containerized run)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com)
- A **GitHub Personal Access Token** with `repo` scope (to push branches)

---

## Quick Start — Local Dev

### 1. Clone & set up

```bash
git clone <this-repo>
cd "rift 2a"
```

### 2. Backend

```bash
cd backend

# Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add GOOGLE_API_KEY and GITHUB_TOKEN

# Run backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if backend is on a different host

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Quick Start — Docker Compose

```bash
# Copy and edit the root .env
cp .env.example .env
# Add GOOGLE_API_KEY and GITHUB_TOKEN

# Start everything
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:5173   |
| Backend  | http://localhost:8000   |
| API Docs | http://localhost:8000/docs |

---

## API Reference

### `POST /run-agent`

Start the agent on a GitHub repository.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "team_name": "RIFT ORGANISERS",
  "team_leader": "Saiyam Kumar",
  "github_token": "ghp_...",
  "retry_limit": 5
}
```

**Response:**
```json
{
  "status": "RUNNING",
  "job_id": "3f87a1b2-..."
}
```

### `GET /status/{job_id}`

Poll the status and full results of a running or completed job.

---

## Agent Pipeline

| # | Agent | Role |
|---|-------|------|
| 1 | **RepoAnalyzerAgent** | Detects language, framework, test tools |
| 2 | **TestRunnerAgent** | Runs pytest/unittest, parses stack traces |
| 3 | **BugClassifierAgent** | Classifies: IMPORT, SYNTAX, LOGIC, INDENTATION, TYPE_ERROR, LINTING |
| 4 | **FixGeneratorAgent** | Uses Gemini via AGNO to generate minimal diffs |
| 5 | **CommitAgent** | Creates `[AI-AGENT]` prefix commits, one per fix |
| 6 | **CIMonitorAgent** | Tracks pass/fail per iteration, enables early stop |

---

## Branch Naming Convention

Format: `TEAM_NAME_LEADER_NAME_AI_FIX`

Example: `RIFT_ORGANISERS_SAIYAM_KUMAR_AI_FIX`

Rules:
- ALL CAPS
- Spaces → underscores
- Must end with `_AI_FIX`

---

## Scoring System

| Criterion | Points |
|-----------|--------|
| Base | 100 |
| Speed bonus (< 5 min) | +10 |
| Efficiency penalty (>20 commits, per extra) | −2 |
| Per remaining failure | −10 |
| Cap if CI never passes | max 50 |

---

## Frontend Dashboard

1. **Input Section** — Repo URL, team info, GitHub token, retry limit
2. **Run Summary** — CI badge, team, branch, failures/fixes count, time
3. **Score Panel** — Animated score, breakdown table, progress bar
4. **Fixes Table** — File, bug type, line, commit message, Fixed/Failed badge
5. **CI/CD Timeline** — Per-iteration pass/fail, pre→post status, failure details

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Gemini API key | — |
| `GITHUB_TOKEN` | GitHub PAT for pushing | — |
| `RETRY_LIMIT` | Max fix iterations | 5 |
| `REPOS_DIR` | Where repos are cloned | `/tmp/agno_repos` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend base URL | `http://localhost:8000` |

---

## Output: `results.json`

A `results_{job_id}.json` is written to `$REPOS_DIR` after each run. See `results.json` in this repo for a sample.

---

## License

MIT
