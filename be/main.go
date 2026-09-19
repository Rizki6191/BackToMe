package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"

	"backtome/config"
	"backtome/database"
	"backtome/handlers"
)

func main() {
	// Set timezone ke Asia/Jakarta
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Println("Gagal memuat timezone Asia/Jakarta:", err)
	} else {
		time.Local = loc
	}

	// Load Konfigurasi dari .env
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Gagal memuat konfigurasi:", err)
	}

	// Koneksi Database GORM & AutoMigrate
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}

	// Inisialisasi Handler dengan dependency DB dan Config
	scheduleHandler := handlers.NewScheduleHandler(db, cfg)

	// Setup Router Gin
	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Endpoints / Routes
	r.GET("/schedules", scheduleHandler.GetSchedules)
	r.POST("/schedules", scheduleHandler.CreateSchedule)
	r.DELETE("/schedules/:id", scheduleHandler.DeleteSchedule)

	// --- ENDPOINT KHUSUS UNTUK CRON-JOB.ORG ---
	r.GET("/cron/check", func(c *gin.Context) {
		// Menjalankan fungsi pengecekan reminder Anda
		scheduleHandler.CheckReminders()

		// Memberikan respon sukses ke cron-job.org
		c.JSON(200, gin.H{
			"status":  "success",
			"message": "Reminder check executed successfully",
		})
	})
	// ------------------------------------------

	fmt.Printf("Server Gin berjalan di port %s...\n", cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
