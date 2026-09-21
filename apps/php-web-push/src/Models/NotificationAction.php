<?php

declare(strict_types=1);

namespace App\Models;

use JsonSerializable;

readonly class NotificationAction implements JsonSerializable
{
    public function __construct(
        public string $action,
        public string $title
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            action: (string) ($data['action'] ?? ''),
            title: (string) ($data['title'] ?? '')
        );
    }

    /**
     * @return array<string, string>
     */
    public function jsonSerialize(): array
    {
        return [
            'action' => $this->action,
            'title' => $this->title,
        ];
    }
}
