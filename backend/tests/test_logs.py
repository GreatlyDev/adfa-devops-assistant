import os

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
        json={"log_text": "Deployment failed due to timeout error"},
    )

    assert create_response.status_code == 200

    deployment_id = create_response.json()["deployment_id"]

    get_response = client.get(f"/api/logs/{deployment_id}")

    assert get_response.status_code == 200

    response_data = get_response.json()

    assert response_data["id"] == deployment_id
    assert response_data["status"] == "failed"
    assert "Deployment log contains an error." in response_data["issues"]


def test_get_log_by_id_returns_404_when_missing():
    response = client.get("/api/logs/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Deployment log not found"}


def test_summary_endpoint_returns_log_counts():
    client.post("/api/logs/", json={"log_text": "Deployment completed successfully"})
    client.post("/api/logs/", json={"log_text": "Permission denied during deploy"})

    response = client.get("/api/logs/summary")

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["total_logs"] == 2
    assert response_data["successful_logs"] == 1
    assert response_data["failed_logs"] == 1
    assert len(response_data["recent_logs"]) == 2
