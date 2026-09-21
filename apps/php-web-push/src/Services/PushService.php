<?php

declare(strict_types=1);

namespace App\Services;

use App\Config;
use App\Models\PushNotificationPayload;
use ErrorException;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushService
{
    private static ?PushService $instance = null;
    private WebPush $webPush;
    private SubscriptionService $subscriptionService;

    public function __construct(?SubscriptionService $subscriptionService = null)
    {
        $config = Config::getInstance();
        $config->validate();

        $auth = [
            'VAPID' => [
                'subject' => $config->vapidSubject,
                'publicKey' => $config->vapidPublicKey,
                'privateKey' => $config->vapidPrivateKey,
            ],
        ];

        $this->webPush = new WebPush($auth);
        $this->webPush->setReuseVAPIDHeaders(true);
        $this->subscriptionService = $subscriptionService ?? SubscriptionService::getInstance();
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Sends push notifications to all active subscriptions.
     * Automatically prunes expired endpoints (404 / 410 Gone).
     *
     * @return array{sent: int, failed: int, details: array<int, array<string, mixed>>}
     */
    public function sendPushToAll(PushNotificationPayload $payload): array
    {
        $subscriptions = $this->subscriptionService->getAllSubscriptions();
        $payloadJson = json_encode($payload->jsonSerialize());
        if ($payloadJson === false) {
            $payloadJson = '{}';
        }

        $sentCount = 0;
        $failedCount = 0;
        $details = [];

        foreach ($subscriptions as $sub) {
            $webPushSub = Subscription::create([
                'endpoint' => $sub->endpoint,
                'keys' => [
                    'p256dh' => $sub->keys->p256dh,
                    'auth' => $sub->keys->auth,
                ],
            ]);

            try {
                $this->webPush->queueNotification($webPushSub, $payloadJson);
            } catch (ErrorException $e) {
                $failedCount++;
                $details[] = [
                    'endpoint' => $sub->endpoint,
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        try {
            /** @var \Minishlink\WebPush\MessageSentReport $report */
            foreach ($this->webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                $isSuccess = $report->isSuccess();

                if ($isSuccess) {
                    $sentCount++;
                    $details[] = [
                        'endpoint' => $endpoint,
                        'success' => true,
                    ];
                } else {
                    $failedCount++;
                    $statusCode = $report->getResponse()?->getStatusCode();
                    $reason = (string) $report->getReason();

                    // If subscription expired or unsubscribed, prune from database
                    if ($report->isSubscriptionExpired() || $statusCode === 404 || $statusCode === 410) {
                        $this->subscriptionService->removeSubscription($endpoint);
                        $reason .= ' (Subscription expired and pruned)';
                    }

                    $details[] = [
                        'endpoint' => $endpoint,
                        'success' => false,
                        'statusCode' => $statusCode,
                        'error' => $reason,
                    ];
                }
            }
        } catch (\Throwable $e) {
            $failedCount++;
            $details[] = [
                'endpoint' => 'bulk-flush',
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        return [
            'sent' => $sentCount,
            'failed' => $failedCount,
            'details' => $details,
        ];
    }
}
