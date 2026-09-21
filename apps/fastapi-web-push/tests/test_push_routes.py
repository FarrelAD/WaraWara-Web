"""Unit and integration tests for FastAPI Web Push endpoints."""

import pytest
from fastapi.testclient import TestClient

from src.config import config
from src.main import app
from src.services.subscription_service import subscription_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_subscriptions():
    """Ensure in-memory subscriptions are reset before each test."""
    subscription_service.clear()
    yield
    subscription_service.clear()


def test_get_vapid_public_key():
    """Test retrieving public VAPID key."""
    response = client.get("/api/vapid-public-key")
    assert response.status_code == 200
    data = response.json()
    assert "publicKey" in data
    assert data["publicKey"] == config.VAPID_PUBLIC_KEY


def test_subscribe_success():
    """Test registering a valid push subscription."""
    payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/sample-token-12345",
        "expirationTime": None,
        "keys": {
            "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9EgVKA7Gh272YjgqmtPa3WExtDH",
            "auth": "tBHItJI5svbpez7KI4CCXg",
        },
    }
    response = client.post("/api/subscribe", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["totalSubscriptions"] == 1
    assert subscription_service.get_count() == 1


def test_subscribe_invalid_schema():
    """Test subscribing with incomplete keys/missing fields."""
    response = client.post("/api/subscribe", json={"endpoint": "https://example.com"})
    assert response.status_code == 422  # Pydantic validation error


def test_send_notification_no_subscribers():
    """Test triggering push when no client has subscribed."""
    response = client.post("/api/send-notification", json={"title": "Test"})
    assert response.status_code == 400
    assert "No active push subscriptions found" in response.json()["detail"]


def test_send_notification_with_delay():
    """Test scheduling push notification with non-blocking delay."""
    # First, register a mock subscription
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/sample-token-12345",
        "keys": {
            "p256dh": "mock-p256dh-key",
            "auth": "mock-auth-key",
        },
    }
    sub_res = client.post("/api/subscribe", json=sub_payload)
    assert sub_res.status_code == 201

    # Send scheduled push
    push_req = {
        "title": "Scheduled Alert",
        "body": "This notification is delayed",
        "delaySeconds": 2,
    }
    response = client.post("/api/send-notification", json=push_req)
    assert response.status_code == 200
    data = response.json()
    assert "scheduled in 2 seconds" in data["message"]
