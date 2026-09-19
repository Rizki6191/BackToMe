package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"backtome/config"
	"backtome/models"
)

type ScheduleHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

func NewScheduleHandler(db *gorm.DB, cfg *config.Config) *ScheduleHandler {
	return &ScheduleHandler{DB: db, Cfg: cfg}
}

func (h *ScheduleHandler) cleanExpiredSchedules() {
	today := time.Now().Format("2006-01-02")

	res := h.DB.Where("date < ?", today).Delete(&models.Schedule{})
	if res.Error != nil {
		fmt.Print("Gagal Membersihkan", res.Error)
		return
	}

	if res.RowsAffected > 0 {
		fmt.Printf("menghapus...\n", res.RowsAffected)
	}
}

// GetSchedules - Ambil semua jadwal
func (h *ScheduleHandler) GetSchedules(c *gin.Context) {
	h.cleanExpiredSchedules()

	var schedules []models.Schedule
	if err := h.DB.Find(&schedules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}

// CreateSchedule - Tambah jadwal baru + Kirim Notif Telegram
func (h *ScheduleHandler) CreateSchedule(c *gin.Context) {
	var s models.Schedule
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Simpan ke database via GORM
	if err := h.DB.Create(&s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Kirim Notifikasi Telegram secara asinkron (goroutine) jika token tersedia
	if h.Cfg.TelegramToken != "" && s.ChatID != "" {
		go h.sendTelegramNotification(s)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jadwal berhasil ditambahkan!", "data": s})
}

func (h *ScheduleHandler) DeleteSchedule(c *gin.Context) {
	id := c.Param("id")

	var s models.Schedule
	// Cek apakah data ada
	if err := h.DB.First(&s, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal tidak ditemukan"})
		return
	}

	// Hapus dari database
	if err := h.DB.Delete(&s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jadwal berhasil dihapus!"})
}

// sendTelegramNotification - Fungsi Kirim Telegram
func (h *ScheduleHandler) sendTelegramNotification(s models.Schedule) {
	message := fmt.Sprintf("🔔 *JADWAL BARU: %s*\n\n📂 Kategori: %s\n📅 Tanggal: %s\n⏰ Jam: %s", s.Title, s.Category, s.Date, s.Time)
	if s.Link != "" {
		message += fmt.Sprintf("\n🔗 Link Terkait: %s", s.Link)
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", h.Cfg.TelegramToken)
	resp, err := http.PostForm(apiURL, url.Values{
		"chat_id":    {s.ChatID},
		"text":       {message},
		"parse_mode": {"Markdown"},
	})
	if err != nil {
		fmt.Println("Gagal mengirim notif telegram:", err)
		return
	}
	defer resp.Body.Close()
}

// Fungsi untuk mengecek jadwal dan mengirim reminder otomatis
func (h *ScheduleHandler) CheckReminders() {
	var schedules []models.Schedule
	if err := h.DB.Find(&schedules).Error; err != nil {
		return
	}

	// Waktu server saat ini
	now := time.Now()

	for _, s := range schedules {
		// Parsing tanggal dan jam dari database
		scheduleTimeStr := fmt.Sprintf("%s %s", s.Date, s.Time)
		scheduleTime, err := time.ParseInLocation("2006-01-02 15:04", scheduleTimeStr, time.Local)
		if err != nil {
			continue
		}

		// Hitung selisih waktu dalam satuan MENIT
		diff := scheduleTime.Sub(now)
		minutesRemaining := int(diff.Minutes()) // Konversi ke integer menit

		// Karena cron berjalan setiap 3 menit, kita beri toleransi jendela 3 menit (0 sampai 3 menit)
		// Ini menjamin notifikasi HANYA terkirim 1x dalam rentang menit tersebut.

		// 1. Reminder H-3 Hari (3 hari = 4320 menit)
		if minutesRemaining >= 4317 && minutesRemaining <= 4320 {
			h.sendReminderNotification(s, "3 Hari Lagi 🗓️")
		}

		// 2. Reminder H-1 Hari (1 hari = 1440 menit)
		if minutesRemaining >= 1437 && minutesRemaining <= 1440 {
			h.sendReminderNotification(s, "1 Hari Lagi (Besok!) ⚠️")
		}

		// 3. Reminder 3 Jam Sebelumnya (3 jam = 180 menit)
		if minutesRemaining >= 177 && minutesRemaining <= 180 {
			h.sendReminderNotification(s, "3 Jam Lagi! ⏰")
		}

		// 4. Reminder 1 Jam Sebelumnya (1 jam = 60 menit)
		if minutesRemaining >= 57 && minutesRemaining <= 60 {
			h.sendReminderNotification(s, "1 Jam Lagi! ⏰")
		}
	}
}

// Helper khusus kirim format pesan pengingat
func (h *ScheduleHandler) sendReminderNotification(s models.Schedule, status string) {
	message := fmt.Sprintf("🔔 *PENGINGAT JADWAL: %s*\n\n📌 Status: *%s*\n📂 Kategori: %s\n📅 Tanggal: %s\n⏰ Jam: %s", s.Title, status, s.Category, s.Date, s.Time)
	if s.Link != "" {
		message += fmt.Sprintf("\n🔗 Link Terkait: %s", s.Link)
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", h.Cfg.TelegramToken)
	resp, err := http.PostForm(apiURL, url.Values{
		"chat_id":    {s.ChatID},
		"text":       {message},
		"parse_mode": {"Markdown"},
	})
	if err != nil {
		fmt.Println("Gagal mengirim reminder telegram:", err)
		return
	}
	defer resp.Body.Close()
}