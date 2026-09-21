import { beforeEach, describe, expect, it } from 'bun:test';
import type { PushSubscription } from 'web-push';
import { subscriptionService } from '../src/services/subscription.service.js';

describe('SubscriptionService (Bun)', () => {
  beforeEach(() => {
    // Clear all subscriptions before each test
    const all = subscriptionService.getAllSubscriptions();
    for (const id of all.keys()) {
      subscriptionService.removeSubscription(id);
    }
  });

  const mockSub: PushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
    keys: {
      p256dh: 'BNc123...',
      auth: 'authSecret123',
    },
  };

  it('starts with zero subscriptions', () => {
    expect(subscriptionService.getCount()).toBe(0);
  });

  it('adds and retrieves a subscription by id', () => {
    const id = subscriptionService.addSubscription(mockSub);
    expect(id).toBeDefined();
    expect(subscriptionService.getCount()).toBe(1);

    const retrieved = subscriptionService.getSubscription(id);
    expect(retrieved?.endpoint).toBe(mockSub.endpoint);
  });

  it('removes a subscription by id', () => {
    const id = subscriptionService.addSubscription(mockSub);
    expect(subscriptionService.getCount()).toBe(1);

    const removed = subscriptionService.removeSubscription(id);
    expect(removed).toBe(true);
    expect(subscriptionService.getCount()).toBe(0);
  });
});
