const express = require('express');
const cors = require('cors');
const webPush = require('web-push');
const path = require('path');

/**
 * @typedef {Object} VapidKeys
 * @property {string} publicKey - Public VAPID key sent to client for push subscription authentication.
 * @property {string} privateKey - Private VAPID key kept secret on the server to sign push payloads.
 */

/**
 * @typedef {Object} NotificationAction
 * @property {string} action - Action identifier (e.g., 'open', 'close').
 * @property {string} title - Button label text shown in notification.
 */

/**
 * @typedef {Object} PushNotificationPayload
 * @property {string} title - The notification title header.
 * @property {string} body - Main notification message text.
 * @property {string} [icon] - URL string pointing to notification icon image.
 * @property {string} [image] - URL string pointing to banner image.
 * @property {string} [tag] - Grouping tag for notifications.
 * @property {NotificationAction[]} [actions] - Interactive buttons attached to notification.
 */

/**
 * @typedef {Object} SendPushRequestBody
 * @property {string} title - Custom notification title.
 * @property {string} body - Custom notification body text.
 * @property {string} [icon] - Icon URL.
 * @property {string} [image] - Image URL.
 * @property {string} [tag] - Tag category.
 * @property {NotificationAction[]} [actions] - Action buttons array.
 * @property {number|string} [delaySeconds] - Delay duration before sending push notification.
 */

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

/** @type {VapidKeys} */
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BLnabU8wJCqIu0TQf5kGzCcg5_4Yjvw0E5ixaZAs03PcYaeznHgllaIdP7fZNkN93HNY0UUAKneoMM3uRCQP2gM',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'DT0PPdym6bUHsvcR8hIXieVL0CQL0hDQNPgC3eFdnsg'
};

webPush.setVapidDetails(
  'mailto:dev@warawara.demo',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/** 
 * Map storing active client push subscriptions keyed by unique subscription ID.
 * @type {Map<string, webPush.PushSubscription>} 
 */
const subscriptions = new Map();

// Endpoint to provide Public VAPID Key to client
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Endpoint to save subscription from client browser
app.post('/api/subscribe', (req, res) => {
  /** @type {webPush.PushSubscription} */
  const subscription = req.body;
  
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const id = Date.now().toString();
  subscriptions.set(id, subscription);
  
  console.log(`[Server] New subscription registered. Total subscriptions: ${subscriptions.size}`);
  
  res.status(201).json({
    message: 'Subscription stored successfully on server',
    id: id,
    totalSubscriptions: subscriptions.size
  });
});

// Endpoint to trigger push notification from server to subscribed client(s)
app.post('/api/send-notification', async (req, res) => {
  /** @type {SendPushRequestBody} */
  const { title, body, icon, image, tag, actions, delaySeconds } = req.body;

  /** @type {PushNotificationPayload} */
  const payloadData = {
    title: title || 'Push Notification Demo',
    body: body || 'Hello from Node.js Web Push server!',
    icon: icon || '',
    image: image || '',
    tag: tag || 'demo-push',
    actions: actions || [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  const payload = JSON.stringify(payloadData);

  if (subscriptions.size === 0) {
    return res.status(400).json({ error: 'No active push subscriptions found on server!' });
  }

  /**
   * Helper to dispatch push payload to all registered subscriptions.
   * @returns {Promise<{successCount: number, failCount: number}>}
   */
  const sendPushToAll = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const [id, sub] of subscriptions.entries()) {
      try {
        await webPush.sendNotification(sub, payload);
        successCount++;
      } catch (err) {
        console.error(`[Server] Failed to send push to ID ${id}:`, err.message);
        failCount++;
        // Remove stale/expired subscriptions (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions.delete(id);
        }
      }
    }
    console.log(`[Server] Push dispatch complete. Success: ${successCount}, Failed: ${failCount}`);
    return { successCount, failCount };
  };

  const delayMs = (parseInt(String(delaySeconds), 10) || 0) * 1000;

  if (delayMs > 0) {
    res.json({
      message: `Notification scheduled in ${delaySeconds} seconds for ${subscriptions.size} subscriber(s).`
    });
    setTimeout(() => {
      sendPushToAll();
    }, delayMs);
  } else {
    const results = await sendPushToAll();
    res.json({
      message: 'Push notification process initiated!',
      subscribersTargeted: subscriptions.size,
      results
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Web Push Demo Server running at http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
