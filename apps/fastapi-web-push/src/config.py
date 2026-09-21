"""FastAPI application configuration and VAPID settings resolution."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Search for .env at app level or root level
CURRENT_DIR = Path(__file__).resolve().parent
APP_ENV = CURRENT_DIR.parent / ".env"
ROOT_ENV = CURRENT_DIR.parent.parent.parent / ".env"

if APP_ENV.exists():
    load_dotenv(dotenv_path=APP_ENV)
elif ROOT_ENV.exists():
    load_dotenv(dotenv_path=ROOT_ENV)
else:
    load_dotenv()


class Config:
    PORT: int = int(os.getenv("PORT", "8000"))
    NODE_ENV: str = os.getenv("NODE_ENV", "development")

    VAPID_PUBLIC_KEY: str = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_PRIVATE_KEY: str = os.getenv("VAPID_PRIVATE_KEY", "")
    VAPID_SUBJECT: str = os.getenv("VAPID_SUBJECT", "mailto:admin@example.com")

    @classmethod
    def validate(cls):
        if not cls.VAPID_PUBLIC_KEY or not cls.VAPID_PRIVATE_KEY:
            raise ValueError(
                "CRITICAL ERROR: Missing VAPID cryptographic keys in environment variables!\n"
                "Ensure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are defined in your .env file."
            )


config = Config()
