package models

// PushKeys stores the client encryption keys.
type PushKeys struct {
	P256dh string `json:"p256dh"`
	Auth   string `json:"auth"`
}

// PushSubscription represents a browser push subscription object.
type PushSubscription struct {
	Endpoint       string   `json:"endpoint"`
	ExpirationTime *int64   `json:"expirationTime,omitempty"`
	Keys           PushKeys `json:"keys"`
}

// NotificationAction represents an interactive action button on a notification.
type NotificationAction struct {
	Action string `json:"action"`
	Title  string `json:"title"`
}

// PushNotificationPayload represents the JSON payload decrypted and displayed by the Service Worker.
type PushNotificationPayload struct {
	Title   string               `json:"title"`
	Body    string               `json:"body"`
	Icon    string               `json:"icon,omitempty"`
	Image   string               `json:"image,omitempty"`
	Tag     string               `json:"tag,omitempty"`
	Actions []NotificationAction `json:"actions,omitempty"`
}

// SendPushRequestBody represents the client request to trigger a push notification.
type SendPushRequestBody struct {
	Title        string               `json:"title"`
	Body         string               `json:"body"`
	Icon         string               `json:"icon,omitempty"`
	Image        string               `json:"image,omitempty"`
	Tag          string               `json:"tag,omitempty"`
	DelaySeconds int                  `json:"delaySeconds,omitempty"`
	Actions      []NotificationAction `json:"actions,omitempty"`
}

// DispatchResult summarizes push notification results.
type DispatchResult struct {
	Total      int `json:"total"`
	Successful int `json:"successful"`
	Failed     int `json:"failed"`
	Pruned     int `json:"pruned"`
}
