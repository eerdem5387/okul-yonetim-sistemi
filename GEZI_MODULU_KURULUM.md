# 🗺️ Gezi Modülü Kurulum Rehberi

## 📋 Özet

Bu rehber, okul-yonetim-sistemi'ne gezi modülünün entegrasyonu için gerekli adımları içerir.

---

## ✅ Tamamlanan İşlemler

1. ✅ Gezi API servis katmanı oluşturuldu (`src/lib/geziService.ts`)
2. ✅ Sidebar'a "Gezi Yönetimi" linki eklendi
3. ✅ Gezi yönetim sayfası oluşturuldu (`src/app/gezi/page.tsx`)
4. ✅ Gezi detay sayfası oluşturuldu (`src/app/gezi/[id]/page.tsx`)

---

## 🔧 Environment Variables

Vercel Dashboard'unda veya `.env.local` dosyasına şu değişkenleri ekleyin:

```env
# Gezi Başvuru Sistemi API URL
GEZI_API_URL=https://gezi.okul.com
# Veya Vercel domain kullanıyorsanız:
# GEZI_API_URL=https://gezi-basvuru-sistemi.vercel.app

# Service API Secret (gezi-basvuru-sistemi ile aynı olmalı)
SERVICE_API_SECRET=3QrT/eFINjbCQUZgVqUJa9k7XPHNgU9Cjg22oJwIoFQ=
```

**ÖNEMLİ:** 
- `GEZI_API_URL` gezi-basvuru-sistemi'nin URL'i olmalı
- `SERVICE_API_SECRET` gezi-basvuru-sistemi'ndeki `SERVICE_API_SECRET` ile **tamamen aynı** olmalı!

---

## 📁 Oluşturulan Dosyalar

### 1. Servis Katmanı
- **Dosya:** `src/lib/geziService.ts`
- **Açıklama:** Gezi-basvuru-sistemi API'lerini çağıran helper fonksiyonlar
- **Fonksiyonlar:**
  - `getTrips()` - Gezileri listele
  - `getTrip(id)` - Gezi detayı
  - `createTrip(data)` - Yeni gezi oluştur
  - `updateTrip(id, data)` - Gezi güncelle
  - `getTripApplications(tripId, options)` - Başvuruları listele
  - `exportTripApplications(tripId)` - Excel export
  - `getTripStats()` - İstatistikler

### 2. Gezi Yönetim Sayfası
- **Dosya:** `src/app/gezi/page.tsx`
- **Özellikler:**
  - İstatistik kartları (toplam gezi, aktif gezi, yaklaşan gezi, toplam başvuru, bu ay başvuru)
  - Gezi listesi (aktif/pasif filtreleme, arama)
  - Yeni gezi oluşturma formu
  - Gezi düzenleme
  - Gezi aktif/pasif yapma
  - Gezi detay sayfasına yönlendirme

### 3. Gezi Detay Sayfası
- **Dosya:** `src/app/gezi/[id]/page.tsx`
- **Özellikler:**
  - Gezi bilgileri (başlık, konum, tarihler, ücret, kota, açıklama, ek açıklamalar)
  - Başvuru listesi (arama, pagination)
  - Excel export butonu
  - Başvuru durumları (beklemede, onaylandı, reddedildi)

### 4. Sidebar Güncellemesi
- **Dosya:** `src/components/layout/sidebar.tsx`
- **Değişiklik:** "Gezi Yönetimi" linki eklendi (MapPin ikonu ile)

---

## 🎯 Kullanım

### Gezi Oluşturma

1. Sidebar'dan "Gezi Yönetimi" sayfasına gidin
2. "Yeni Gezi" butonuna tıklayın
3. Formu doldurun:
   - **Gezi Adı** (zorunlu)
   - **Konum** (zorunlu)
   - **Başlangıç Tarihi** (zorunlu)
   - **Bitiş Tarihi** (zorunlu)
   - **Ücret** (opsiyonel)
   - **Kota** (opsiyonel)
   - **Açıklama** (opsiyonel)
   - **Ek Açıklamalar** (opsiyonel - veli bilgilendirme için)
   - **Aktif** checkbox (başvuru alınabilir mi?)
4. "Oluştur" butonuna tıklayın

### Gezi Düzenleme

1. Gezi kartında "Düzenle" butonuna tıklayın
2. Formu güncelleyin
3. "Güncelle" butonuna tıklayın

### Gezi Aktif/Pasif Yapma

1. Gezi kartında aktif/pasif ikonuna tıklayın
2. Gezi durumu otomatik güncellenir

### Başvuruları Görüntüleme

1. Gezi kartında "Detay" butonuna tıklayın
2. Başvuru listesi görüntülenir
3. Arama yapabilir, sayfalama kullanabilirsiniz

### Excel Export

1. Gezi detay sayfasında "Excel İndir" butonuna tıklayın
2. Excel dosyası otomatik indirilir

---

## 🔒 Güvenlik

- Tüm API istekleri `X-Service-Secret` header'ı ile korunur
- Secret key environment variable'dan okunur
- Gezi-basvuru-sistemi API'leri aynı secret ile doğrular

---

## 🐛 Sorun Giderme

### API İstekleri Başarısız Oluyor

1. ✅ `GEZI_API_URL` doğru mu?
2. ✅ `SERVICE_API_SECRET` gezi-basvuru-sistemi ile aynı mı?
3. ✅ Vercel logs'larını kontrol edin
4. ✅ Network hatası var mı? (CORS, timeout vb.)

### Geziler Görünmüyor

1. ✅ Environment variables doğru ayarlandı mı?
2. ✅ Gezi-basvuru-sistemi çalışıyor mu?
3. ✅ Browser console'da hata var mı kontrol edin

### Excel Export Çalışmıyor

1. ✅ Gezi detay sayfasında başvuru var mı?
2. ✅ Browser console'da hata var mı kontrol edin
3. ✅ Vercel logs'larını kontrol edin

---

## 📝 Notlar

- Geziler gezi-basvuru-sistemi database'inde tutulur
- Okul-yonetim-sistemi sadece API üzerinden erişir
- Tüm veriler gezi-basvuru-sistemi'nde saklanır
- Excel export gezi-basvuru-sistemi tarafından oluşturulur

---

## 🚀 Sonraki Adımlar

1. ✅ Environment variables'ları ayarlayın
2. ✅ Gezi-basvuru-sistemi'nin çalıştığından emin olun
3. ✅ Test gezi oluşturun
4. ✅ Başvuruları görüntüleyin
5. ✅ Excel export'u test edin

Sorularınız için issue açabilir veya iletişime geçebilirsiniz! 🎉

