# Autonomous AI Code Fixing Agent & Dashboard

This platform automatically clones a repository, runs tests, fixes bugs iteratively using AI agents, and visualizes the process in a modern React dashboard.

## 🚀 Key Features

- **Autonomous Agents**: Powered by AGNO (backend) to analyze, test, and fix code.
- **Docker Sandbox**: Secure execution environment for running untrusted code/tests.
- **React Dashboard**: VengeanceUI-inspired interface with 3D animations and real-time updates.
- **Automated Workflow**: Clone -> Detect Stack -> Test -> Fix -> Commit -> Push.

## 🛠 Tech Stack

- **Backend**: Python, FastAPI, AGNO, Docker, GitPython
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Zustand
- **Deployment**: Docker containers (for sandbox)

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (must be running)
- Git

## 🏃‍♂️ Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Run the API:**
```bash
python app/main.py
```
*Server runs on http://localhost:8000*

### 2. Frontend Setup

Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Dashboard runs on http://localhost:5173*

## 🧪 Usage

1. Open the dashboard.
2. Enter the **GitHub Repository URL** you want to fix.
3. Enter your **Team Name** and **Leader Name**.
4. Click **Run Agent**.
5. Watch as the agent autonomously repairs the codebase!

## 📂 Project Structure

- `/backend`: FastAPI service and AGNO agents.
- `/frontend`: React dashboard logic and UI.
- `/docker`: Dockerfile for the test execution sandbox.

## 📝 API Endpoints

- `POST /run-agent`: Start a new fixing job.
- `GET /results/{job_id}`: Get job status and results.

---
Built for the Hackathon.
