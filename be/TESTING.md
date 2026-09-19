curl -X POST http://localhost:1337/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ujian Algoritma",
    "category": "Ujian",
    "date": "2026-06-06",
    "time": "10:00",
    "link": "https://zoom.us/contoh",
    "chat_id": "8172524004"
  }'

curl -X DELETE http://localhost:1337/schedules/ID