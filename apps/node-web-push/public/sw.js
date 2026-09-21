/**
 * Service Worker for Web Push Notification Demo
 */

/**
 * @typedef {Object} PushNotificationData
 * @property {string} title - Header text for notification.
 * @property {string} body - Body content message.
 * @property {string} [icon] - Icon URL.
 * @property {string} [image] - Banner image URL.
 * @property {string} [tag] - Unique tag for notification grouping.
 * @property {string} [url] - Target URL to open on notification click.
 * @property {NotificationAction[]} [actions] - Array of interactive action buttons.
 */

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push message from Server
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  /** @type {PushNotificationData} */
  let data = {
    title: 'Default Push Title',
    body: 'Default Push Body text',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  /** @type {NotificationOptions} */
  const options = {
    body: data.body,
    tag: data.tag || 'web-push-demo',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Focus existing window or open new window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
