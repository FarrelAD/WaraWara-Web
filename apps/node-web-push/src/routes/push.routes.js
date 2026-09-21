const express = require('express');
const { config } = require('../config.js');
const { pushService } = require('../services/push.service.js');
const { subscriptionService } = require('../services/subscription.service.js');

const pushRouter = express.Router();

// Endpoint to provide Public VAPID Key to client
pushRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: config.vapidKeys.publicKey });
});

// Endpoint to save subscription from client browser
pushRouter.post('/subscribe', (req, res) => {
  /** @type {import('web-push').PushSubscription} */
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const id = subscriptionService.addSubscription(subscription);
  const totalSubscriptions = subscriptionService.getCount();

  console.log(`[Server] New subscription registered. Total subscriptions: ${totalSubscriptions}`);

  res.status(201).json({
    message: 'Subscription stored successfully on server',
    id,
    totalSubscriptions,
  });
});

// Endpoint to trigger push notification from server to subscribed client(s)
pushRouter.post('/send-notification', async (req, res) => {
  /** @type {import('../types.js').SendPushRequestBody} */
  const { title, body, icon, image, tag, actions, delaySeconds } = req.body;

  const totalSubscriptions = subscriptionService.getCount();
  if (totalSubscriptions === 0) {
    return res.status(400).json({ error: 'No active push subscriptions found on server!' });
  }

  /** @type {import('../types.js').PushNotificationPayload} */
  const payloadData = {
    title: title || 'Push Notification Demo',
    body: body || 'Hello from Node.js Web Push server!',
    icon: icon || '',
    image: image || '',
    tag: tag || 'demo-push',
    actions: actions || [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  const delayMs = (Number.parseInt(String(delaySeconds), 10) || 0) * 1000;

  if (delayMs > 0) {
    res.json({
      message: `Notification scheduled in ${delaySeconds} seconds for ${totalSubscriptions} subscriber(s).`,
    });
    setTimeout(() => {
      pushService.sendPushToAll(payloadData);
    }, delayMs);
  } else {
    const results = await pushService.sendPushToAll(payloadData);
    res.json({
      message: 'Push notification process initiated!',
      subscribersTargeted: totalSubscriptions,
      results,
    });
  }
});

module.exports = { pushRouter };
