# Web Push Notification Demo (Monorepo: Node.js & Bun)

A lightweight, beginner-friendly demonstration of native **Web Push Notifications** using vanilla JavaScript, HTML, CSS, and backend implementations for both **Node.js** and **Bun** runtimes with Express.

This project explores how web applications can deliver real-time push notifications **directly from your own backend server** using the standard W3C Web Push Protocol without relying on third-party push notification SDKs (like Firebase Cloud Messaging SDK or OneSignal) on the client.

---

## 📌 Key Objectives & Key Takeaways

- **No Third-Party Client SDKs**: Understand how Web Push operates natively using browser standards (`PushManager`, `ServiceWorker`) and standard VAPID key pairs.
- **Multi-Runtime Backend Support**: Compare identical Express.js Web Push architectures across **Node.js** and **Bun**.
- **Monorepo Architecture**: Clean workspace managed with `pnpm workspaces` dividing apps into `node-web-push` and `bun-web-push`.
- **Interactive UI & Dashboard**: Clean 2-column layout to manage browser permissions, generate push subscriptions, and trigger instant or scheduled push notifications.

---

## 📚 Dedicated Implementation Guides

Looking to implement Web Push in your own project? Follow the complete, step-by-step integration guides tailored for each runtime:

- 🟢 **[Node.js Integration Guide](apps/node-web-push/README.md)**: Dependencies, VAPID key management, Express setup, service worker lifecycle, and production database persistence.
- ⚡ **[Bun (TypeScript) Integration Guide](apps/bun-web-push/README.md)**: Native TypeScript setup, zero-dependency `.env` loading, async push dispatch, automated testing with `bun:test`, and deployment recommendations.
- 🐍 **[Python (FastAPI) Integration Guide](apps/fastapi-web-push/README.md)**: Modern asynchronous FastAPI setup, Pydantic type validation, background scheduled tasks, pywebpush integration, and automated testing with `pytest`.

---

## 🛠️ Architecture & How Web Push Works

Web Push Notifications rely on three core pillars:
1. **Client Browser & Service Worker**: Requests user permission and registers a background worker script (`sw.js`).
2. **Push Service Endpoint**: Browser vendor-provided endpoint (e.g., Mozilla Push Service, Google FCM Push endpoint) created when the user subscribes via `pushManager.subscribe()`.
3. **Application Backend (Node.js or Bun)**: Encrypts payloads with **VAPID Keys** and sends HTTPS POST requests directly to the subscription endpoint using `web-push`.

### Architecture Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Browser Client
    participant SW as Service Worker (sw.js)
    participant Server as Node.js / Bun Backend
    participant PushService as Vendor Push Service

    Note over Server: 1. Generate VAPID Keys
    Browser->>Server: GET /api/vapid-public-key
    Server-->>Browser: Return Public VAPID Key

    User->>Browser: Grant Notification Permission
    Browser->>SW: Register Service Worker (/sw.js)
    Browser->>PushService: PushManager.subscribe(VAPID Public Key)
    PushService-->>Browser: Return PushSubscription (Endpoint & Keys)

    Browser->>Server: POST /api/subscribe (Send Subscription Object)
    Server-->>Browser: Subscription Stored on Server

    Note over Server: 2. Trigger Notification
    User->>Server: POST /api/send-notification (Payload & Delay)
    Server->>PushService: HTTPS POST (Encrypted Payload + VAPID Signature)
    PushService-->>SW: Push Event Dispatched to Background Worker
    SW->>User: Display Native System Notification
```

---

## 📁 Monorepo Structure

```
WaraWara-Web/
├── pnpm-workspace.yaml            # Monorepo workspace configuration
├── package.json                   # Root orchestrator scripts, Biome & TypeScript configs
├── biome.json                     # Root linter and formatter configuration
├── scripts/
│   └── generate-vapid.js          # Cryptographic keypair generator ('pnpm generate-vapid')
├── apps/
│   ├── node-web-push/             # Node.js implementation
│   │   ├── public/                # Static assets (HTML, CSS, JS, Service Worker)
│   │   ├── src/
│   │   │   ├── config.js          # Env & VAPID key resolution (native process.loadEnvFile)
│   │   │   ├── types.js           # JSDoc type contracts
│   │   │   ├── services/
│   │   │   │   ├── subscription.service.js  # Client push subscription storage
│   │   │   │   └── push.service.js          # Web-push client & multicast dispatch
│   │   │   ├── routes/
│   │   │   │   └── push.routes.js           # Express Router endpoints
│   │   │   └── app.js             # Express app setup & middleware
│   │   ├── server.js              # Clean entrypoint listener (port 3000)
│   │   ├── tsconfig.json          # JSDoc typecheck configuration
│   │   └── package.json           # Node package config
│   │
│   └── bun-web-push/              # Bun implementation
│       ├── public/                # Static assets (HTML, CSS, JS, Service Worker)
│       ├── src/
│       │   ├── config.ts          # Env & VAPID configuration
│       │   ├── types.ts           # TypeScript interfaces & DTOs
│       │   ├── services/
│       │   │   ├── subscription.service.ts  # Client push subscription storage
│       │   │   └── push.service.ts          # Web-push client & multicast dispatch
│       │   ├── routes/
│       │   │   └── push.routes.ts           # Typed Express Router endpoints
│       │   └── app.ts             # Express app factory
│       ├── server.ts              # Clean entrypoint listener (port 3001)
│       ├── tsconfig.json          # Bun TypeScript config
│       └── package.json           # Bun package config
└── README.md
```

---

## 🚀 Getting Started

### Pinned Experimental Runtime Specifications

| Runtime / Tool | Pinned Version | Version File | Config / Engine Constraint |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v24.15.0` | `.nvmrc`, `.node-version`, `.tool-versions` | `"node": ">=24.0.0 <25.0.0"` |
| **Bun** | `v1.4.2` | `.bun-version`, `.tool-versions` | `"bun": ">=1.4.0 <2.0.0"` |
| **pnpm** | `v10.25.0` | `package.json` (`packageManager`), `.tool-versions` | `"pnpm": ">=10.0.0"` |
| **Python** | `v3.13.5` | `.python-version`, `.tool-versions` | `requires-python = ">=3.10"` |

### Prerequisites

- [Node.js](https://nodejs.org/) (`v24.15.0` recommended, or `^24.x`)
- [Bun](https://bun.sh/) (`v1.4.2` recommended, or `^1.4.x`)
- [pnpm](https://pnpm.io/) (`v10.25.0`)
- [Python](https://www.python.org/) (`v3.13.5` recommended, or `>=3.10`)

### Installation & Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Generate your own secure VAPID Keypair**:
   ```bash
   pnpm generate-vapid
   ```
   > [!IMPORTANT]
   > This command creates a `.env` file containing freshly generated cryptographic keys:
   > - `VAPID_PUBLIC_KEY`: Safe to expose to browsers to authenticate subscriptions.
   > - `VAPID_PRIVATE_KEY`: Kept confidential on the server to sign push requests. Never commit `.env` to git!
   > - `VAPID_SUBJECT`: Contact URI (e.g. `mailto:admin@example.com`) required by vendor push relays.

---

## 🏃 Running the Servers

You can run either backend or both simultaneously on different ports:

### Option 1: Run Node.js Server (Port 3000)
```bash
pnpm start:node
```
Open your browser at: `http://localhost:3000`

### Option 2: Run Bun Server (Port 3001)
```bash
pnpm start:bun
```
Open your browser at: `http://localhost:3001`

*(For Bun development with auto-reload: `pnpm dev:bun`)*

### Option 3: Run Python FastAPI Server (Port 8000)
```bash
cd apps/fastapi-web-push

# Setup virtual environment (if not yet created):
python -m venv .venv
# Activate venv:
.venv\Scripts\activate   # On Windows PowerShell: .venv\Scripts\Activate.ps1
# Install editable package:
pip install -e ".[dev]"

# Run FastAPI with auto-reload:
uvicorn src.main:app --reload --port 8000
```
Open your browser at: `http://localhost:8000`

---

## ⚡ How to Test the Demo

1. **Request Permission**: Click **Request Permission** and select **Allow** in your browser's prompt.
2. **Subscribe**: Click **Subscribe to Web Push**. This retrieves the VAPID public key from the backend and registers a `PushSubscription`.
3. **Dispatch Notification**:
   - Enter a custom title and message body.
   - Click **Send Push Notification**.
4. **Test Scheduled Push**: Set a delay (e.g., `5` seconds), click send, and minimize/switch browser tabs to observe the background Service Worker receiving the push notification even when the tab isn't active!

---

## 🧹 Code Quality & Developer Tooling

This monorepo utilizes **[Biome](https://biomejs.dev/)** for ultra-fast linting and formatting, along with **TypeScript (`tsc`)** for static type checking across both Node.js and Bun packages:

| Command | Purpose |
| :--- | :--- |
| `pnpm lint` | Run Biome linter across the entire monorepo |
| `pnpm lint:fix` | Automatically apply safe and suggested lint fixes |
| `pnpm format` | Format all JS/TS/JSON/CSS files with Biome |
| `pnpm format:check` | Verify formatting consistency without modifying files |
| `pnpm typecheck` | Run parallel TypeScript type checking (`tsc --noEmit`) on all packages |
| `pnpm test` | Run automated test suites across all workspaces in parallel |
| `pnpm test:node` | Run Node.js native test suite (`node --test`) |
| `pnpm test:bun` | Run Bun native test suite (`bun test`) |
| `pnpm check` | Run all checks (linting, formatting, typecheck, and tests) in a single pass |

---

## Conclusion

This setup demonstrates that Web Push Notifications follow identical W3C Push protocol standards regardless of whether your server runs on **Node.js** or **Bun**. By using Express on Bun, you achieve seamless compatibility with standard Node libraries like `web-push` while leveraging Bun's fast startup and native TypeScript execution.
