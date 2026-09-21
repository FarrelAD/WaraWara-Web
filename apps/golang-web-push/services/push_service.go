package services

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	webpush "github.com/SherClockHolmes/webpush-go"

	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/config"
	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/models"
)

// PushService dispatches notifications to push services using webpush-go.
type PushService struct{}

var NotificationService = &PushService{}

// SendPushToAll sends the given payload to all currently registered subscriptions concurrently.
func (p *PushService) SendPushToAll(payload models.PushNotificationPayload) models.DispatchResult {
	subs := SubService.GetAll()
	result := models.DispatchResult{
		Total: len(subs),
	}

	if len(subs) == 0 {
		return result
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[PushService ERROR] Failed to serialize notification payload: %v\n", err)
		result.Failed = len(subs)
		return result
	}

	cfg := config.AppConfig

	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, sub := range subs {
		wg.Add(1)
		go func(s models.PushSubscription) {
			defer wg.Done()

			webpushSub := &webpush.Subscription{
				Endpoint: s.Endpoint,
				Keys: webpush.Keys{
					P256dh: s.Keys.P256dh,
					Auth:   s.Keys.Auth,
				},
			}

			resp, sendErr := webpush.SendNotification(payloadBytes, webpushSub, &webpush.Options{
				Subscriber:      cfg.VapidSubject,
				VAPIDPublicKey:  cfg.VapidPublicKey,
				VAPIDPrivateKey: cfg.VapidPrivateKey,
				TTL:             30,
			})

			mu.Lock()
			defer mu.Unlock()

			if sendErr != nil {
				log.Printf("[PushService ERROR] Delivery error for %s: %v\n", s.Endpoint, sendErr)
				result.Failed++
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK {
				result.Successful++
			} else if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
				// Subscription expired or uninstalled -> prune from storage
				log.Printf("[PushService INFO] Subscription expired (status %d). Pruning endpoint %s\n", resp.StatusCode, s.Endpoint)
				SubService.RemoveByEndpoint(s.Endpoint)
				result.Pruned++
			} else {
				log.Printf("[PushService WARNING] Unexpected push service status %d for endpoint %s\n", resp.StatusCode, s.Endpoint)
				result.Failed++
			}
		}(sub)
	}

	wg.Wait()
	return result
}
