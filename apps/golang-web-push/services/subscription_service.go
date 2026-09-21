package services

import (
	"sync"

	"github.com/FarrelAD/WaraWara-Web/apps/golang-web-push/models"
)

// SubscriptionService manages in-memory push subscriptions thread-safely.
type SubscriptionService struct {
	mu            sync.RWMutex
	subscriptions map[string]models.PushSubscription
}

var SubService = NewSubscriptionService()

// NewSubscriptionService returns a new instance of SubscriptionService.
func NewSubscriptionService() *SubscriptionService {
	return &SubscriptionService{
		subscriptions: make(map[string]models.PushSubscription),
	}
}

// AddSubscription stores or updates a subscription keyed by its endpoint.
func (s *SubscriptionService) AddSubscription(sub models.PushSubscription) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subscriptions[sub.Endpoint] = sub
}

// GetAll returns a slice copy of all active subscriptions.
func (s *SubscriptionService) GetAll() []models.PushSubscription {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]models.PushSubscription, 0, len(s.subscriptions))
	for _, sub := range s.subscriptions {
		list = append(list, sub)
	}
	return list
}

// RemoveByEndpoint deletes a subscription by its unique endpoint URL.
func (s *SubscriptionService) RemoveByEndpoint(endpoint string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.subscriptions[endpoint]; exists {
		delete(s.subscriptions, endpoint)
		return true
	}
	return false
}

// Count returns the current number of active subscriptions.
func (s *SubscriptionService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.subscriptions)
}

// Clear removes all subscriptions (useful for tests).
func (s *SubscriptionService) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subscriptions = make(map[string]models.PushSubscription)
}
