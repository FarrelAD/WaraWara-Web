<?php

declare(strict_types=1);

namespace App\Models;

use JsonSerializable;

readonly class PushSubscription implements JsonSerializable
{
    public function __construct(
        public string $endpoint,
        public ?int $expirationTime,
        public PushSubscriptionKeys $keys
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        /** @var array<string, mixed> $keysData */
        $keysData = isset($data['keys']) && is_array($data['keys']) ? $data['keys'] : [];

        return new self(
            endpoint: (string) ($data['endpoint'] ?? ''),
            expirationTime: isset($data['expirationTime']) ? (int) $data['expirationTime'] : null,
            keys: PushSubscriptionKeys::fromArray($keysData)
        );
    }

    /**
     * @return array{endpoint: string, expirationTime: int|null, keys: array<string, string>}
     */
    public function jsonSerialize(): array
    {
        return [
            'endpoint' => $this->endpoint,
            'expirationTime' => $this->expirationTime,
            'keys' => $this->keys->jsonSerialize(),
        ];
    }
}
