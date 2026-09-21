import { beforeEach, describe, expect, it, mock } from 'bun:test';
import request from 'supertest';
import webPush from 'web-push';
import { app } from '../src/app.js';
import { subscriptionService } from '../src/services/subscription.service.js';

describe('Bun Web Push HTTP API', () => {
  beforeEach(() => {
    const all = subscriptionService.getAllSubscriptions();
    for (const id of all.keys()) {
      subscriptionService.removeSubscription(id);
    }
  });

  describe('GET /api/vapid-public-key', () => {
    it('returns the public VAPID key', async () => {
      const res = await request(app).get('/api/vapid-public-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicKey');
      expect(typeof res.body.publicKey).toBe('string');
      expect(res.body.publicKey.length).toBeGreaterThan(10);
    });
  });

  describe('POST /api/subscribe', () => {
    it('rejects invalid subscription payload with 400', async () => {
      const res = await request(app).post('/api/subscribe').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('successfully registers valid subscription', async () => {
      const validSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/bun-test-token',
        keys: {
          p256dh: 'BNc_test...',
          auth: 'auth_test_secret',
        },
      };

      const res = await request(app).post('/api/subscribe').send(validSub);
      expect(res.status).toBe(201);
      expect(res.body.message).toContain('stored successfully');
      expect(res.body).toHaveProperty('id');
      expect(res.body.totalSubscriptions).toBe(1);
    });
  });

  describe('POST /api/send-notification', () => {
    it('returns 400 when no subscriptions are active', async () => {
      const res = await request(app).post('/api/send-notification').send({
        title: 'Test',
        body: 'Hello',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No active push subscriptions');
    });

    it('dispatches notification when subscriptions exist', async () => {
      // Register a mock subscription first
      subscriptionService.addSubscription({
        endpoint: 'https://fcm.googleapis.com/fcm/send/mock-subscriber',
        keys: { p256dh: 'p256', auth: 'auth' },
      });

      // Mock webPush.sendNotification to prevent real HTTP calls during tests
      const originalSend = webPush.sendNotification;
      webPush.sendNotification = mock(() =>
        Promise.resolve({
          statusCode: 201,
          headers: {},
          body: '',
        } as import('web-push').SendResult)
      );

      try {
        const res = await request(app).post('/api/send-notification').send({
          title: 'Automated Test',
          body: 'Testing notification dispatch',
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Push notification process initiated');
        expect(res.body.results.successCount).toBe(1);
        expect(res.body.results.failCount).toBe(0);
      } finally {
        webPush.sendNotification = originalSend;
      }
    });
  });

  describe('Static Assets', () => {
    it('serves frontend index.html on root GET /', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Web Push Notification Demo');
    });
  });
});
