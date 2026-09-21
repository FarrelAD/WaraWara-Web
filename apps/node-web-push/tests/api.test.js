const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const webPush = require('web-push');
const { app } = require('../src/app.js');
const { subscriptionService } = require('../src/services/subscription.service.js');

describe('Node.js Web Push HTTP API', () => {
  beforeEach(() => {
    const all = subscriptionService.getAllSubscriptions();
    for (const id of all.keys()) {
      subscriptionService.removeSubscription(id);
    }
  });

  describe('GET /api/vapid-public-key', () => {
    it('returns the public VAPID key', async () => {
      const res = await request(app).get('/api/vapid-public-key');
      assert.equal(res.status, 200);
      assert.ok(res.body.publicKey);
      assert.equal(typeof res.body.publicKey, 'string');
      assert.ok(res.body.publicKey.length > 10);
    });
  });

  describe('POST /api/subscribe', () => {
    it('rejects invalid subscription payload with 400', async () => {
      const res = await request(app).post('/api/subscribe').send({});
      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });

    it('successfully registers valid subscription', async () => {
      const validSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/node-test-token',
        keys: {
          p256dh: 'BNc_test...',
          auth: 'auth_test_secret',
        },
      };

      const res = await request(app).post('/api/subscribe').send(validSub);
      assert.equal(res.status, 201);
      assert.ok(res.body.message.includes('stored successfully'));
      assert.ok(res.body.id);
      assert.equal(res.body.totalSubscriptions, 1);
    });
  });

  describe('POST /api/send-notification', () => {
    it('returns 400 when no subscriptions are active', async () => {
      const res = await request(app).post('/api/send-notification').send({
        title: 'Test',
        body: 'Hello',
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('No active push subscriptions'));
    });

    it('dispatches notification when subscriptions exist', async () => {
      subscriptionService.addSubscription(
        /** @type {any} */ ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/mock-subscriber',
          keys: { p256dh: 'p256', auth: 'auth' },
        })
      );

      const originalSend = webPush.sendNotification;
      /** @type {any} */ (webPush).sendNotification = () => Promise.resolve({ statusCode: 201 });

      try {
        const res = await request(app).post('/api/send-notification').send({
          title: 'Automated Test',
          body: 'Testing notification dispatch',
        });

        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('Push notification process initiated'));
        assert.equal(res.body.results.successCount, 1);
        assert.equal(res.body.results.failCount, 0);
      } finally {
        webPush.sendNotification = originalSend;
      }
    });
  });

  describe('Static Assets', () => {
    it('serves frontend index.html on root GET /', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.ok(res.text.includes('Web Push Notification Demo'));
    });
  });
});
