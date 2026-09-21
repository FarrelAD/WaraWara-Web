<?php

declare(strict_types=1);

namespace App;

use Dotenv\Dotenv;
use RuntimeException;

class Config
{
    private static ?Config $instance = null;

    public readonly string $vapidPublicKey;
    public readonly string $vapidPrivateKey;
    public readonly string $vapidSubject;
    public readonly int $port;

    private function __construct()
    {
        // Correct directory paths:
        // Config.php is in apps/php-web-push/src/
        // $appDir -> apps/php-web-push (dirname(__DIR__))
        // $rootDir -> repo root (dirname(__DIR__, 2))
        $appDir = dirname(__DIR__);
        $rootDir = dirname($appDir, 2);

        $possibleEnvDirs = [$rootDir, $appDir, getcwd()];
        foreach ($possibleEnvDirs as $dir) {
            if ($dir && file_exists($dir . '/.env')) {
                $dotenv = Dotenv::createImmutable($dir);
                $dotenv->safeLoad();

                break;
            }
        }

        $this->vapidPublicKey = $_ENV['VAPID_PUBLIC_KEY'] ?? getenv('VAPID_PUBLIC_KEY') ?: '';
        $this->vapidPrivateKey = $_ENV['VAPID_PRIVATE_KEY'] ?? getenv('VAPID_PRIVATE_KEY') ?: '';
        $this->vapidSubject = $_ENV['VAPID_SUBJECT'] ?? getenv('VAPID_SUBJECT') ?: 'mailto:admin@example.com';
        $this->port = (int) ($_ENV['PORT'] ?? getenv('PORT') ?: 8000);
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function validate(): void
    {
        if (empty($this->vapidPublicKey) || empty($this->vapidPrivateKey)) {
            throw new RuntimeException(
                'CRITICAL: VAPID keys are missing! Please define VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env file or run "pnpm generate-vapid".'
            );
        }
    }
}
