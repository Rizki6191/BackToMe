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
		h.sendTelegramNotification(s)
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

func reminderSlot(t time.Time) time.Time {
	minute := t.Minute()

	if minute < 30 {
		minute = 0
	} else {
		minute = 30
	}

	return time.Date(
		t.Year(),
		t.Month(),
		t.Day(),
		t.Hour(),
		minute,
		0,
		0,
		t.Location(),
	)
}

// Fungsi untuk mengecek jadwal dan mengirim reminder otomatis
func (h *ScheduleHandler) CheckReminders() {
	var schedules []models.Schedule

	if err := h.DB.Find(&schedules).Error; err != nil {
		fmt.Println("Gagal mengambil jadwal:", err)
		return
	}

	now := time.Now()

	// Waktu sekarang dibulatkan ke slot 30 menit:
	// 12:00 - 12:29 -> 12:00
	// 12:30 - 12:59 -> 12:30
	currentSlot := reminderSlot(now)

	for _, s := range schedules {
		scheduleTimeStr := fmt.Sprintf("%s %s", s.Date, s.Time)

		scheduleTime, err := time.ParseInLocation(
			"2006-01-02 15:04",
			scheduleTimeStr,
			time.Local,
		)

		if err != nil {
			fmt.Println("Gagal parsing waktu jadwal:", err)
			continue
		}

		// Tentukan waktu reminder
		reminder3Days := scheduleTime.Add(-72 * time.Hour)
		reminder1Day := scheduleTime.Add(-24 * time.Hour)
		reminder3Hours := scheduleTime.Add(-3 * time.Hour)
		reminder1Hour := scheduleTime.Add(-1 * time.Hour)

		// Masukkan target ke slot 30 menit
		reminder3DaysSlot := reminderSlot(reminder3Days)
		reminder1DaySlot := reminderSlot(reminder1Day)
		reminder3HoursSlot := reminderSlot(reminder3Hours)
		reminder1HourSlot := reminderSlot(reminder1Hour)

		// H-3 Hari
		if currentSlot.Equal(reminder3DaysSlot) {
			h.sendReminderNotification(s, "3 Hari Lagi 🗓️")
		}

		// H-1 Hari
		if currentSlot.Equal(reminder1DaySlot) {
			h.sendReminderNotification(s, "1 Hari Lagi (Besok!) ⚠️")
		}

		// 3 Jam
		if currentSlot.Equal(reminder3HoursSlot) {
			h.sendReminderNotification(s, "3 Jam Lagi! ⏰")
		}

		// 1 Jam
		if currentSlot.Equal(reminder1HourSlot) {
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
