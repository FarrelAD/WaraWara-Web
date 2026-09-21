import webPush from 'web-push';
import { config } from '../config.js';
import type { PushDispatchResult, PushNotificationPayload } from '../types.js';
import { subscriptionService } from './subscription.service.js';

// Configure Web Push with VAPID details
webPush.setVapidDetails(
  config.vapidSubject,
  config.vapidKeys.publicKey,
  config.vapidKeys.privateKey
);

class PushService {
  public async sendPushToAll(payloadData: PushNotificationPayload): Promise<PushDispatchResult> {
    const payload = JSON.stringify(payloadData);
    let successCount = 0;
    let failCount = 0;

    const subscriptions = subscriptionService.getAllSubscriptions();

    for (const [id, sub] of subscriptions.entries()) {
      try {
        await webPush.sendNotification(sub, payload);
        successCount++;
      } catch (err: unknown) {
        const error = err as { message?: string; statusCode?: number };
        console.error(`[Bun Server] Failed to send push to ID ${id}:`, error?.message || err);
        failCount++;

        // Remove stale/expired subscriptions (410 Gone / 404 Not Found)
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          subscriptionService.removeSubscription(id);
        }
      }
    }

    console.log(
      `[Bun Server] Push dispatch complete. Success: ${successCount}, Failed: ${failCount}`
    );
    return { successCount, failCount };
  }
}

export const pushService = new PushService();
