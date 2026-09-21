"""Pydantic data models and schemas for Web Push notifications."""

from pydantic import BaseModel, Field


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(..., description="Client public encryption key")
    auth: str = Field(..., description="Client authentication secret")


class PushSubscriptionModel(BaseModel):
    endpoint: str = Field(..., description="Browser vendor push service endpoint URL")
    expirationTime: int | None = Field(None, description="Expiration time if temporary")
    keys: SubscriptionKeys = Field(..., description="Client cryptographic keys")


class NotificationAction(BaseModel):
    action: str = Field(..., description="Identifier for the action clicked")
    title: str = Field(..., description="Label shown on the button")


class PushNotificationPayload(BaseModel):
    title: str = "Push Notification Demo (FastAPI)"
    body: str = "Hello from FastAPI Web Push server!"
    icon: str | None = ""
    image: str | None = ""
    tag: str | None = "demo-push"
    actions: list[NotificationAction] | None = Field(
        default_factory=lambda: [
            NotificationAction(action="open", title="Open App"),
            NotificationAction(action="close", title="Dismiss"),
        ]
    )


class SendPushRequestBody(BaseModel):
    title: str | None = "Push Notification Demo (FastAPI)"
    body: str | None = "Hello from FastAPI Web Push server!"
    icon: str | None = ""
    image: str | None = ""
    tag: str | None = "demo-push"
    actions: list[NotificationAction] | None = None
    delaySeconds: int | None = Field(0, ge=0, le=3600)


class PushDispatchResult(BaseModel):
    successCount: int
    failCount: int
