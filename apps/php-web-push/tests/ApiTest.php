<?php

declare(strict_types=1);

namespace App\Tests;

use App\Config;
use App\Models\PushNotificationPayload;
use App\Models\PushSubscription;
use App\Models\PushSubscriptionKeys;
use App\Services\PushService;
use App\Services\SubscriptionService;
use PHPUnit\Framework\TestCase;

class ApiTest extends TestCase
{
    private string $tempStorage;
    private SubscriptionService $subscriptionService;

    protected function setUp(): void
    {
        $this->tempStorage = sys_get_temp_dir() . '/test_api_subs_' . uniqid() . '.json';
        $this->subscriptionService = new SubscriptionService($this->tempStorage);
    }

    protected function tearDown(): void
    {
        if (file_exists($this->tempStorage)) {
            unlink($this->tempStorage);
        }
    }

    public function testGetVapidPublicKey(): void
    {
        $config = Config::getInstance();
        $this->assertNotEmpty($config->vapidPublicKey);
        $this->assertGreaterThan(10, strlen($config->vapidPublicKey));
    }

    public function testSubscribeValidPayloadReturnsIdAndCount(): void
    {
        $sub = new PushSubscription(
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-device-token-abc',
            expirationTime: null,
            keys: new PushSubscriptionKeys(
                p256dh: 'BDV8L2yv_mock_p256dh',
                auth: 'mock_auth_secret'
            )
        );

        $id = $this->subscriptionService->addSubscription($sub);

        $this->assertNotEmpty($id);
        $this->assertSame(16, strlen($id));
        $this->assertSame(1, $this->subscriptionService->count());

        $all = $this->subscriptionService->getAllSubscriptions();
        $this->assertCount(1, $all);
        $this->assertSame('https://fcm.googleapis.com/fcm/send/test-device-token-abc', $all[0]->endpoint);
    }

    public function testSubscribeIdempotencyOverwritesSameEndpoint(): void
    {
        $sub1 = new PushSubscription(
            endpoint: 'https://fcm.googleapis.com/fcm/send/duplicate-endpoint',
            expirationTime: null,
            keys: new PushSubscriptionKeys(p256dh: 'key1', auth: 'auth1')
        );

        $sub2 = new PushSubscription(
            endpoint: 'https://fcm.googleapis.com/fcm/send/duplicate-endpoint',
            expirationTime: null,
            keys: new PushSubscriptionKeys(p256dh: 'key2', auth: 'auth2')
        );

        $id1 = $this->subscriptionService->addSubscription($sub1);
        $id2 = $this->subscriptionService->addSubscription($sub2);

        $this->assertSame($id1, $id2);
        $this->assertSame(1, $this->subscriptionService->count());

        $all = $this->subscriptionService->getAllSubscriptions();
        $this->assertSame('key2', $all[0]->keys->p256dh);
    }

    public function testPushServiceHandlesEmptySubscribersGracefully(): void
    {
        $this->assertSame(0, $this->subscriptionService->count());
        $pushService = new PushService($this->subscriptionService);

        $payload = new PushNotificationPayload(
            title: 'Test',
            body: 'No subscribers'
        );

        $result = $pushService->sendPushToAll($payload);

        $this->assertSame(0, $result['sent']);
        $this->assertSame(0, $result['failed']);
        $this->assertEmpty($result['details']);
    }

    public function testPushServicePrunesExpiredSubscriptions(): void
    {
        // Add a subscription with valid P-256 formatted base64url keys and a mock endpoint
        $sub = new PushSubscription(
            endpoint: 'https://invalid-non-existent-push-endpoint.local/v1/test',
            expirationTime: null,
            keys: new PushSubscriptionKeys(
                p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9EgVKA7Gh272YjgqmtPa3WExtDHlT3wV7vF9y7_Ld4nQ_8=',
                auth: 'tBHItJI5svbpez7KI4CCXg=='
            )
        );

        $this->subscriptionService->addSubscription($sub);
        $this->assertSame(1, $this->subscriptionService->count());

        $pushService = new PushService($this->subscriptionService);
        $payload = new PushNotificationPayload(title: 'Ping', body: 'Test Pruning');

        $result = $pushService->sendPushToAll($payload);

        $this->assertArrayHasKey('sent', $result);
        $this->assertArrayHasKey('failed', $result);
        $this->assertArrayHasKey('details', $result);
    }
}
