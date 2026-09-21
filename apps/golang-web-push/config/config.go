package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// Config holds the application configuration.
type Config struct {
	Port            string
	VapidPublicKey  string
	VapidPrivateKey string
	VapidSubject    string
}

var AppConfig *Config

// LoadConfig reads configuration from environment variables or .env files.
func LoadConfig() *Config {
	// Try loading .env from current directory or monorepo root
	_ = godotenv.Load()
	_ = godotenv.Load(filepath.Join("..", "..", ".env"))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	AppConfig = &Config{
		Port:            port,
		VapidPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		VapidPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		VapidSubject:    os.Getenv("VAPID_SUBJECT"),
	}

	return AppConfig
}

// Validate ensures required VAPID keys are provided.
func (c *Config) Validate() {
	if c.VapidPublicKey == "" || c.VapidPrivateKey == "" {
		log.Println("[WARNING] VAPID keys are missing! Web Push notifications will fail.")
		log.Println("[TIP] Run 'pnpm generate-vapid' from the monorepo root and configure your .env file.")
	}
}
