from __future__ import annotations

from app.services.analyzer import analyze_log


DEMO_DEPLOYMENTS = [
    {
        "service_name": "payments-api",
        "environment": "prod",
        "source": "demo-seed",
        "branch": "main",
        "commit_sha": "4f8a1d2",
        "triggered_by": "release-bot",
        "log_text": "[2026-04-15 08:12:01] Starting deployment\n[2026-04-15 08:12:08] ERROR: ModuleNotFoundError: No module named 'stripe_client'\n[2026-04-15 08:12:09] Deployment failed",
    },
    {
        "service_name": "auth-service",
        "environment": "staging",
        "source": "demo-seed",
        "branch": "release/auth-hardening",
        "commit_sha": "b19c3aa",
        "triggered_by": "great",
        "log_text": "[2026-04-15 09:01:11] Starting deployment\n[2026-04-15 09:01:20] Permission denied while accessing secret AUTH_SIGNING_KEY\n[2026-04-15 09:01:21] Deployment aborted",
    },
    {
        "service_name": "frontend-web",
        "environment": "prod",
        "source": "demo-seed",
        "branch": "main",
        "commit_sha": "73ad44c",
        "triggered_by": "release-bot",
        "log_text": "[2026-04-15 10:15:02] Building static assets\n[2026-04-15 10:15:44] Upload complete\n[2026-04-15 10:15:46] Deployment completed successfully",
    },
    {
        "service_name": "notifications-worker",
        "environment": "prod",
        "source": "demo-seed",
        "branch": "main",
        "commit_sha": "2ca1ef0",
        "triggered_by": "github-actions",
        "log_text": "[2026-04-15 11:04:55] Starting rollout\n[2026-04-15 11:05:41] Connection refused while reaching smtp.internal\n[2026-04-15 11:05:42] Deployment failed",
    },
    {
        "service_name": "search-indexer",
        "environment": "dev",
        "source": "demo-seed",
        "branch": "feature/index-batch",
        "commit_sha": "991bbde",
        "triggered_by": "great",
        "log_text": "[2026-04-15 12:24:07] Starting deploy\n[2026-04-15 12:24:38] Invalid config: missing env SEARCH_CLUSTER_URL\n[2026-04-15 12:24:39] Deployment failed",
    },
    {
        "service_name": "billing-sync",
        "environment": "staging",
        "source": "demo-seed",
        "branch": "main",
        "commit_sha": "d83a701",
        "triggered_by": "jenkins",
        "log_text": "[2026-04-15 13:02:10] Running migration job\n[2026-04-15 13:17:10] Job timed out waiting for replica\n[2026-04-15 13:17:11] Deployment failed",
    },
]


def build_demo_deployments() -> list[dict]:
    deployments = []

    for deployment in DEMO_DEPLOYMENTS:
        analysis = analyze_log(deployment["log_text"])
        deployments.append({**deployment, "analysis": analysis})

    return deployments
