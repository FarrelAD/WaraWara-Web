"""In-memory subscription registry matching Node and Bun implementations."""

import uuid

from ..models import PushSubscriptionModel


class SubscriptionService:
    def __init__(self):
        # Store subscriptions mapped by internal ID
        self._subscriptions: dict[str, PushSubscriptionModel] = {}

    def add_subscription(self, subscription: PushSubscriptionModel) -> str:
        # Avoid duplicate subscriptions with identical endpoints
        for sub_id, sub in self._subscriptions.items():
            if sub.endpoint == subscription.endpoint:
                self._subscriptions[sub_id] = subscription
                return sub_id

        sub_id = str(uuid.uuid4())
        self._subscriptions[sub_id] = subscription
        return sub_id

    def remove_subscription(self, sub_id: str) -> bool:
        if sub_id in self._subscriptions:
            del self._subscriptions[sub_id]
            return True
        return False

    def get_all_subscriptions(self) -> dict[str, PushSubscriptionModel]:
        return dict(self._subscriptions)

    def get_count(self) -> int:
        return len(self._subscriptions)

    def clear(self):
        self._subscriptions.clear()


subscription_service = SubscriptionService()
