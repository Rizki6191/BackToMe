package models

import (
	"gorm.io/gorm"
)

type Schedule struct {
	gorm.Model
	Title    string `json:"title" gorm:"not null"`
	Category string `json:"category" gorm:"not null"` // Custom: Ujian, PR, Ketemuan, dll
	Date     string `json:"date" gorm:"not null"`     // Format: YYYY-MM-DD
	Time     string `json:"time" gorm:"not null"`     // Format: HH:MM
	Link     string `json:"link"`                     // Opsional (Zoom, GDrive, Maps)
	ChatID   string `json:"chat_id" gorm:"not null"`  // ID Telegram penerima notif
}