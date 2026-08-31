# Optik Sınav — Yaşam Döngüsü (State Machine)

## Durumlar

| Durum | Kod | Açıklama |
|-------|-----|----------|
| Taslak | `DRAFT` | Sınav oluşturuldu, tanım eksik |
| Yapılandırıldı | `CONFIGURED` | Bölüm/soru/kazanım tamam, anahtar eksik olabilir |
| Okutmaya hazır | `READY_FOR_SCAN` | Cevap anahtarı kilitlendi |
| Okutuluyor | `SCANNING` | Masaüstü batch açık |
| İncelemede | `IN_REVIEW` | Batch web'e geldi, rehberlik onayı bekliyor |
| Yayınlandı | `PUBLISHED` | Veli/öğretmen görebilir |
| Arşiv | `ARCHIVED` | Salt okunur |

## Geçişler

```
DRAFT → CONFIGURED          (bölüm + soru + kazanım tamam)
CONFIGURED → READY_FOR_SCAN  (anahtar tamam + checklist)
READY_FOR_SCAN → SCANNING    (masaüstü batch başlatır)
SCANNING → IN_REVIEW         (batch API'ye gönderildi)
IN_REVIEW → READY_FOR_SCAN   (batch reddedildi / düzeltme)
IN_REVIEW → PUBLISHED        (rehberlik onaylar)
PUBLISHED → ARCHIVED         (manuel)
DRAFT → ARCHIVED             (iptal)
```

## Kilit kuralları

- `READY_FOR_SCAN` sonrası soru/anahtar değişirse `definitionVersion` artar.
- Batch kayıtları `definitionVersion` ile bağlı kalır.
- `PUBLISHED` sonrası anahtar değişmez; düzeltme audit + yeniden hesaplama gerekir.

## Okutmaya aç checklist

1. En az bir bölüm tanımlı
2. Tüm sorular numaralandırılmış
3. Her soruda kazanım (`outcomeId`) atanmış
4. Her soruda cevap anahtarı girilmiş
5. Seçili optik şablon soru sayısı ile eşleşiyor

## Batch hata kodları

| Kod | Açıklama |
|-----|----------|
| `TC_MISSING` | TC okunamadı |
| `TC_INVALID` | TC formatı geçersiz |
| `STUDENT_NOT_FOUND` | TC sistemde yok |
| `OUT_OF_SCOPE` | Öğrenci sınav kapsamı dışında |
| `DUPLICATE_TC` | Aynı batch'te tekrar |
| `LOW_CONFIDENCE` | Okuma güven skoru düşük |
| `AMBIGUOUS_ANSWER` | Çift işaretli soru |
| `VERSION_MISMATCH` | Sınav sürümü uyuşmuyor |
