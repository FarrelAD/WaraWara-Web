package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/config"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/models"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/services"
)

// HandleVapidPublicKey serves the VAPID public key needed for client browser push subscription.
func HandleVapidPublicKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"publicKey": config.AppConfig.VapidPublicKey,
	})
}

// HandleSubscribe receives and registers a browser push subscription.
func HandleSubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var sub models.PushSubscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		http.Error(w, fmt.Sprintf("Invalid subscription payload: %v", err), http.StatusBadRequest)
		return
	}

	if sub.Endpoint == "" {
		http.Error(w, "Invalid subscription object: missing endpoint", http.StatusBadRequest)
		return
	}

	services.SubService.AddSubscription(sub)
	total := services.SubService.Count()

	log.Printf("[Go Server] New subscription registered. Total subscriptions: %d\n", total)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":            "Subscription stored successfully on Go server",
		"totalSubscriptions": total,
	})
}

// HandleSendNotification triggers or schedules push notifications to all subscribers.
func HandleSendNotification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	total := services.SubService.Count()
	if total == 0 {
		http.Error(w, "No active push subscriptions found on Go server!", http.StatusBadRequest)
		return
	}

	var body models.SendPushRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		// Allow empty body with defaults
		body = models.SendPushRequestBody{}
	}

	actions := body.Actions
	if len(actions) == 0 {
		actions = []models.NotificationAction{
			{Action: "open", Title: "Open App"},
			{Action: "close", Title: "Dismiss"},
		}
	}

	title := body.Title
	if title == "" {
		title = "Push Notification Demo (Golang)"
	}

	content := body.Body
	if content == "" {
		content = "Hello from Golang Web Push server!"
	}

	tag := body.Tag
	if tag == "" {
		tag = "demo-push"
	}

	payload := models.PushNotificationPayload{
		Title:   title,
		Body:    content,
		Icon:    body.Icon,
		Image:   body.Image,
		Tag:     tag,
		Actions: actions,
	}

	w.Header().Set("Content-Type", "application/json")

	if body.DelaySeconds > 0 {
		// Schedule asynchronous delayed push notification via goroutine
		time.AfterFunc(time.Duration(body.DelaySeconds)*time.Second, func() {
			log.Printf("[Go Server] Dispatching delayed push notification after %d seconds...\n", body.DelaySeconds)
			services.NotificationService.SendPushToAll(payload)
		})

		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": fmt.Sprintf("Notification scheduled in %d seconds for %d subscriber(s).", body.DelaySeconds, total),
		})
		return
	}

	// Immediate dispatch
	results := services.NotificationService.SendPushToAll(payload)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":             "Push notification process initiated on Go!",
		"subscribersTargeted": total,
		"results":             results,
	})
}
