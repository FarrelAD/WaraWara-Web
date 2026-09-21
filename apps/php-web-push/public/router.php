<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Config;
use App\Models\NotificationAction;
use App\Models\PushNotificationPayload;
use App\Models\PushSubscription;
use App\Services\PushService;
use App\Services\SubscriptionService;

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Router for API Endpoints
if (str_starts_with($uri, '/api/')) {
    header('Content-Type: application/json; charset=utf-8');

    try {
        $config = Config::getInstance();
        $subscriptionService = SubscriptionService::getInstance();

        if ($uri === '/api/vapid-public-key' && $method === 'GET') {
            echo json_encode([
                'publicKey' => $config->vapidPublicKey,
            ]);
            exit;
        }

        if ($uri === '/api/subscribe' && $method === 'POST') {
            $rawBody = file_get_contents('php://input');
            $data = json_decode($rawBody, true);

            if (!is_array($data) || empty($data['endpoint'])) {
                http_response_code(400);
                echo json_encode(['detail' => 'Invalid subscription object: missing endpoint']);
                exit;
            }

            $subscription = PushSubscription::fromArray($data);
            $subId = $subscriptionService->addSubscription($subscription);
            $total = $subscriptionService->count();

            error_log(sprintf('[PHP Server] New subscription registered (ID: %s). Total subscriptions: %d', $subId, $total));

            http_response_code(201);
            echo json_encode([
                'message' => 'Subscription stored successfully on PHP server',
                'id' => $subId,
                'totalSubscriptions' => $total,
            ]);
            exit;
        }

        if ($uri === '/api/send-notification' && $method === 'POST') {
            $total = $subscriptionService->count();
            if ($total === 0) {
                http_response_code(400);
                echo json_encode(['detail' => 'No active push subscriptions found on PHP server!']);
                exit;
            }

            $rawBody = file_get_contents('php://input');
            $data = json_decode($rawBody, true) ?: [];

            $actionsData = $data['actions'] ?? [
                ['action' => 'open', 'title' => 'Open App'],
                ['action' => 'close', 'title' => 'Dismiss'],
            ];

            $actions = array_map(
                fn (array $a) => NotificationAction::fromArray($a),
                $actionsData
            );

            $payload = new PushNotificationPayload(
                title: $data['title'] ?? 'Push Notification Demo (PHP)',
                body: $data['body'] ?? 'Hello from PHP Web Push server!',
                icon: $data['icon'] ?? '',
                image: $data['image'] ?? '',
                tag: $data['tag'] ?? 'demo-push',
                actions: $actions
            );

            $delay = isset($data['delaySeconds']) ? (int) $data['delaySeconds'] : 0;

            if ($delay > 0) {
                // In a lightweight CLI server environment without a job queue/Swoole/RoadRunner,
                // sleep in PHP before dispatching or return response.
                // To accurately deliver delayed notification without external queues:
                sleep($delay);
            }

            $pushService = PushService::getInstance();
            $results = $pushService->sendPushToAll($payload);

            echo json_encode([
                'message' => $delay > 0
                    ? sprintf('Notification delayed %d seconds and sent to %d subscriber(s)!', $delay, $total)
                    : 'Push notification process initiated on PHP!',
                'subscribersTargeted' => $total,
                'results' => $results,
            ]);
            exit;
        }

        http_response_code(404);
        echo json_encode(['detail' => 'API Route not found']);
        exit;
    } catch (\Throwable $e) {
        http_response_code(500);
        echo json_encode([
            'detail' => 'Internal Server Error: ' . $e->getMessage(),
        ]);
        exit;
    }
}

// Static File Server
$publicPath = __DIR__ . ($uri === '/' ? '/index.html' : $uri);
if (file_exists($publicPath) && !is_dir($publicPath)) {
    // Let PHP built-in server handle the file if returning false
    return false;
}

// Fallback to index.html
if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
    exit;
}

http_response_code(404);
echo 'Not Found';
