"""FastAPI application entrypoint with static file serving and lifecycle management."""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import config
from .routes.push_routes import push_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("fastapi_web_push")

# Validate VAPID configurations at startup
config.validate()

app = FastAPI(
    title="WaraWara Web Push Demo (FastAPI)",
    description="Native Web Push Notifications demonstration using Python, FastAPI, and pywebpush.",
    version="1.0.0",
)

# Enable CORS for cross-origin client experiments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(push_router)

# Mount public directory for static assets (HTML, CSS, JS, Service Worker)
PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"

if PUBLIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
else:
    logger.warning(f"Public static directory not found at {PUBLIC_DIR}")
