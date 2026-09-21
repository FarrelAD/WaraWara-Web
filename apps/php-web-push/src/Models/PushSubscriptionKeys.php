<?php

declare(strict_types=1);

namespace App\Models;

use JsonSerializable;

readonly class PushSubscriptionKeys implements JsonSerializable
{
    public function __construct(
        public string $p256dh,
        public string $auth
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            p256dh: (string) ($data['p256dh'] ?? ''),
            auth: (string) ($data['auth'] ?? '')
        );
    }

    /**
     * @return array<string, string>
     */
    public function jsonSerialize(): array
    {
        return [
            'p256dh' => $this->p256dh,
            'auth' => $this->auth,
        ];
    }
}
