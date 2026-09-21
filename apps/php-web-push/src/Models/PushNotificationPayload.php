<?php

declare(strict_types=1);

namespace App\Models;

use JsonSerializable;

readonly class PushNotificationPayload implements JsonSerializable
{
    /**
     * @param NotificationAction[] $actions
     */
    public function __construct(
        public string $title,
        public string $body,
        public string $icon = '',
        public string $image = '',
        public string $tag = 'demo-push',
        public array $actions = []
    ) {
    }

    /**
     * @return array{title: string, body: string, icon: string, image: string, tag: string, actions: array<int, array<string, string>>}
     */
    public function jsonSerialize(): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'icon' => $this->icon,
            'image' => $this->image,
            'tag' => $this->tag,
            'actions' => array_map(fn (NotificationAction $a) => $a->jsonSerialize(), $this->actions),
        ];
    }
}
