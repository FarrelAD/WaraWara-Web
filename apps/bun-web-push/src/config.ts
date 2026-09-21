import webPush from 'web-push';
import type { VapidKeys } from './types.js';

function resolveVapidKeys(): VapidKeys {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[SECURITY ERROR] VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in production!'
    );
    console.error('Run "pnpm generate-vapid" or configure your deployment environment variables.');
    process.exit(1);
  }

  console.warn('\n⚠️  [SECURITY WARNING] No VAPID keys configured in environment variables.');
  console.warn('⚠️  Generating temporary ephemeral VAPID keys for local development only.');
  console.warn(
    '⚠️  Run "pnpm generate-vapid" to persist a permanent keypair into your .env file.\n'
  );
  return webPush.generateVAPIDKeys();
}

export const config = {
  port: Number(process.env.BUN_PORT || 3001),
  vapidKeys: resolveVapidKeys(),
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:dev@warawara.demo',
};
