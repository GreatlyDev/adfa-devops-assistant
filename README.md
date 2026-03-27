# adfa-devops-assistant
Automated Deployment Feedback Assistant (ADFA) - a DevOps platform that analyzes CI/CD deployment logs and provides intelligent debugging recommendations.

## Run with Docker

From the `backend` folder:

```bash
docker build -t adfa-backend .
docker run -p 8000:8000 adfa-backend
```

The API will be available at:

```text
http://localhost:8000
```
