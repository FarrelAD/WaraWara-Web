import type { PushSubscription } from 'web-push';

class SubscriptionService {
  private subscriptions: Map<string, PushSubscription> = new Map();

  public addSubscription(subscription: PushSubscription): string {
    const id = Date.now().toString();
    this.subscriptions.set(id, subscription);
    return id;
  }

  public getSubscription(id: string): PushSubscription | undefined {
    return this.subscriptions.get(id);
  }

  public getAllSubscriptions(): Map<string, PushSubscription> {
    return this.subscriptions;
  }

  public removeSubscription(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  public getCount(): number {
    return this.subscriptions.size;
  }
}

export const subscriptionService = new SubscriptionService();
