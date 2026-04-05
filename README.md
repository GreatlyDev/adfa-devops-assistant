# ADFA - Automated Deployment Feedback Assistant

ADFA is a personal DevOps portfolio project that analyzes deployment logs, stores deployment history, and surfaces debugging guidance through a simple API and dashboard.

The goal of the project is to simulate a lightweight internal DevOps tool that helps engineers quickly understand whether a deployment succeeded, failed, timed out, or ran into permission issues.

## Why I Built This

I built ADFA to practice the kind of work that sits between software engineering and DevOps:

- building backend APIs
- storing deployment data
- analyzing operational logs
- containerizing services with Docker
- adding CI with GitHub Actions
- creating a simple dashboard for operational visibility

This project helped me turn several core DevOps concepts into a working end-to-end application instead of keeping them as isolated tutorials.

## Features

- FastAPI backend for deployment log ingestion and retrieval
- SQLite database persistence with SQLAlchemy
- Rules-based deployment log analysis
- Detection for:
  - `error`
  - `failed`
  - `timeout`
  - `permission denied`
- `GET /api/logs/{deployment_id}` support for single-log lookup
- Response schemas with Pydantic
- Dashboard summary endpoint for frontend use
- Frontend dashboard for:
  - submitting deployment logs
  - viewing totals
  - viewing recent deployment history
- Docker support for running the app in a container
- GitHub Actions CI for backend 

## Tech Stack

- Python
- FastAPI
- SQLite
- SQLAlchemy
- Pydantic
- HTML
- CSS
- JavaScript
- Docker
- GitHub Actions
- Git / GitHub

## Project Structure

```text
adfa-devops-assistant/
├── .github/workflows/
├── backend/
│   ├── app/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── README.md
```

## API Endpoints

- `GET /`
- `GET /health`
- `POST /api/logs`
- `GET /api/logs`
- `GET /api/logs/{deployment_id}`
- `GET /api/logs/summary`

## How the Analyzer Works

The analyzer currently uses simple keyword-based logic.

If a deployment log contains terms like:
- `error`
- `failed`
- `timeout`
- `permission denied`

ADFA marks the deployment as failed and returns matching issues and recommendations.

If no known problem keywords are found, ADFA marks the deployment as successful.

## Run Locally

From the `backend` folder:

```bash
cd backend
py -m uvicorn app.main:app --reload
```

Then open:

- [http://localhost:8000/docs](http://localhost:8000/docs)
- [http://localhost:8000/dashboard](http://localhost:8000/dashboard)

## Run with Docker

From the project root:

```bash
docker build -t adfa-backend -f backend/Dockerfile .
docker run -p 8000:8000 adfa-backend
```

Then open:

- [http://localhost:8000/docs](http://localhost:8000/docs)
- [http://localhost:8000/dashboard](http://localhost:8000/dashboard)

## How to Test the Project

You can test ADFA in two easy ways.

### 1. Swagger UI

Open:

[http://localhost:8000/docs](http://localhost:8000/docs)

Try `POST /api/logs` with this sample body:

```json
{
  "log_text": "[2026-03-26 10:03:35] ERROR: ModuleNotFoundError: No module named 'config'\n[2026-03-26 10:03:35] Build failed\n[2026-03-26 10:03:35] Deployment aborted"
}
```

Then test:

- `GET /api/logs`
- `GET /api/logs/{deployment_id}`
- `GET /api/logs/summary`

### 2. Dashboard

Open:

[http://localhost:8000/dashboard](http://localhost:8000/dashboard)

Paste a sample deployment log into the form and submit it.

For example:

```text
[2026-03-26 12:44:18] Starting deployment
[2026-03-26 12:44:20] Fetching deployment secrets
[2026-03-26 12:44:21] Permission denied while accessing secret PROD_API_KEY
[2026-03-26 12:44:21] Deployment failed
```

You should see:

- totals update
- failed deployment count increase
- the new log appear in recent activity

## CI and Testing

This project includes:

- GitHub Actions CI for backend validation
- backend compile checks
- FastAPI app import validation
- backend API tests using `pytest`

The current test suite covers:

- health check endpoint
- log creation
- single-log retrieval by ID
- 404 handling for missing deployment logs
- summary endpoint behavior

## Example DevOps Use Case

ADFA is designed to mimic a lightweight internal platform that could help a team:

- review deployment history
- investigate failed releases
- identify common failure patterns
- provide quick debugging suggestions
- surface operational feedback in one place

## What I Learned

Through this project, I practiced:

- building REST APIs with FastAPI
- modeling data with SQLAlchemy
- separating database models from API schemas
- connecting backend and frontend pieces together
- serving a frontend from a Python backend
- containerizing an application with Docker
- setting up CI with GitHub Actions
- writing backend tests for API endpoints

## Future Improvements

- add authentication
- support real CI/CD provider logs
- add filtering and search on the dashboard
- add deployment environment tags like `dev`, `staging`, and `prod`
- improve analyzer logic beyond keyword matching
- deploy the project publicly
- add screenshots and architecture diagrams


