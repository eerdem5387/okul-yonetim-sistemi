# 🔍 Debug Rehberi - Başvurular Görünmüyor

Bu rehber, başvuruların neden görünmediğini tespit etmek için adım adım kontrol listesidir.

## 📋 Kontrol Listesi

### 1. Environment Variables Kontrolü

#### Başvuru Sisteminde (basvuru-sistemi)
```bash
# Vercel'de kontrol edin veya local'de:
echo $WEBHOOK_URL
echo $WEBHOOK_SECRET
```

**Kontrol:**
- [ ] `WEBHOOK_URL` tanımlı mı?
- [ ] `WEBHOOK_URL` doğru mu? (okul yönetim sisteminin URL'i)
- [ ] `WEBHOOK_SECRET` tanımlı mı?

#### Okul Yönetim Sisteminde (okul-yonetim-sistemi)
```bash
echo $WEBHOOK_SECRET
```

**Kontrol:**
- [ ] `WEBHOOK_SECRET` tanımlı mı?
- [ ] Başvuru sistemi ile **AYNI** mı?

---

### 2. Veritabanında Kayıt Var mı?

Okul yönetim sisteminde debug endpoint'ini kullanın:

**Browser'da:**
```
http://localhost:3001/api/debug/basvurular
```

veya production'da:
```
https://okul-yonetim-sistemi.vercel.app/api/debug/basvurular
```

**Beklenen çıktı:**
```json
{
  "count": 5,
  "basvurular": [...],
  "message": "5 başvuru bulundu"
}
```

**Eğer count = 0 ise:**
- Webhook çalışmıyor demektir
- Aşağıdaki adımlara geçin

---

### 3. Webhook Logs Kontrolü

#### Başvuru Sisteminde (Vercel Logs)

Vercel Dashboard → basvuru-sistemi → Logs

**Aranacak loglar:**
- `[Webhook] Başarılı` - Webhook başarıyla gönderildi
- `[Webhook] Tüm denemeler başarısız` - Webhook başarısız
- `[Webhook] WEBHOOK_URL tanımlı değil` - URL eksik
- `[Webhook] Client error` - 4xx hatası

#### Okul Yönetim Sisteminde (Vercel Logs)

Vercel Dashboard → okul-yonetim-sistemi → Logs

**Aranacak loglar:**
- `[Webhook] Başvuru başarıyla alındı` - Başarılı
- `[Webhook] Geçersiz secret` - Secret yanlış
- `[Webhook] WEBHOOK_SECRET tanımlı değil` - Secret eksik
- `[Webhook] Hata:` - Genel hata

---

### 4. Webhook Test Etme

#### Manuel Test

```bash
# Terminal'de
curl -X POST https://okul-yonetim-sistemi.vercel.app/api/webhook/basvuru \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_SECRET_HERE" \
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

**Beklenen yanıt:**
```json
{
  "success": true,
  "message": "Başvuru alındı",
  "id": "..."
}
```

---

### 5. API Endpoint Kontrolü

Okul yönetim sisteminde başvurular API'sini test edin:

**Browser'da:**
```
http://localhost:3001/api/basvurular
```

**Beklenen çıktı:**
```json
{
  "basvurular": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 6. Frontend Kontrolü

Browser Console'u açın (F12) ve şunları kontrol edin:

1. **Network Tab:**
   - `/api/basvurular` isteği var mı?
   - Status code 200 mı?
   - Response'da veri var mı?

2. **Console Tab:**
   - Hata mesajı var mı?
   - `Error fetching basvurular` mesajı var mı?

---

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun 1: Veritabanında Kayıt Yok

**Sebep:** Webhook çalışmıyor

**Çözüm:**
1. Environment variables'ları kontrol edin
2. Vercel logs'larını kontrol edin
3. Webhook URL'in doğru olduğundan emin olun
4. Secret'ların aynı olduğundan emin olun

---

### Sorun 2: 401 Unauthorized

**Sebep:** Secret'lar farklı

**Çözüm:**
- Her iki projede de `WEBHOOK_SECRET` aynı olmalı
- Vercel'de environment variables'ları kontrol edin
- Redeploy yapın (environment variables değişikliği için)

---

### Sorun 3: Connection Refused / Network Error

**Sebep:** Webhook URL yanlış veya okul yönetim sistemi çalışmıyor

**Çözüm:**
- `WEBHOOK_URL` doğru mu kontrol edin
- Okul yönetim sisteminin çalıştığından emin olun
- Vercel deployment'ını kontrol edin

---

### Sorun 4: Veritabanında Kayıt Var Ama Görünmüyor

**Sebep:** Frontend veya API sorunu

**Çözüm:**
1. `/api/debug/basvurular` endpoint'ini kontrol edin
2. `/api/basvurular` endpoint'ini kontrol edin
3. Browser console'da hata var mı kontrol edin
4. Network tab'da API response'u kontrol edin

---

### Sorun 5: Migration Çalıştırılmamış

**Sebep:** `basvurular` tablosu yok

**Çözüm:**
```bash
cd okul-yonetim-sistemi
npx prisma db push
```

---

## ✅ Hızlı Test

1. **Debug endpoint'i kontrol et:**
   ```
   https://okul-yonetim-sistemi.vercel.app/api/debug/basvurular
   ```

2. **Yeni başvuru gönder:**
   - Başvuru formunu doldur
   - Gönder

3. **5 saniye bekle**

4. **Debug endpoint'i tekrar kontrol et:**
   - Count artmış mı?

5. **Başvurular sayfasını yenile:**
   - Yeni başvuru görünüyor mu?

---

## 📞 Hala Çalışmıyorsa

1. Vercel logs'larını paylaşın
2. Debug endpoint çıktısını paylaşın
3. Environment variables'ları kontrol edin (secret'ları paylaşmayın!)
4. Test webhook response'unu paylaşın

---

## 🔧 Geçici Çözüm: Manuel Test

Eğer webhook çalışmıyorsa, geçici olarak başvuruları manuel ekleyebilirsiniz:

```typescript
// Okul yönetim sisteminde test için
const testBasvuru = await prisma.basvuru.create({
  data: {
    externalId: 'manual-test-1',
    ogrenciAdSoyad: 'TEST ÖĞRENCİ',
    ogrenciTc: '12345678901',
    // ... diğer alanlar
  }
})
```

Bu şekilde frontend'in çalışıp çalışmadığını test edebilirsiniz.

