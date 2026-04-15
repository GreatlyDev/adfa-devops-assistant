import os
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.main import app
from app.routes.logs import get_db


TEST_DATABASE_URL = "sqlite:///./test_adfa.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    Base.metadata.drop_all(bind=engine)

    if os.path.exists("test_adfa.db"):
        os.remove("test_adfa.db")


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_log_and_fetch_by_id():
    create_response = client.post(
        "/api/logs/",
        json={
            "service_name": "payments-api",
            "environment": "prod",
            "source": "github-actions",
            "branch": "main",
            "commit_sha": "abc1234",
            "triggered_by": "great",
            "log_text": "Deployment failed due to timeout error",
        },
    )

    assert create_response.status_code == 200

    deployment_id = create_response.json()["deployment_id"]

    get_response = client.get(f"/api/logs/{deployment_id}")

    assert get_response.status_code == 200

    response_data = get_response.json()

    assert response_data["id"] == deployment_id
    assert response_data["service_name"] == "payments-api"
    assert response_data["environment"] == "prod"
    assert response_data["source"] == "github-actions"
    assert response_data["branch"] == "main"
    assert response_data["commit_sha"] == "abc1234"
    assert response_data["triggered_by"] == "great"
    assert response_data["status"] == "failed"
    assert "timeout" in response_data["issue_categories"]
    assert "application" in response_data["issue_categories"]
    assert "timeout" in response_data["matched_signals"]
    assert response_data["confidence_score"] > 0.7


def test_get_log_by_id_returns_404_when_missing():
    response = client.get("/api/logs/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Deployment log not found"}


def test_summary_endpoint_returns_log_counts():
    client.post(
        "/api/logs/",
        json={
            "service_name": "frontend",
            "environment": "dev",
            "source": "manual",
            "log_text": "Deployment completed successfully",
        },
    )
    client.post(
        "/api/logs/",
        json={
            "service_name": "payments-api",
            "environment": "prod",
            "source": "github-actions",
            "log_text": "Permission denied during deploy",
        },
    )

    response = client.get("/api/logs/summary")

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["total_logs"] == 2
    assert response_data["successful_logs"] == 1
    assert response_data["failed_logs"] == 1
    assert response_data["failure_rate"] == 50.0
    assert response_data["average_confidence"] >= 0.5
    assert response_data["active_filters"] == {
        "status": "",
        "environment": "",
        "service_name": "",
        "search": "",
        "trend_days": "7",
    }
    assert response_data["status_breakdown"] == [
        {"label": "success", "count": 1},
        {"label": "failed", "count": 1},
    ]
    assert len(response_data["daily_activity"]) == 7
    today = datetime.now().date().isoformat()
    today_point = next(point for point in response_data["daily_activity"] if point["date"] == today)
    assert today_point == {
        "date": today,
        "total_logs": 2,
        "successful_logs": 1,
        "failed_logs": 1,
    }
    assert response_data["open_alerts_count"] == 1
    assert response_data["active_alerts"][0]["severity"] in {"high", "critical"}
    assert response_data["active_alerts"][0]["service_name"] == "payments-api"
    assert response_data["top_issue_categories"][0]["category"] == "permissions"
    assert response_data["most_impacted_services"][0]["service_name"] == "payments-api"
    assert len(response_data["recent_logs"]) == 2
    assert response_data["recent_logs"][0]["issue_categories"]


def test_logs_can_be_filtered_by_environment_and_search():
    client.post(
        "/api/logs/",
        json={
            "service_name": "frontend",
            "environment": "staging",
            "branch": "release/ui-refresh",
            "log_text": "Deployment completed successfully",
        },
    )
    client.post(
        "/api/logs/",
        json={
            "service_name": "payments-api",
            "environment": "prod",
            "branch": "main",
            "commit_sha": "deadbeef",
            "log_text": "Deployment failed due to timeout error",
        },
    )

    response = client.get("/api/logs/?environment=prod&search=dead")

    assert response.status_code == 200

    response_data = response.json()

    assert len(response_data) == 1
    assert response_data[0]["service_name"] == "payments-api"
    assert response_data[0]["environment"] == "prod"


def test_analyzer_returns_permission_category_and_signals():
    response = client.post(
        "/api/logs/",
        json={
            "service_name": "secrets-sync",
            "environment": "prod",
            "log_text": "Permission denied while reading deployment secret from vault",
        },
    )

    assert response.status_code == 200

    analysis = response.json()["analysis"]

    assert analysis["status"] == "failed"
    assert "permissions" in analysis["issue_categories"]
    assert "permission denied" in analysis["matched_signals"]
    assert analysis["confidence_score"] >= 0.9


def test_seed_demo_logs_loads_sample_data():
    response = client.post("/api/logs/seed-demo")

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["inserted_logs"] == 6
    assert response_data["existing_logs"] == 0

    summary_response = client.get("/api/logs/summary")
    summary_data = summary_response.json()

    assert summary_data["total_logs"] == 6
    assert summary_data["top_issue_categories"]


def test_seed_demo_logs_does_not_duplicate_without_force():
    first_response = client.post("/api/logs/seed-demo")
    second_response = client.post("/api/logs/seed-demo")

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    second_data = second_response.json()

    assert second_data["inserted_logs"] == 0
    assert second_data["existing_logs"] == 6

    logs_response = client.get("/api/logs/")
    assert len(logs_response.json()) == 6


def test_export_logs_csv_respects_filters():
    client.post(
        "/api/logs/",
        json={
            "service_name": "payments-api",
            "environment": "prod",
            "branch": "main",
            "commit_sha": "abc1234",
            "log_text": "Deployment failed due to timeout error",
        },
    )
    client.post(
        "/api/logs/",
        json={
            "service_name": "frontend-web",
            "environment": "staging",
            "branch": "release/ui",
            "commit_sha": "def5678",
            "log_text": "Deployment completed successfully",
        },
    )

    response = client.get("/api/logs/export?environment=prod")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=\"adfa-deployments.csv\"" == response.headers["content-disposition"]
    assert "payments-api" in response.text
    assert "frontend-web" not in response.text
    assert "issue_categories" in response.text


def test_alerts_endpoint_returns_ranked_alerts():
    client.post(
        "/api/logs/",
        json={
            "service_name": "auth-gateway",
            "environment": "prod",
            "log_text": "Permission denied while accessing secret AUTH_KEY",
        },
    )
    client.post(
        "/api/logs/",
        json={
            "service_name": "billing-sync",
            "environment": "staging",
            "log_text": "Deployment failed due to timeout error",
        },
    )

    response = client.get("/api/logs/alerts")

    assert response.status_code == 200

    alerts = response.json()

    assert len(alerts) == 2
    assert alerts[0]["service_name"] == "auth-gateway"
    assert alerts[0]["severity"] == "critical"
    assert alerts[1]["service_name"] == "billing-sync"
