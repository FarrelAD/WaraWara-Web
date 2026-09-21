import express, { type Request, type Response } from 'express';
import cors from 'cors';
import webPush, { type PushSubscription } from 'web-push';
import path from 'path';

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export interface NotificationAction {
  action: string;
  title: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  tag?: string;
  actions?: NotificationAction[];
}

export interface SendPushRequestBody {
  title?: string;
  body?: string;
  icon?: string;
  image?: string;
  tag?: string;
  actions?: NotificationAction[];
  delaySeconds?: number | string;
}

const app = express();
const PORT = process.env.BUN_PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(import.meta.dir, 'public')));

/**
 * Resolve VAPID keys securely from environment variables.
 * In production, missing keys will terminate execution immediately.
 * In development, an ephemeral keypair is generated if not configured in .env.
 */
function resolveVapidKeys(): VapidKeys {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY ERROR] VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in production!');
    console.error('Run "pnpm generate-vapid" or configure your deployment environment variables.');
    process.exit(1);
  }

  console.warn('\n⚠️  [SECURITY WARNING] No VAPID keys configured in environment variables.');
  console.warn('⚠️  Generating temporary ephemeral VAPID keys for local development only.');
  console.warn('⚠️  Run "pnpm generate-vapid" to persist a permanent keypair into your .env file.\n');
  return webPush.generateVAPIDKeys();
}

const vapidKeys: VapidKeys = resolveVapidKeys();
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:dev@warawara.demo';

webPush.setVapidDetails(
  vapidSubject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/** 
 * Map storing active client push subscriptions keyed by unique subscription ID.
 */
const subscriptions = new Map<string, PushSubscription>();

// Endpoint to provide Public VAPID Key to client
app.get('/api/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Endpoint to save subscription from client browser
app.post('/api/subscribe', (req: Request, res: Response) => {
  const subscription: PushSubscription = req.body;
  
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const id = Date.now().toString();
  subscriptions.set(id, subscription);
  
  console.log(`[Bun Server] New subscription registered. Total subscriptions: ${subscriptions.size}`);
  
  res.status(201).json({
    message: 'Subscription stored successfully on Bun server',
    id: id,
    totalSubscriptions: subscriptions.size
  });
});

// Endpoint to trigger push notification from server to subscribed client(s)
app.post('/api/send-notification', async (req: Request, res: Response) => {
  const { title, body, icon, image, tag, actions, delaySeconds } = req.body as SendPushRequestBody;

  const payloadData: PushNotificationPayload = {
    title: title || 'Push Notification Demo (Bun)',
    body: body || 'Hello from Bun Web Push server!',
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
    return res.status(400).json({ error: 'No active push subscriptions found on Bun server!' });
  }

  const sendPushToAll = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const [id, sub] of subscriptions.entries()) {
      try {
        await webPush.sendNotification(sub, payload);
        successCount++;
      } catch (err: any) {
        console.error(`[Bun Server] Failed to send push to ID ${id}:`, err?.message || err);
        failCount++;
        // Remove stale/expired subscriptions (410 Gone / 404 Not Found)
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          subscriptions.delete(id);
        }
      }
    }
    console.log(`[Bun Server] Push dispatch complete. Success: ${successCount}, Failed: ${failCount}`);
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
      message: 'Push notification process initiated on Bun!',
      subscribersTargeted: subscriptions.size,
      results
    });
  }
});

// Start Bun Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Bun Web Push Express Server running at http://localhost:${PORT}`);
  console.log(`⚡ Runtime: Bun v${Bun.version}`);
  console.log(`=======================================================`);
});
