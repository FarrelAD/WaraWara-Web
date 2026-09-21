const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { subscriptionService } = require('../src/services/subscription.service.js');

describe('SubscriptionService (Node.js)', () => {
  beforeEach(() => {
    const all = subscriptionService.getAllSubscriptions();
    for (const id of all.keys()) {
      subscriptionService.removeSubscription(id);
    }
  });

  const mockSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/node-test-token',
    keys: {
      p256dh: 'BNc123...',
      auth: 'authSecret123',
    },
  };

  it('starts with zero subscriptions', () => {
    assert.equal(subscriptionService.getCount(), 0);
  });

  it('adds and retrieves a subscription by id', () => {
    const id = subscriptionService.addSubscription(mockSub);
    assert.ok(id);
    assert.equal(subscriptionService.getCount(), 1);

    const retrieved = subscriptionService.getSubscription(id);
    assert.equal(retrieved?.endpoint, mockSub.endpoint);
  });

  it('removes a subscription by id', () => {
    const id = subscriptionService.addSubscription(mockSub);
    assert.equal(subscriptionService.getCount(), 1);

    const removed = subscriptionService.removeSubscription(id);
    assert.equal(removed, true);
    assert.equal(subscriptionService.getCount(), 0);
  });
});
