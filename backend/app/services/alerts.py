from __future__ import annotations

import json


def parse_json_list(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []

    return json.loads(raw_value)


def build_alert_from_log(deployment_log) -> dict | None:
    if deployment_log.status != "failed":
        return None

    issue_categories = parse_json_list(deployment_log.issue_categories)
    issues = parse_json_list(deployment_log.issues)
    recommendations = parse_json_list(deployment_log.recommendations)
    confidence = deployment_log.confidence_score or 0.0
    environment = deployment_log.environment or "unknown"

    severity = "medium"
    if environment == "prod" and (
        "permissions" in issue_categories
        or "capacity" in issue_categories
        or confidence >= 0.9
    ):
        severity = "critical"
    elif environment == "prod" or confidence >= 0.8:
        severity = "high"

    return {
        "deployment_id": deployment_log.id,
        "service_name": deployment_log.service_name or f"deployment-{deployment_log.id}",
        "environment": environment,
        "severity": severity,
        "summary": issues[0] if issues else "Deployment failure detected.",
        "recommended_action": recommendations[0] if recommendations else "Investigate the deployment trace and rerun safely.",
        "confidence_score": confidence,
        "issue_categories": issue_categories,
        "created_at": deployment_log.created_at,
    }


def filter_alerts(deployment_logs, severity: str | None = None) -> list[dict]:
    alerts = []

    for deployment_log in deployment_logs:
        alert = build_alert_from_log(deployment_log)
        if not alert:
            continue

        if severity and alert["severity"] != severity:
            continue

        alerts.append(alert)

    return alerts
