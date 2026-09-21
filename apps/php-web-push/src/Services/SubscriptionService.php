<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PushSubscription;

class SubscriptionService
{
    private static ?SubscriptionService $instance = null;
    private string $storageFile;

    public function __construct(?string $storageFile = null)
    {
        $this->storageFile = $storageFile ?? dirname(__DIR__, 2) . '/storage/subscriptions.json';
        $storageDir = dirname($this->storageFile);
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0777, true);
        }
        if (!file_exists($this->storageFile)) {
            file_put_contents($this->storageFile, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * @return PushSubscription[]
     */
    public function getAllSubscriptions(): array
    {
        if (!file_exists($this->storageFile)) {
            return [];
        }

        $content = file_get_contents($this->storageFile);
        if (!$content) {
            return [];
        }

        /** @var mixed $data */
        $data = json_decode($content, true);
        if (!is_array($data)) {
            return [];
        }

        $subscriptions = [];
        foreach ($data as $item) {
            if (is_array($item) && isset($item['endpoint'])) {
                /** @var array<string, mixed> $item */
                $subscriptions[$item['endpoint']] = PushSubscription::fromArray($item);
            }
        }

        return array_values($subscriptions);
    }

    public function addSubscription(PushSubscription $subscription): string
    {
        $all = $this->getAllSubscriptions();
        $map = [];
        foreach ($all as $sub) {
            $map[$sub->endpoint] = $sub;
        }

        // Store or overwrite by endpoint
        $map[$subscription->endpoint] = $subscription;

        $export = array_map(fn (PushSubscription $s) => $s->jsonSerialize(), array_values($map));
        file_put_contents($this->storageFile, json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

        return substr(hash('sha256', $subscription->endpoint), 0, 16);
    }

    public function removeSubscription(string $endpoint): bool
    {
        $all = $this->getAllSubscriptions();
        $filtered = [];
        $found = false;

        foreach ($all as $sub) {
            if ($sub->endpoint === $endpoint) {
                $found = true;

                continue;
            }
            $filtered[] = $sub->jsonSerialize();
        }

        if ($found) {
            file_put_contents($this->storageFile, json_encode($filtered, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
        }

        return $found;
    }

    public function count(): int
    {
        return count($this->getAllSubscriptions());
    }

    public function clear(): void
    {
        file_put_contents($this->storageFile, json_encode([], JSON_PRETTY_PRINT), LOCK_EX);
    }
}
