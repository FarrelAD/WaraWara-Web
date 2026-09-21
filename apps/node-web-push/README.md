# Web Push Notification Integration Guide for Node.js

This guide explains how to implement native, self-hosted **Web Push Notifications** in your own **Node.js** applications without relying on third-party client push SDKs (like Firebase Cloud Messaging SDK or OneSignal).

---

## 📌 Architecture Overview

Native Web Push operates according to W3C standards using three components:
1. **Client Browser**: Registers a Service Worker (`sw.js`) and calls `registration.pushManager.subscribe()`.
2. **Vendor Push Service**: Managed automatically by the browser vendor (Mozilla, Google FCM, Apple APNs) providing an HTTPS push relay endpoint.
3. **Your Node.js Server**: Signs push payloads with a cryptographic **VAPID keypair** and dispatches HTTP POST requests to the push endpoint using the `web-push` library.

---

## 🚀 Step 1: Install Dependencies

In your Node.js project, install `web-push`, `express`, and `cors`:

```bash
npm install express cors web-push
# Or with pnpm:
pnpm add express cors web-push
```

---

## 🔑 Step 2: Generate VAPID Keypair & Configure Environment

VAPID (Voluntary Application Server Identification) keys authenticate your backend server to browser push services.

Generate a fresh keypair using the `web-push` CLI or Node:

```bash
npx web-push generate-vapid-keys
```

Store the generated keys in your `.env` file:

```ini
PORT=3000
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

> [!CAUTION]
> **Keep `VAPID_PRIVATE_KEY` strictly secret!** Never commit `.env` or your private key into source control. Anyone with your private key can impersonate your server and send unauthorized push messages to your users.

---

## 💻 Step 3: Server Implementation (Express)

Here is a clean, production-ready server implementation:

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const webPush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Configure Web Push with VAPID details
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 2. Persistent storage for subscriptions (replace with Database in production)
const subscriptions = new Map();

// Endpoint 1: Provide Public VAPID key to browser client
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Endpoint 2: Store subscription received from browser client
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const id = Date.now().toString();
  subscriptions.set(id, subscription);

  res.status(201).json({ message: 'Subscribed successfully', id });
});

// Endpoint 3: Dispatch push notification to subscribers
app.post('/api/send-notification', async (req, res) => {
  const { title, body, icon, url } = req.body;

  const payload = JSON.stringify({
    title: title || 'New Notification',
    body: body || 'You have a new alert!',
    icon: icon || '/icon.png',
    data: { url: url || '/' },
  });

  let success = 0;
  let failed = 0;

  for (const [id, sub] of subscriptions.entries()) {
    try {
      await webPush.sendNotification(sub, payload);
      success++;
    } catch (err) {
      console.error(`Failed to send push to ${id}:`, err.message);
      failed++;

      // Automatically prune stale or unsubscribed endpoints (410 Gone / 404 Not Found)
      if (err.statusCode === 410 || err.statusCode === 404) {
        subscriptions.delete(id);
      }
    }
  }

  res.json({ success, failed, total: subscriptions.size });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

---

## 🌐 Step 4: Client Implementation (Browser JavaScript)

This code runs in the browser (vanilla JS, React, Vue, Next.js, or any frontend):

```javascript
// client.js

// 1. Helper function: Convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 2. Register Service Worker and subscribe to Web Push
async function setupPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Web Push is not supported in this browser.');
    return;
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission was not granted.');
    return;
  }

  // Register background service worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Fetch Public VAPID Key from server
  const keyResponse = await fetch('/api/vapid-public-key');
  const { publicKey } = await keyResponse.json();

  // Create push subscription with PushManager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Send subscription object to your server
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  console.log('Successfully subscribed to Web Push!');
}
```

---

## ⚙️ Step 5: Service Worker Implementation (`sw.js`)

Save this file in your static root directory (e.g., `public/sw.js`):

```javascript
// sw.js - Background Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push message from server
self.addEventListener('push', (event) => {
  let data = { title: 'New Notification', body: 'You received a notification.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/badge.png',
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open, otherwise open new window
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

---

## 🛡️ Production Checklist

1. **HTTPS Is Mandatory**: Service Workers and `PushManager.subscribe()` only work over **HTTPS** in production (browsers permit `http://localhost` only during development).
2. **Persistent Database**: Replace in-memory `Map` with PostgreSQL, MySQL, MongoDB, or Redis to persist `PushSubscription` records across server restarts.
3. **Stale Endpoint Pruning**: Always catch errors during `webPush.sendNotification`. When an endpoint returns HTTP `404` or `410 Gone`, delete that subscription from your database.
4. **VAPID Subject**: Always set `VAPID_SUBJECT` to a valid email (`mailto:ops@yourdomain.com`) or support URL so push services can contact you regarding rate limits.
