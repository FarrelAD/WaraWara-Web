const webPush = require('web-push');
const { config } = require('../config.js');
const { subscriptionService } = require('./subscription.service.js');

// Configure Web Push with VAPID details
webPush.setVapidDetails(
  config.vapidSubject,
  config.vapidKeys.publicKey,
  config.vapidKeys.privateKey
);

const pushService = {
  /**
   * Dispatch push notification payload to all registered subscriptions.
   * @param {import('../types.js').PushNotificationPayload} payloadData
   * @returns {Promise<{ successCount: number, failCount: number }>}
   */
  async sendPushToAll(payloadData) {
    const payload = JSON.stringify(payloadData);
    let successCount = 0;
    let failCount = 0;

    const subscriptions = subscriptionService.getAllSubscriptions();

    for (const [id, sub] of subscriptions.entries()) {
      try {
        await webPush.sendNotification(sub, payload);
        successCount++;
      } catch (err) {
        const error = /** @type {{ message?: string, statusCode?: number }} */ (err);
        console.error(`[Server] Failed to send push to ID ${id}:`, error?.message || err);
        failCount++;

        // Remove stale/expired subscriptions (410 Gone / 404 Not Found)
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          subscriptionService.removeSubscription(id);
        }
      }
    }

    console.log(`[Server] Push dispatch complete. Success: ${successCount}, Failed: ${failCount}`);
    return { successCount, failCount };
  },
};

module.exports = { pushService };
