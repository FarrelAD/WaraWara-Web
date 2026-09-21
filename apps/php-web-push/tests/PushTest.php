<?php

declare(strict_types=1);

namespace App\Tests;

use App\Models\NotificationAction;
use App\Models\PushNotificationPayload;
use App\Models\PushSubscription;
use App\Models\PushSubscriptionKeys;
use App\Services\SubscriptionService;
use PHPUnit\Framework\TestCase;

class PushTest extends TestCase
{
    private string $tempStorage;

    protected function setUp(): void
    {
        $this->tempStorage = sys_get_temp_dir() . '/test_subs_' . uniqid() . '.json';
    }

    protected function tearDown(): void
    {
        if (file_exists($this->tempStorage)) {
            unlink($this->tempStorage);
        }
    }

    public function testPushSubscriptionModelSerialization(): void
    {
        $data = [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/sample-token',
            'expirationTime' => null,
            'keys' => [
                'p256dh' => 'BDV8L2yv_test_key',
                'auth' => 'sample_auth_token',
            ],
        ];

        $sub = PushSubscription::fromArray($data);

        $this->assertSame('https://fcm.googleapis.com/fcm/send/sample-token', $sub->endpoint);
        $this->assertNull($sub->expirationTime);
        $this->assertSame('BDV8L2yv_test_key', $sub->keys->p256dh);
        $this->assertSame('sample_auth_token', $sub->keys->auth);

        $serialized = $sub->jsonSerialize();
        $this->assertSame($data['endpoint'], $serialized['endpoint']);
        $this->assertSame($data['keys']['p256dh'], $serialized['keys']['p256dh']);
    }

    public function testPushNotificationPayloadSerialization(): void
    {
        $action = new NotificationAction(action: 'open', title: 'Open App');
        $payload = new PushNotificationPayload(
            title: 'Test Notification',
            body: 'Hello from PHP Test',
            icon: '/icon.png',
            image: '/banner.png',
            tag: 'test-tag',
            actions: [$action]
        );

        $serialized = $payload->jsonSerialize();

        $this->assertSame('Test Notification', $serialized['title']);
        $this->assertSame('Hello from PHP Test', $serialized['body']);
        $this->assertCount(1, $serialized['actions']);
        $this->assertSame('open', $serialized['actions'][0]['action']);
    }

    public function testSubscriptionServiceAddAndRemove(): void
    {
        $service = new SubscriptionService($this->tempStorage);

        $this->assertSame(0, $service->count());

        $sub = new PushSubscription(
            endpoint: 'https://push.services.mozilla.com/v1/sub/12345',
            expirationTime: null,
            keys: new PushSubscriptionKeys(
                p256dh: 'dummy_p256dh',
                auth: 'dummy_auth'
            )
        );

        $id = $service->addSubscription($sub);
        $this->assertSame(16, strlen($id));
        $this->assertSame(1, $service->count());

        $fetched = $service->getAllSubscriptions();
        $this->assertCount(1, $fetched);
        $this->assertSame('https://push.services.mozilla.com/v1/sub/12345', $fetched[0]->endpoint);

        $removed = $service->removeSubscription('https://push.services.mozilla.com/v1/sub/12345');
        $this->assertTrue($removed);
        $this->assertSame(0, $service->count());
    }
}
