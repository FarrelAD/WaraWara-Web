import { type IRouter, type Request, type Response, Router } from 'express';
import type { PushSubscription } from 'web-push';
import { config } from '../config.js';
import { pushService } from '../services/push.service.js';
import { subscriptionService } from '../services/subscription.service.js';
import type { PushNotificationPayload, SendPushRequestBody } from '../types.js';

export const pushRouter: IRouter = Router();

// Endpoint to provide Public VAPID Key to client
pushRouter.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: config.vapidKeys.publicKey });
});

// Endpoint to save subscription from client browser
pushRouter.post('/subscribe', (req: Request, res: Response) => {
  const subscription: PushSubscription = req.body;

  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }

  const id = subscriptionService.addSubscription(subscription);
  const totalSubscriptions = subscriptionService.getCount();

  console.log(
    `[Bun Server] New subscription registered. Total subscriptions: ${totalSubscriptions}`
  );

  res.status(201).json({
    message: 'Subscription stored successfully on Bun server',
    id,
    totalSubscriptions,
  });
});

// Endpoint to trigger push notification from server to subscribed client(s)
pushRouter.post('/send-notification', async (req: Request, res: Response) => {
  const { title, body, icon, image, tag, actions, delaySeconds } = req.body as SendPushRequestBody;

  const totalSubscriptions = subscriptionService.getCount();
  if (totalSubscriptions === 0) {
    res.status(400).json({ error: 'No active push subscriptions found on Bun server!' });
    return;
  }

  const payloadData: PushNotificationPayload = {
    title: title || 'Push Notification Demo (Bun)',
    body: body || 'Hello from Bun Web Push server!',
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
      message: 'Push notification process initiated on Bun!',
      subscribersTargeted: totalSubscriptions,
      results,
    });
  }
});
