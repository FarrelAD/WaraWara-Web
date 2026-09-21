"""Web Push notification dispatch service using pywebpush."""

import asyncio
import logging
from typing import Any

from pywebpush import WebPushException, webpush

from ..config import config
from ..models import PushDispatchResult, PushNotificationPayload
from .subscription_service import subscription_service

logger = logging.getLogger("fastapi_web_push")


class PushService:
    def __init__(self):
        self.vapid_claims = {"sub": config.VAPID_SUBJECT}

    def _send_single(self, sub_info: dict[str, Any], payload_str: str) -> None:
        webpush(
            subscription_info=sub_info,
            data=payload_str,
            vapid_private_key=config.VAPID_PRIVATE_KEY,
            vapid_claims=self.vapid_claims,
        )

    async def send_push_to_all(self, payload_data: PushNotificationPayload) -> PushDispatchResult:
        payload_str = payload_data.model_dump_json()
        success_count = 0
        fail_count = 0

        subscriptions = subscription_service.get_all_subscriptions()
        loop = asyncio.get_running_loop()

        for sub_id, sub in subscriptions.items():
            sub_info = sub.model_dump()
            try:
                # pywebpush performs network I/O; run in executor to keep event loop responsive
                await loop.run_in_executor(None, self._send_single, sub_info, payload_str)
                success_count += 1
            except WebPushException as ex:
                logger.error(f"[FastAPI Server] WebPushException for subscriber {sub_id}: {ex}")
                fail_count += 1

                # Check if subscription is expired / revoked (404 Not Found, 410 Gone)
                if ex.response is not None and ex.response.status_code in (404, 410):
                    logger.info(f"[FastAPI Server] Removing expired subscription {sub_id}")
                    subscription_service.remove_subscription(sub_id)
            except Exception as ex:
                logger.error(
                    f"[FastAPI Server] Unexpected error dispatching push to {sub_id}: {ex}"
                )
                fail_count += 1

        logger.info(
            f"[FastAPI Server] Push dispatch complete. "
            f"Success: {success_count}, Failed: {fail_count}"
        )
        return PushDispatchResult(successCount=success_count, failCount=fail_count)


push_service = PushService()
