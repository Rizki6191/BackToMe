package database

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"backtome/config"
	"backtome/models"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(cfg.DBPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("gagal koneksi database: %w", err)
	}

	err = db.AutoMigrate(&models.Schedule{})
	if err != nil {
		return nil, fmt.Errorf("gagal auto migrate database: %w", err)
	}

	log.Println("Database SQLite terhubung dan migrasi berhasil!")
	return db, nil
}