# 📢 Neredeyiz Bildirim Modülü Dokümantasyonu

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Bildirim Türleri](#bildirim-türleri)
3. [Teknik Yapı](#teknik-yapı)
4. [API Endpoints](#api-endpoints)
5. [Kullanım Örnekleri](#kullanım-örnekleri)
6. [UI Komponenti](#ui-komponenti)
7. [Entegrasyon Noktaları](#entegrasyon-noktaları)

---

## 🎯 Genel Bakış

Bildirim modülü, Neredeyiz sistemindeki önemli olayları (konu tamamlama, gecikme, onay, vb.) kullanıcılara anlık olarak bildirmek için geliştirilmiştir. Her kullanıcı rolü (Öğretmen, Rehberlik, Öğrenci İşleri) kendi sorumluluk alanıyla ilgili bildirimleri görür.

### Temel Özellikler
- ✅ Rol bazlı bildirim filtreleme
- ✅ Kullanıcı bazlı özel bildirimler
- ✅ Öncelik seviyeleri (LOW, NORMAL, HIGH, CRITICAL)
- ✅ Okundu/Okunmadı durumu
- ✅ Gerçek zamanlı güncelleme (30 sn periyotla)
- ✅ Toplu "okundu işaretle" özelliği
- ✅ Responsive tasarım

---

## 📬 Bildirim Türleri

### 1. ONAY_BEKLIYOR 
- **Hedef:** Rehberlik
- **Öncelik:** HIGH
- **Tetikleyici:** Öğretmen bir konuyu "Tamamlandı" olarak işaretler
- **Örnek:** "Ahmet Öğretmen, 5/A sınıfı Matematik - Temel Aritmetik konusunu tamamlandı olarak bildirdi."

### 2. TAMAMLANDI
- **Hedef:** İlgili Öğretmen
- **Öncelik:** NORMAL
- **Tetikleyici:** Rehberlik konuyu onaylar
- **Örnek:** "5/A sınıfı Matematik - Temel Aritmetik konusu onaylandı. Tebrikler!"

### 3. GECIKMELI
- **Hedef:** Öğretmen + Rehberlik
- **Öncelik:** HIGH
- **Tetikleyici:** Konunun bitiş tarihi geçer ve tamamlanmadıysa
- **Örnek:** "5/A sınıfı Matematik - Temel Aritmetik konusu planın 3 gün gerisinde kaldı."

### 4. KRITIK_GECIKME
- **Hedef:** Öğretmen + Rehberlik
- **Öncelik:** CRITICAL
- **Tetikleyici:** Konu 5+ gün gecikmede
- **Örnek:** "⚠️ 5/A sınıfı Matematik - Temel Aritmetik konusu 7 gün gecikmeye girdi."

### 5. YAKLASAN_DEADLINE
- **Hedef:** İlgili Öğretmen
- **Öncelik:** HIGH (2 gün kala) / NORMAL
- **Tetikleyici:** Konunun bitiş tarihine 3 gün ve daha az kaldıysa
- **Örnek:** "5/A sınıfı Matematik - Temel Aritmetik konusunun bitiş tarihine 2 gün kaldı."

### 6. AKSAMA_OLUSTURULDU
- **Hedef:** Herkes (targetRole: null)
- **Öncelik:** NORMAL
- **Tetikleyici:** Yeni aksama oluşturulur
- **Örnek:** "Kar tatili nedeniyle 15.12.2025 - 17.12.2025 tarihlerinde aksama oluşturuldu. 25 ders etkilendi."

### 7. OGRETMEN_ATANDI
- **Hedef:** İlgili Öğretmen
- **Öncelik:** NORMAL
- **Tetikleyici:** Öğretmen bir derse atanır
- **Örnek:** "9/B sınıfı Fizik dersine atandınız."

### 8. UNITE_TAMAMLANDI
- **Hedef:** İlgili Öğretmen
- **Öncelik:** NORMAL
- **Tetikleyici:** Ünitenin tüm konuları tamamlanır
- **Örnek:** "Tebrikler! 5/A sınıfı Matematik - Üçgenler ünitesinin tüm konuları tamamlandı."

### 9. ERKEN_TAMAMLANDI
- **Hedef:** İlgili Öğretmen
- **Öncelik:** LOW
- **Tetikleyici:** Konu planlanan tarihten önce tamamlanır
- **Örnek:** "Harika! 5/A sınıfı Matematik - Temel Aritmetik konusu planın 5 gün önünde tamamlandı."

### 10. HAFTALIK_OZET
- **Hedef:** Herkes
- **Öncelik:** LOW
- **Tetikleyici:** Her hafta otomatik (gelecek özellik)
- **Örnek:** "Bu hafta 12 konu tamamlandı, 3 konu gecikmeye girdi."

---

## 🏗️ Teknik Yapı

### Database Schema

```prisma
model Notification {
  id          String           @id @default(cuid())
  type        NotificationType
  title       String
  message     String
  targetRole  StaffDepartment? // null = herkese
  targetUserId String? // belirli kullanıcıya
  isRead      Boolean          @default(false)
  priority    NotificationPriority @default(NORMAL)
  
  // İlişkili kayıtlar (opsiyonel)
  relatedSubjectId String?
  relatedTopicId   String?
  relatedUnitId    String?
  relatedStaffId   String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([targetRole, isRead])
  @@index([targetUserId, isRead])
  @@index([createdAt])
  @@index([type])
}

enum NotificationType {
  ONAY_BEKLIYOR
  TAMAMLANDI
  GECIKMELI
  YAKLASAN_DEADLINE
  AKSAMA_OLUSTURULDU
  OGRETMEN_ATANDI
  UNITE_TAMAMLANDI
  ERKEN_TAMAMLANDI
  HAFTALIK_OZET
  KRITIK_GECIKME
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  CRITICAL
}
```

---

## 🔌 API Endpoints

### GET /api/notifications
Bildirimleri listeler.

**Query Parameters:**
- `targetRole`: "OGRETMEN" | "REHBERLIK" | "OGRENCI_ISLERI"
- `targetUserId`: Kullanıcı ID
- `isRead`: "true" | "false"
- `type`: Bildirim türü
- `limit`: Sonuç sayısı (varsayılan: 50)

**Response:**
```json
{
  "notifications": [...],
  "unreadCount": 5
}
```

### POST /api/notifications
Yeni bildirim oluşturur.

**Body:**
```json
{
  "type": "ONAY_BEKLIYOR",
  "title": "Onay Bekleyen Konu",
  "message": "...",
  "targetRole": "REHBERLIK",
  "priority": "HIGH",
  "relatedTopicId": "...",
  "relatedSubjectId": "..."
}
```

### PUT /api/notifications/[id]
Bildirimi günceller (okundu işaretle).

**Body:**
```json
{
  "isRead": true
}
```

### DELETE /api/notifications/[id]
Bildirimi siler.

### POST /api/notifications/mark-all-read
Tüm bildirimleri okundu işaretle.

**Body:**
```json
{
  "targetRole": "OGRETMEN",
  "targetUserId": "user123"
}
```

---

## 💻 Kullanım Örnekleri

### Client-Side (Utility Fonksiyonları)

```typescript
import { notifyTopicPendingApproval } from "@/lib/notifications"

// Konu tamamlama onay bildirimi
await notifyTopicPendingApproval(
  "Temel Aritmetik",
  "Matematik",
  5,
  "A",
  "Ahmet Yılmaz",
  "topic-id",
  "subject-id"
)
```

### Server-Side (API içinde)

```typescript
await createNotificationServer({
  type: "TAMAMLANDI",
  title: "Konu Onaylandı ✅",
  message: `${grade}/${section}. sınıf ${subjectName} - ${topicName} konusu onaylandı.`,
  targetRole: "OGRETMEN",
  targetUserId: teacherId,
  priority: "NORMAL",
  relatedTopicId: topicId,
  relatedSubjectId: subjectId,
})
```

---

## 🎨 UI Komponenti

### NotificationBell

**Kullanım:**
```tsx
import NotificationBell from "@/components/notifications/notification-bell"

<NotificationBell 
  targetRole="OGRETMEN" 
  targetUserId="user123"
/>
```

**Özellikler:**
- 🔔 Bell ikonu + okunmamış sayısı badge
- Dropdown bildirim listesi
- Bildirim renkleri (önceliğe göre)
- "Tümü Okundu" butonu
- Otomatik 30 saniye periyotla güncelleme
- Responsive tasarım

**Bildirim Renkleri:**
- 🔴 Kırmızı: CRITICAL
- 🟡 Sarı: HIGH
- 🔵 Mavi: NORMAL
- 🟢 Yeşil: LOW
- ⚪ Gri: Okunmuş bildirimler

---

## 🔗 Entegrasyon Noktaları

### 1. Konu Tamamlama (`src/app/api/neredeyiz/progress/route.ts`)
- ✅ `POST /api/neredeyiz/progress`
- **Bildirim:** Öğretmen konu işaretlediğinde → Rehberliğe "ONAY_BEKLIYOR"

### 2. Konu Onaylama (`src/app/api/neredeyiz/progress/[id]/approve/route.ts`)
- ✅ `POST /api/neredeyiz/progress/[id]/approve`
- **Bildirim:** Rehberlik onayladığında → Öğretmene "TAMAMLANDI"

### 3. Gecikme Kontrolü (Gelecek)
- ⏳ Cron job veya scheduled task
- **Bildirim:** Her gün kontrol → Gecikmeli konular için "GECIKMELI" veya "KRITIK_GECIKME"

### 4. Öğretmen Atama (Gelecek)
- ⏳ `POST /api/neredeyiz/subjects/[id]/assign`
- **Bildirim:** Öğretmen atandığında → Öğretmene "OGRETMEN_ATANDI"

### 5. Aksama Oluşturma (Gelecek)
- ⏳ `POST /api/neredeyiz/disruptions`
- **Bildirim:** Aksama oluşturulduğunda → Herkese "AKSAMA_OLUSTURULDU"

---

## 📊 Kullanım Senaryoları

### Senaryo 1: Öğretmen Konu İşaretliyor
1. Öğretmen → İlerleme Takibi → "Tamamlandı" butonu
2. API: Progress kaydı oluşturulur (PENDING_APPROVAL)
3. **Bildirim:** Rehberliğe "ONAY_BEKLIYOR" (HIGH priority)
4. Rehberlik bildirimi görür (kırmızı badge +1)

### Senaryo 2: Rehberlik Onaylıyor
1. Rehberlik → Bildirime tıklar → Onay sayfası
2. "Onayla" butonuna tıklar
3. API: Progress durumu "TAMAMLANDI" olur
4. **Bildirim:** Öğretmene "TAMAMLANDI" (NORMAL priority)
5. Öğretmen bildirimi görür (mavi badge +1)

### Senaryo 3: Gecikme Tespit Ediliyor
1. Sistem: Her gün 08:00'de cron job çalışır
2. Planlanan tarih geçmiş konular taranır
3. **Bildirim (3-4 gün):** "GECIKMELI" (HIGH) → Öğretmen + Rehberlik
4. **Bildirim (5+ gün):** "KRITIK_GECIKME" (CRITICAL) → Öğretmen + Rehberlik + Yönetim

---

## 🚀 Gelecek Geliştirmeler

- [ ] Cron job ile otomatik gecikme kontrolü
- [ ] Email bildirim entegrasyonu
- [ ] Push notification desteği
- [ ] Bildirim tercihleri (kullanıcı ayarları)
- [ ] Haftalık/Aylık özet raporları
- [ ] Bildirim geçmişi sayfası
- [ ] Bildirim filtreleme ve arama
- [ ] Özelleştirilebilir bildirim sesleri

---

## 📝 Notlar

- Bildirimler soft-delete yapılmaz, doğrudan silinir
- Okunmamış bildirimlerin max yaşı belirlenmemiş (ileride eklenebilir)
- Bildirim önceliği kullanıcı deneyimini etkiler (renk, sıralama)
- targetRole `null` ise bildirim herkese görünür
- targetUserId belirtilirse sadece o kullanıcı görür

---

## 📅 Sürüm Geçmişi

### v1.0.0 (12 Aralık 2025)
- ✅ İlk versiyon tamamlandı
- ✅ Temel bildirim türleri eklendi
- ✅ API endpoints hazır
- ✅ UI komponenti geliştirildi
- ✅ Progress API entegrasyonu yapıldı

