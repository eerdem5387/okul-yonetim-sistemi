# 🔗 Webhook Entegrasyonu - Kurulum Rehberi

Bu dokümantasyon, başvuru sisteminden gelen başvuruların okul yönetim sistemine entegre edilmesi için gerekli adımları içerir.

## ✅ Tamamlanan İşlemler

1. ✅ Prisma schema'ya `Basvuru` modeli eklendi
2. ✅ Webhook endpoint oluşturuldu (`/api/webhook/basvuru`)
3. ✅ Başvuruları listelemek için API endpoint oluşturuldu (`/api/basvurular`)
4. ✅ Başvuruları görüntülemek için sayfa oluşturuldu (`/basvurular`)
5. ✅ Dashboard'a başvurular linki eklendi

## 📋 Yapılması Gerekenler

### 1. Veritabanı Migration

Prisma schema'ya yeni model eklendi. Migration çalıştırmanız gerekiyor:

```bash
# Development için
npx prisma migrate dev --name add_basvuru_model

# Veya production için
npx prisma migrate deploy
```

### 2. Environment Variables

Vercel dashboard'unda veya `.env.local` dosyasına şu değişkeni ekleyin:

```env
# Webhook Secret - Başvuru sistemi ile aynı olmalı
WEBHOOK_SECRET=your-super-secret-key-here-min-32-chars
```

**ÖNEMLİ:** Bu secret, başvuru sistemindeki (`basvuru-sistemi`) `WEBHOOK_SECRET` ile **tamamen aynı** olmalı!

### 3. Başvuru Sisteminde Webhook URL Ayarlama

Başvuru sisteminde (`basvuru-sistemi` projesi) Vercel environment variables'a şunu ekleyin:

```env
WEBHOOK_URL=https://okul-yonetim-sistemi.vercel.app/api/webhook/basvuru
WEBHOOK_SECRET=your-super-secret-key-here-min-32-chars
```

**Not:** `okul-yonetim-sistemi.vercel.app` yerine kendi Vercel domain'inizi kullanın.

## 🎯 Kullanım

### Başvuruları Görüntüleme

1. Dashboard'a gidin
2. "Başvurular" kartına tıklayın
3. Başvuruları listeleyin, arayın ve detaylarını görüntüleyin

### Webhook Test Etme

Webhook'un çalışıp çalışmadığını test etmek için:

```bash
curl -X POST https://okul-yonetim-sistemi.vercel.app/api/webhook/basvuru \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret-key" \
  -H "X-Webhook-Source: basvuru-sistemi" \
  -d '{
    "id": "test-123",
    "ogrenciAdSoyad": "TEST ÖĞRENCİ",
    "ogrenciTc": "12345678901",
    "okul": "Test Okulu",
    "ogrenciSinifi": "5. Sınıf",
    "babaAdSoyad": "TEST BABA",
    "babaMeslek": "Test Meslek",
    "babaIsAdresi": null,
    "babaCepTel": "5551234567",
    "anneAdSoyad": "TEST ANNE",
    "anneMeslek": "Test Meslek",
    "anneIsAdresi": null,
    "anneCepTel": "5557654321",
    "email": "test@example.com",
    "createdAt": "2025-01-27T10:00:00.000Z",
    "updatedAt": "2025-01-27T10:00:00.000Z"
  }'
```

## 📊 Veritabanı Yapısı

### Basvuru Modeli

```prisma
model Basvuru {
  id               String   @id @default(cuid())
  externalId       String   @unique // Başvuru sistemindeki ID
  ogrenciAdSoyad   String
  ogrenciTc        String
  okul             String
  ogrenciSinifi    String
  babaAdSoyad      String
  babaMeslek       String
  babaIsAdresi     String?
  babaCepTel       String
  anneAdSoyad      String
  anneMeslek       String
  anneIsAdresi     String?
  anneCepTel       String
  email            String
  createdAt        DateTime @default(now())
  syncedAt         DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([externalId])
  @@index([ogrenciTc])
  @@index([email])
  @@index([createdAt])
  @@map("basvurular")
}
```

## 🔒 Güvenlik

- Webhook secret ile doğrulama yapılır
- Source header kontrolü yapılır
- Duplicate kayıtlar engellenir
- Tüm hatalar loglanır

## 🐛 Sorun Giderme

### Webhook Çalışmıyor

1. ✅ `WEBHOOK_SECRET` her iki projede de aynı mı?
2. ✅ `WEBHOOK_URL` doğru mu?
3. ✅ Vercel logs'larını kontrol edin
4. ✅ Migration çalıştırıldı mı?

### Başvurular Görünmüyor

1. ✅ Veritabanında kayıt var mı kontrol edin
2. ✅ API endpoint çalışıyor mu test edin (`/api/basvurular`)
3. ✅ Browser console'da hata var mı kontrol edin

### 401 Unauthorized Hatası

- `WEBHOOK_SECRET` her iki projede de aynı olmalı
- Header'da `X-Webhook-Secret` doğru gönderiliyor mu kontrol edin

## 📝 Notlar

- Başvurular otomatik olarak webhook ile gelir
- Duplicate kayıtlar engellenir (aynı `externalId` ile)
- Başvurular `/basvurular` sayfasından görüntülenebilir
- Arama ve filtreleme özellikleri mevcuttur

## 🚀 Sonraki Adımlar

1. ✅ Migration çalıştırın
2. ✅ Environment variables'ları ayarlayın
3. ✅ Başvuru sisteminde webhook URL'ini ayarlayın
4. ✅ Test başvurusu gönderin
5. ✅ Başvuruları görüntüleyin

Sorularınız için issue açabilir veya iletişime geçebilirsiniz! 🎉

