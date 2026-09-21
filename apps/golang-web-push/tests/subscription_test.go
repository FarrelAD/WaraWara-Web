package tests

import (
	"testing"

	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/models"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/services"
)

func TestSubscriptionService(t *testing.T) {
	subService := services.NewSubscriptionService()

	if count := subService.Count(); count != 0 {
		t.Fatalf("Expected 0 initial subscriptions, got %d", count)
	}

	testSub := models.PushSubscription{
		Endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-1",
		Keys: models.PushKeys{
			P256dh: "test-p256dh-key",
			Auth:   "test-auth-secret",
		},
	}

	// Add subscription
	subService.AddSubscription(testSub)

	if count := subService.Count(); count != 1 {
		t.Fatalf("Expected 1 subscription, got %d", count)
	}

	// Retrieve all
	subs := subService.GetAll()
	if len(subs) != 1 {
		t.Fatalf("Expected 1 subscription in slice, got %d", len(subs))
	}
	if subs[0].Endpoint != testSub.Endpoint {
		t.Errorf("Expected endpoint %s, got %s", testSub.Endpoint, subs[0].Endpoint)
	}

	// Remove subscription
	removed := subService.RemoveByEndpoint(testSub.Endpoint)
	if !removed {
		t.Error("Expected RemoveByEndpoint to return true")
	}

	if count := subService.Count(); count != 0 {
		t.Fatalf("Expected 0 subscriptions after removal, got %d", count)
	}

	// Remove non-existent
	if subService.RemoveByEndpoint("non-existent") {
		t.Error("Expected RemoveByEndpoint to return false for non-existent endpoint")
	}
}
