/**
 * Client-side Application Logic for Web Push Demo
 */

/**
 * Registered Service Worker instance reference.
 * @type {ServiceWorkerRegistration|null}
 */
let swRegistration = null;

/**
 * Server VAPID Public key for PushManager encryption.
 * @type {string|null}
 */
let vapidPublicKey = null;

/**
 * Custom logger helper to render log entries into the UI log box element.
 * @param {string} msg - Message text to display in logs.
 * @returns {void}
 */
function log(msg) {
  /** @type {HTMLElement|null} */
  const logBox = document.getElementById('logBox');
  if (!logBox) return;

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

/**
 * Converts a Base64 URL string to a Uint8Array required for applicationServerKey.
 * @param {string} base64String - VAPID public key encoded in Base64 URL format.
 * @returns {Uint8Array} Unsigned 8-bit integer array representing VAPID key bytes.
 */
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

/**
 * Refreshes status badges and button states based on browser state and permissions.
 * @returns {void}
 */
function updateUI() {
  const permBadge = document.getElementById('permBadge');
  const swBadge = document.getElementById('swBadge');
  const btnPerm = /** @type {HTMLButtonElement|null} */ (document.getElementById('btnPerm'));

  if (!permBadge || !swBadge || !btnPerm) return;

  /** @type {NotificationPermission} */
  const permission = Notification.permission;
  permBadge.textContent = permission.toUpperCase();
  permBadge.className = `badge badge-${permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'default'}`;

  if (permission === 'granted') {
    btnPerm.disabled = true;
    btnPerm.textContent = 'Permission Granted';
  }

  // Service Worker Badge
  if (swRegistration) {
    swBadge.textContent = 'ACTIVE';
    swBadge.className = 'badge badge-granted';
  } else {
    swBadge.textContent = 'INACTIVE';
    swBadge.className = 'badge badge-denied';
  }
}

/**
 * Initializes Service Worker registration and fetches server VAPID key.
 * @returns {Promise<void>}
 */
async function init() {
  log('Initializing Web Push client app...');

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    log('Web Push API or Service Worker is not supported in this browser.');
    return;
  }

  // Register Service Worker
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    log('Service Worker registered successfully: /sw.js');
    updateUI();

    // Check existing subscription status
    /** @type {PushSubscription|null} */
    const existingSub = await swRegistration.pushManager.getSubscription();
    const subBadge = document.getElementById('subBadge');

    if (subBadge) {
      if (existingSub) {
        subBadge.textContent = 'SUBSCRIBED';
        subBadge.className = 'badge badge-granted';
        log('Found active Web Push subscription on browser.');
      } else {
        subBadge.textContent = 'NOT SUBSCRIBED';
        subBadge.className = 'badge badge-default';
      }
    }
  } catch (err) {
    log(`Service Worker registration failed: ${/** @type {Error} */ (err).message}`);
  }

  // Fetch Public VAPID Key from Express Server
  try {
    const res = await fetch('/api/vapid-public-key');
    const data = await res.json();
    vapidPublicKey = data.publicKey;
    log('Fetched VAPID Public Key from server.');
  } catch (err) {
    log(`Failed to fetch VAPID key: ${/** @type {Error} */ (err).message}`);
  }
}

// Request Notification Permission
document.getElementById('btnPerm')?.addEventListener('click', async () => {
  try {
    const permission = await Notification.requestPermission();
    log(`User permission response: ${permission}`);
    updateUI();
  } catch (err) {
    log(`Error requesting permission: ${/** @type {Error} */ (err).message}`);
  }
});

// Subscribe to Server Web Push Notifications
document.getElementById('btnSubscribe')?.addEventListener('click', async () => {
  if (Notification.permission !== 'granted') {
    alert('Please grant notification permission first.');
    return;
  }

  if (!swRegistration || !vapidPublicKey) {
    log('Service worker or VAPID key is missing.');
    return;
  }

  try {
    log('Requesting PushSubscription from browser PushManager...');
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    /** @type {PushSubscription} */
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    log('Received PushSubscription object from browser.');

    // Send subscription object to Express Server
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    const resData = await response.json();
    log(`Server response: ${resData.message} (Total subs: ${resData.totalSubscriptions})`);

    const subBadge = document.getElementById('subBadge');
    if (subBadge) {
      subBadge.textContent = 'SUBSCRIBED';
      subBadge.className = 'badge badge-granted';
    }
  } catch (err) {
    log(`Web Push subscription failed: ${/** @type {Error} */ (err).message}`);
  }
});

// Test Local Notification
document.getElementById('btnLocalNotif')?.addEventListener('click', () => {
  if (Notification.permission !== 'granted') {
    alert('Please grant notification permission first.');
    return;
  }

  if (swRegistration) {
    swRegistration.showNotification('Instant Local Notification', {
      body: 'This notification was triggered locally via Service Worker.',
      tag: 'local-test',
    });
    log('Local Notification dispatched via ServiceWorker.');
  } else {
    new Notification('Instant Local Notification', {
      body: 'This notification was triggered locally via Browser API.',
    });
  }
});

// Send Push Request to Server Form
document.getElementById('pushForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titleInput = /** @type {HTMLInputElement|null} */ (document.getElementById('titleInput'));
  const bodyInput = /** @type {HTMLInputElement|null} */ (document.getElementById('bodyInput'));
  const delayInput = /** @type {HTMLInputElement|null} */ (document.getElementById('delayInput'));

  const title = titleInput ? titleInput.value : '';
  const body = bodyInput ? bodyInput.value : '';
  const delaySeconds = delayInput ? delayInput.value : 0;

  log('Dispatching push payload request to Express backend...');

  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        delaySeconds,
      }),
    });

    const data = await response.json();
    log(`Server response: ${data.message}`);
  } catch (err) {
    log(`Failed to request push from server: ${/** @type {Error} */ (err).message}`);
  }
});

window.addEventListener('DOMContentLoaded', init);
