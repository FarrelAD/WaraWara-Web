"""Push notification API routes."""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, status

from ..config import config
from ..models import (
    NotificationAction,
    PushNotificationPayload,
    PushSubscriptionModel,
    SendPushRequestBody,
)
from ..services.push_service import push_service
from ..services.subscription_service import subscription_service

logger = logging.getLogger("fastapi_web_push")
push_router = APIRouter(prefix="/api", tags=["Push Notifications"])


@push_router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Endpoint to provide the public VAPID key to the client browser."""
    return {"publicKey": config.VAPID_PUBLIC_KEY}


@push_router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe(subscription: PushSubscriptionModel):
    """Endpoint to save push subscription sent from browser."""
    if not subscription.endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subscription object: missing endpoint",
        )

    sub_id = subscription_service.add_subscription(subscription)
    total_subscriptions = subscription_service.get_count()

    logger.info(
        f"[FastAPI Server] New subscription registered. Total subscriptions: {total_subscriptions}"
    )

    return {
        "message": "Subscription stored successfully on FastAPI server",
        "id": sub_id,
        "totalSubscriptions": total_subscriptions,
    }


async def _dispatch_delayed(payload: PushNotificationPayload, delay_seconds: int):
    """Wait for delay asynchronously without blocking server, then dispatch."""
    await asyncio.sleep(delay_seconds)
    await push_service.send_push_to_all(payload)


@push_router.post("/send-notification")
async def send_notification(body: SendPushRequestBody):
    """Endpoint to trigger or schedule push notifications."""
    total_subscriptions = subscription_service.get_count()
    if total_subscriptions == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active push subscriptions found on FastAPI server!",
        )

    actions = body.actions or [
        NotificationAction(action="open", title="Open App"),
        NotificationAction(action="close", title="Dismiss"),
    ]

    payload_data = PushNotificationPayload(
        title=body.title or "Push Notification Demo (FastAPI)",
        body=body.body or "Hello from FastAPI Web Push server!",
        icon=body.icon or "",
        image=body.image or "",
        tag=body.tag or "demo-push",
        actions=actions,
    )

    delay = body.delaySeconds or 0

    if delay > 0:
        # Schedule asynchronous delayed push notification
        asyncio.create_task(_dispatch_delayed(payload_data, delay))
        return {
            "message": (
                f"Notification scheduled in {delay} seconds for "
                f"{total_subscriptions} subscriber(s)."
            )
        }
    else:
        results = await push_service.send_push_to_all(payload_data)
        return {
            "message": "Push notification process initiated on FastAPI!",
            "subscribersTargeted": total_subscriptions,
            "results": results.model_dump(),
        }
