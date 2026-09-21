package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/config"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/handlers"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/models"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/services"
)

func TestHandleVapidPublicKey(t *testing.T) {
	config.AppConfig = &config.Config{
		VapidPublicKey: "test-vapid-public-key-12345",
	}

	req := httptest.NewRequest(http.MethodGet, "/api/vapid-public-key", nil)
	rr := httptest.NewRecorder()

	handlers.HandleVapidPublicKey(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", status)
	}

	var response map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to parse response body: %v", err)
	}

	if response["publicKey"] != "test-vapid-public-key-12345" {
		t.Errorf("Expected publicKey 'test-vapid-public-key-12345', got '%s'", response["publicKey"])
	}
}

func TestHandleSubscribe(t *testing.T) {
	services.SubService.Clear()

	sub := models.PushSubscription{
		Endpoint: "https://updates.push.services.mozilla.com/wpush/v2/demo",
		Keys: models.PushKeys{
			P256dh: "mock-p256dh",
			Auth:   "mock-auth",
		},
	}

	payloadBytes, _ := json.Marshal(sub)
	req := httptest.NewRequest(http.MethodPost, "/api/subscribe", bytes.NewBuffer(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlers.HandleSubscribe(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d. Body: %s", status, rr.Body.String())
	}

	if count := services.SubService.Count(); count != 1 {
		t.Errorf("Expected 1 subscription in store, got %d", count)
	}
}

func TestHandleSendNotificationNoSubscribers(t *testing.T) {
	services.SubService.Clear()

	reqBody := models.SendPushRequestBody{
		Title: "Test Title",
		Body:  "Test Body",
	}
	payloadBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/send-notification", bytes.NewBuffer(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlers.HandleSendNotification(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Fatalf("Expected status 400 when no subscribers exist, got %d", status)
	}
}

func TestHandleSendNotificationWithDelay(t *testing.T) {
	services.SubService.Clear()

	sub := models.PushSubscription{
		Endpoint: "https://fcm.googleapis.com/fcm/send/sample-token-12345",
		Keys: models.PushKeys{
			P256dh: "mock-p256dh-key",
			Auth:   "mock-auth-key",
		},
	}
	services.SubService.AddSubscription(sub)

	reqBody := models.SendPushRequestBody{
		Title:        "Scheduled Alert",
		Body:         "This notification is delayed",
		DelaySeconds: 1,
	}
	payloadBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/send-notification", bytes.NewBuffer(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlers.HandleSendNotification(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", status, rr.Body.String())
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	msg, ok := response["message"].(string)
	if !ok || msg == "" {
		t.Errorf("Expected message string in response, got %v", response["message"])
	}
}

