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

/**
 * @typedef {Object} PushDispatchResult
 * @property {number} successCount - Total successful push deliveries.
 * @property {number} failCount - Total failed push deliveries.
 */

module.exports = {};
