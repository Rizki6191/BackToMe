package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort        string
	AppEnv         string
	DBPath         string
	TelegramToken  string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		AppPort:       getEnv("APP_PORT", "8080"),
		AppEnv:        getEnv("APP_ENV", "development"),
		DBPath:        getEnv("DB_PATH", "./schedule.db"),
		TelegramToken: getEnv("TELEGRAM_TOKEN", ""),
	}, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}