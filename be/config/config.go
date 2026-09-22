package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort       string
	AppEnv        string
	DatabaseURL   string
	TelegramToken string
	CronSecret    string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		AppPort:       getEnv("APP_PORT", "8080"),
		AppEnv:        getEnv("APP_ENV", "development"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		TelegramToken: getEnv("TELEGRAM_TOKEN", ""),
		CronSecret:    getEnv("CRON_SECRET", ""),
	}, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}