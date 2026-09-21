const fs = require('node:fs');
const path = require('node:path');
const webPush = require('web-push');

// Natively load .env in Node 20.6+ / 24+ without external dependencies
if (typeof process.loadEnvFile === 'function') {
  const rootEnv = path.resolve(__dirname, '../../../.env');
  const localEnv = path.resolve(__dirname, '../.env');
  if (fs.existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
}

/**
 * Resolve VAPID keys securely from environment variables.
 * In production, missing keys will terminate execution immediately.
 * In development, an ephemeral keypair is generated if not configured in .env.
 * @returns {{ publicKey: string, privateKey: string }}
 */
function resolveVapidKeys() {
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

const config = {
  port: Number(process.env.NODE_PORT || process.env.PORT || 3000),
  vapidKeys: resolveVapidKeys(),
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:dev@warawara.demo',
};

module.exports = { config };
