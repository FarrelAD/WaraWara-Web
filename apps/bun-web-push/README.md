# Web Push Notification Integration Guide for Bun (TypeScript)

This guide explains how to implement native, high-performance **Web Push Notifications** in your **Bun** runtime applications using TypeScript, Express, and standard W3C Web Push protocols.

---

## 📌 Why Web Push on Bun?

- **Native TypeScript**: No build step or `ts-node` needed—Bun runs `.ts` files directly.
- **Fast Startup & Low Latency**: Faster HTTP dispatch times when delivering notifications to large subscriber lists.
- **Native `.env` Support**: Bun automatically parses `.env` files on boot with zero dependencies (no `dotenv` needed).
- **Standards Compliant**: Works directly with standard browser `PushManager` and `ServiceWorker` APIs.

---

## 🚀 Step 1: Install Dependencies with Bun

In your project directory, install `web-push`, `express`, `cors`, and their type definitions:

```bash
bun add web-push express cors
bun add -d @types/web-push @types/express @types/cors bun-types
```

---

## 🔑 Step 2: Generate VAPID Keypair

Generate a cryptographic VAPID keypair using Bun:

```bash
bun -e "import wp from 'web-push'; console.log(wp.generateVAPIDKeys());"
```

Save the output to your `.env` file at project root:

```ini
PORT=3001
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

> [!CAUTION]
> **Keep `VAPID_PRIVATE_KEY` strictly secret!** Never commit `.env` into git. Bun will automatically load this file into `process.env` when you start your server.

---

## 💻 Step 3: TypeScript Backend Implementation

Here is a clean TypeScript implementation running natively on Bun:

```typescript
// server.ts
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import webPush, { type PushSubscription } from 'web-push';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Configure Web Push with VAPID details
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// 2. In-memory subscriber storage (Use Bun SQLite or Postgres in production)
const subscriptions = new Map<string, PushSubscription>();

// Endpoint 1: Deliver Public VAPID Key to browser
app.get('/api/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Endpoint 2: Store PushSubscription from client
app.post('/api/subscribe', (req: Request, res: Response) => {
  const subscription: PushSubscription = req.body;

  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }

  const id = Date.now().toString();
  subscriptions.set(id, subscription);

  res.status(201).json({
    message: 'Subscription registered on Bun server',
    id,
    totalSubscriptions: subscriptions.size,
  });
});

// Endpoint 3: Multicast push dispatch
app.post('/api/send-notification', async (req: Request, res: Response) => {
  const { title, body, icon, url } = req.body;

  if (subscriptions.size === 0) {
    res.status(400).json({ error: 'No active push subscribers found' });
    return;
  }

  const payload = JSON.stringify({
    title: title || 'Alert from Bun Server',
    body: body || 'High performance notification via Bun!',
    icon: icon || '/icon.png',
    data: { url: url || '/' },
  });

  let success = 0;
  let failed = 0;

  for (const [id, sub] of subscriptions.entries()) {
    try {
      await webPush.sendNotification(sub, payload);
      success++;
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      console.error(`Failed to send to ${id}:`, error?.message || err);
      failed++;

      // Prune expired subscriptions (HTTP 410 Gone / 404 Not Found)
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        subscriptions.delete(id);
      }
    }
  }

  res.json({ success, failed, total: subscriptions.size });
});

app.listen(PORT, () => {
  console.log(`🚀 Bun Web Push server running at http://localhost:${PORT}`);
  console.log(`⚡ Runtime: Bun v${Bun.version}`);
});
```

To run the server with hot-reload during development:
```bash
bun --watch server.ts
```

---

## 🌐 Step 4: Client Implementation (Browser JavaScript)

```javascript
// client.js
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

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Retrieve public key from Bun server
  const keyRes = await fetch('/api/vapid-public-key');
  const { publicKey } = await keyRes.json();

  // Subscribe browser to push service
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Post subscription object to Bun backend
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}
```

---

## ⚙️ Step 5: Service Worker (`public/sw.js`)

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notification', body: 'New alert!' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon.png',
      data: data.data || { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
```

---

## 🧪 Step 6: Automated Testing with `bun test`

Bun provides a built-in test runner. You can test your endpoints without starting a real port listener using `supertest`:

```typescript
// server.test.ts
import { describe, expect, it } from 'bun:test';
import request from 'supertest';
import { app } from './app';

describe('Web Push Endpoints', () => {
  it('GET /api/vapid-public-key returns key', async () => {
    const res = await request(app).get('/api/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('publicKey');
  });
});
```

Run tests with:
```bash
bun test
```

---

## 🛡️ Production Recommendations on Bun

1. **Database Persistence**: Use Bun's native `bun:sqlite` or an external PostgreSQL pool to store `PushSubscription` JSON records permanently.
2. **Reverse Proxy & HTTPS**: Deploy Bun behind Caddy, Nginx, or Cloudflare with automatic TLS certificates (HTTPS is mandatory for Web Push).
3. **Graceful Stale Pruning**: Ensure you handle HTTP 410/404 responses from vendor push gateways to maintain healthy subscriber pools and high delivery rates.
