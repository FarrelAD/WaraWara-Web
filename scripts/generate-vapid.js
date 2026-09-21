#!/usr/bin/env node
/**
 * Utility script to generate a secure VAPID keypair for Web Push.
 *
 * Usage:
 *   node scripts/generate-vapid.js
 *   or: pnpm generate-vapid
 */

const fs = require('fs');
const path = require('path');

let webPush;
try {
  webPush = require('web-push');
} catch {
  // Resolve from workspace app if root doesn't have it hoisted
  try {
    webPush = require('../apps/node-web-push/node_modules/web-push');
  } catch {
    webPush = require('../apps/bun-web-push/node_modules/web-push');
  }
}

console.log('Generating fresh VAPID cryptographic keypair...');
const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n===============================================================');
console.log('                 NEW VAPID KEYS GENERATED                      ');
console.log('===============================================================');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('===============================================================\n');

const envPath = path.resolve(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  const examplePath = path.resolve(__dirname, '..', '.env.example');
  let content = '';
  if (fs.existsSync(examplePath)) {
    content = fs.readFileSync(examplePath, 'utf8');
    content = content.replace(/^VAPID_PUBLIC_KEY=.*$/m, `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    content = content.replace(/^VAPID_PRIVATE_KEY=.*$/m, `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  } else {
    content = `PORT=3000\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\nVAPID_SUBJECT=mailto:admin@example.com\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('Created .env file populated with your generated VAPID keys.');
} else {
  console.log('Note: .env file already exists. Please manually update your keys or delete .env to regenerate.');
}
