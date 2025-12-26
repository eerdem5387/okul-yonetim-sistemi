# FAZ 5 - ÖĞRENCİ DASHBOARD MODÜLÜ DOKÜMANTASYONU

## 📋 Genel Bakış

Bu modül, öğretmen ve rehberlik ekibinin öğrenci performansını merkezi bir dashboard'da görüntülemesini sağlar. Tüm modüllerden (ödevler, yoklamalar, sınavlar, görüşler) gelen verileri tek bir sayfada birleştirir ve detaylı istatistikler sunar.

---

## 🗄️ Veritabanı Yapısı

Bu faz için yeni model eklenmedi. Mevcut modeller kullanıldı:
- `Student` - Öğrenci bilgileri
- `HomeworkAssignment` - Ödev verileri
- `Attendance` - Yoklama verileri
- `ExamResult` - Sınav sonuçları
- `StudentComment` - Görüşler

---

## 🔌 API Endpoints

### Öğrenci Dashboard API

#### **GET /api/students/[id]/dashboard**
Öğrenci için tüm modüllerden veri toplar ve istatistikler hesaplar

**Query Parameters:**
- `period`: Zaman periyodu (30days, thisMonth, all) - Varsayılan: 30days

**Response:**
```json
{
  "student": {
    "id": "...",
    "firstName": "Ali",
    "lastName": "Demir",
    "grade": "9",
    "tcNumber": "12345678901",
    "email": "ali@example.com",
    "phone": "05001234567"
  },
  "statistics": {
    "homeworkCompletionRate": 85,
    "totalHomeworks": 20,
    "completedHomeworks": 17,
    "pendingHomeworks": 3,
    "attendanceRate": 95,
    "totalAttendances": 40,
    "presentCount": 38,
    "absentCount": 1,
    "lateCount": 1,
    "excusedCount": 0,
    "averageScore": 425,
    "totalExams": 5,
    "totalComments": 8,
    "positiveComments": 6,
    "negativeComments": 2
  },
  "recentData": {
    "homeworks": [
      {
        "id": "...",
        "isCompleted": true,
        "completedAt": "2025-01-20T10:00:00.000Z",
        "homework": {
          "title": "Matematik Ödev 5",
          "dueDate": "2025-01-25T23:59:59.000Z",
          "subject": "Matematik",
          "teacher": {
            "firstName": "Ayşe",
            "lastName": "Yılmaz"
          }
        }
      }
    ],
    "attendances": [
      {
        "id": "...",
        "status": "PRESENT",
        "date": "2025-01-24T00:00:00.000Z",
        "lessonName": "Matematik",
        "teacher": {
          "firstName": "Ayşe",
          "lastName": "Yılmaz"
        }
      }
    ],
    "examResults": [
      {
        "id": "...",
        "totalScore": 450,
        "ranking": 12,
        "exam": {
          "name": "2024-2025 1. Dönem YKS Denemesi",
          "examType": "YKS",
          "examDate": "2025-01-15T00:00:00.000Z",
          "grade": 12,
          "class": {
            "name": "12/A"
          }
        }
      }
    ],
    "comments": [
      {
        "id": "...",
        "commentType": "ACADEMIC",
        "content": "Matematik dersinde çok başarılı...",
        "isPositive": true,
        "createdAt": "2025-01-20T10:00:00.000Z",
        "staff": {
          "firstName": "Ayşe",
          "lastName": "Yılmaz",
          "department": "TEACHER",
          "subject": "Matematik"
        }
      }
    ]
  }
}
```

---

## 🖥️ Frontend Sayfaları

### 1. **Öğretmen - Öğrenci Dashboard** (`/ogretmen/ogrenci-dashboard`)

**Dosya:** `/src/app/ogretmen/ogrenci-dashboard/page.tsx`

**Özellikler:**
- ✅ Öğrenci seçimi (dropdown)
- ✅ Zaman periyodu seçimi (Son 30 gün, Bu ay, Tüm zamanlar)
- ✅ **4 İstatistik Kartı:**
  - 📚 Ödev Tamamlama Oranı (%)
  - 📅 Devam Oranı (%)
  - 📝 Sınav Ortalaması (puan)
  - 💬 Görüşler (Olumlu/Gelişmeli)
- ✅ **4 Detay Kartı:**
  - Son Ödevler (5 adet)
  - Son Yoklamalar (5 adet)
  - Son Sınav Sonuçları (5 adet)
  - Son Görüşler (5 adet)
- ✅ Responsive tasarım
- ✅ Loading state'leri
- ✅ Empty state'ler

**UI Tasarımı:**
- **Renk Teması:** Mavi (Öğretmen)
- **Öğrenci Bilgi Kartı:** Gradient arka plan (Mavi)
- **İstatistik Kartları:** Beyaz, renkli ikonlar ve sayılar
- **Detay Kartları:** Beyaz, border ile ayrılmış itemler

---

### 2. **Rehberlik - Öğrenci Dashboard** (`/rehberlik/ogrenci-dashboard`)

**Dosya:** `/src/app/rehberlik/ogrenci-dashboard/page.tsx`

**Özellikler:**
- ✅ Öğretmen dashboard'ı ile aynı özellikler
- ✅ Mor renk teması (Rehberlik)
- ✅ Tüm öğrencilere erişim (Öğretmen sadece kendi öğrencilerini görebilir - gelecek geliştirme)

**UI Tasarımı:**
- **Renk Teması:** Mor (Rehberlik)
- **Diğer tasarım öğeleri öğretmen dashboard'ı ile aynı**

---

### 3. **Veli Dashboard** (`/veli/panel` - Mevcut)

Veli dashboard'ı zaten öğrenci bilgilerini kart formatında gösteriyor. Detaylı dashboard verileri alt sayfalarda (ödevler, yoklama, sınavlar, görüşler) mevcut.

---

## 📊 İstatistik Hesaplamaları

### 1. **Ödev Tamamlama Oranı**
```typescript
const homeworkCompletionRate = 
  totalHomeworks > 0 
    ? Math.round((completedHomeworks / totalHomeworks) * 100) 
    : 0
```

**Örnek:**
- Toplam ödev: 20
- Tamamlanan: 17
- Oran: (17 / 20) * 100 = 85%

---

### 2. **Devam Oranı**
```typescript
const attendanceRate = 
  totalAttendances > 0 
    ? Math.round((presentCount / totalAttendances) * 100) 
    : 100
```

**Durum Dağılımı:**
- `PRESENT`: Geldi ✅
- `ABSENT`: Gelmedi ❌
- `LATE`: Geç Kaldı ⏰
- `EXCUSED`: İzinli 📝

**Örnek:**
- Toplam yoklama: 40
- Geldi: 38
- Gelmedi: 1
- Geç Kaldı: 1
- Oran: (38 / 40) * 100 = 95%

---

### 3. **Sınav Ortalaması**
```typescript
const averageScore = 
  totalExams > 0
    ? Math.round(
        examResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalExams
      )
    : 0
```

**Örnek:**
- Sınav 1: 450
- Sınav 2: 425
- Sınav 3: 475
- Ortalama: (450 + 425 + 475) / 3 = 450

---

### 4. **Görüş Dağılımı**
```typescript
const positiveComments = comments.filter(c => c.isPositive).length
const negativeComments = comments.filter(c => !c.isPositive).length
```

**Örnek:**
- Toplam görüş: 8
- Olumlu: 6 👍
- Gelişmeli: 2 👎

---

## 🎨 UI/UX Tasarım Prensipleri

### Öğrenci Seçimi
- **Dropdown:** Tüm öğrenciler alfabetik sırada
- **Format:** "Ad Soyad (Sınıf)"
- **Placeholder:** "Bir öğrenci seçin..."

### Zaman Periyodu Filtresi
- **Son 30 Gün:** Son 30 gündeki veriler
- **Bu Ay:** Ayın başından bugüne
- **Tüm Zamanlar:** Tüm geçmiş veriler

### İstatistik Kartları
- **4'lü Grid:** Desktop'ta 4 sütun, tablet'te 2, mobil'de 1
- **Büyük Rakamlar:** Metric'ler vurgulanmış (48px font)
- **İkonlar:** Her kart için anlamlı ikon
- **Renkli Vurgular:** Her metrik farklı renk

### Detay Kartları
- **2'li Grid:** Desktop'ta 2 sütun, mobil'de 1
- **Son 5 Item:** Her kartta en son 5 kayıt
- **Scrollable:** İçerik uzunsa scroll
- **Empty State:** "Henüz ... yok" mesajları

---

## 🔄 İş Akışları

### Öğretmen Dashboard Kullanımı

```
1. Öğretmen → "Öğrenci Dashboard" menüsüne tıklar
2. Sayfa açılır → Öğrenci dropdown'u gösterilir
3. Öğretmen → Dropdown'dan öğrenci seçer
4. Sistem → Dashboard verilerini yükler (API call)
5. Sayfa → İstatistik kartlarını gösterir
6. Sayfa → Detay kartlarını gösterir (ödevler, yoklama, sınavlar, görüşler)
7. Öğretmen → İsteğe bağlı zaman periyodunu değiştirir
8. Sistem → Yeni period için verileri yeniden yükler
```

### Rehberlik Dashboard Kullanımı

```
(Öğretmen ile aynı akış, sadece renk teması mor)
```

---

## 📈 Örnek Kullanım Senaryoları

### Senaryo 1: Düşük Ödev Tamamlama Oranı

**Durum:**
- Ödev Tamamlama: %45 (9/20)
- Devam Oranı: %90
- Sınav Ortalaması: 350

**Öğretmen Aksiyonu:**
1. Dashboard'dan düşük tamamlama oranını görür
2. "Son Ödevler" kartından hangi ödevlerin yapılmadığını kontrol eder
3. Öğrenciyle görüşme planlar
4. "Öğrenci Görüşleri" sayfasından görüş ekler

---

### Senaryo 2: Yüksek Devamsızlık

**Durum:**
- Ödev Tamamlama: %85
- Devam Oranı: %65 (26/40 ders)
- Sınav Ortalaması: 380

**Rehberlik Aksiyonu:**
1. Dashboard'dan düşük devam oranını görür
2. "Son Yoklamalar" kartından hangi derslerde devamsızlık olduğunu kontrol eder
3. Veli ile iletişime geçer
4. Öğrenci ile görüşme ayarlar

---

### Senaryo 3: Genel Performans Takibi

**Durum:**
- Ödev Tamamlama: %90
- Devam Oranı: %98
- Sınav Ortalaması: 475
- Görüşler: 8 Olumlu, 0 Gelişmeli

**Öğretmen/Rehberlik:**
1. Dashboard'dan mükemmel performansı görür
2. "Son Görüşler" kartından olumlu geri bildirimleri kontrol eder
3. Öğrenciye teşekkür eder veya teşvik görüşü ekler

---

## 🔐 Yetkilendirme

### Öğretmen Yetkileri
- ✅ Tüm öğrencilerin dashboard'ını görüntüleme
- ✅ İstatistikleri görüntüleme
- ✅ Detaylı verileri görüntüleme
- ❌ Veri düzenleme (sadece görüntüleme)

### Rehberlik Yetkileri
- ✅ Tüm öğrencilerin dashboard'ını görüntüleme
- ✅ İstatistikleri görüntüleme
- ✅ Detaylı verileri görüntüleme
- ❌ Veri düzenleme (sadece görüntüleme)

### Veli Yetkileri
- ✅ Sadece kendi öğrencisinin verilerini görüntüleme
- ✅ Alt sayfalarda (ödevler, yoklama, sınavlar, görüşler) detayları görüntüleme
- ❌ Diğer öğrencilerin verilerine erişim YOK

---

## 📊 Zaman Periyodu Filtreleri

### Son 30 Gün (30days)
```typescript
const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
```
- **Kullanım:** Güncel performans takibi
- **Varsayılan:** Bu filtre default olarak açılır

### Bu Ay (thisMonth)
```typescript
const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
```
- **Kullanım:** Aylık performans raporu
- **Örnek:** 25 Ocak'ta seçilirse 1-25 Ocak arası veriler

### Tüm Zamanlar (all)
```typescript
const startDate = undefined // Tüm veriler
```
- **Kullanım:** Genel performans analizi
- **Örnek:** Tüm akademik yıl veya öğrencinin tüm geçmişi

---

## 🚀 Gelecek Geliştirmeler

### FAZ 6+ Potansiyel Özellikler

#### 1. Grafik & Analiz
- **Zaman Serileri:** Ödev tamamlama oranının zamana göre grafiği
- **Karşılaştırma:** Öğrencinin sınıf ortalaması ile karşılaştırılması
- **Trend Analizi:** Performansta artış/azalış trendleri

#### 2. İleri İstatistikler
- **Ders Bazlı Analiz:** Hangi derslerde başarılı, hangi derslerde gelişmeli
- **Zaman Bazlı Analiz:** Hangi günlerde/saatlerde daha başarılı
- **Kategori Bazlı Analiz:** Ödev türlerine göre performans

#### 3. Export & Rapor
- **PDF Export:** Dashboard'ı PDF olarak kaydetme
- **Excel Export:** Tüm verileri Excel'e aktarma
- **E-posta Raporu:** Veli'ye otomatik haftalık/aylık rapor gönderme

#### 4. Bildirimler
- **Düşük Performans Uyarısı:** Ödev tamamlama < %50 olursa bildirim
- **Devamsızlık Uyarısı:** Devam oranı < %80 olursa bildirim
- **Başarı Teşviki:** 5 ödev üst üste tamamlanırsa tebrik mesajı

#### 5. Sınıf Dashboard
- **Sınıf Ortalamaları:** Tüm sınıfın istatistikleri
- **Öğrenci Sıralaması:** Sınıf içinde en başarılı öğrenciler
- **Sınıf Karşılaştırması:** 9/A vs 9/B karşılaştırması

---

## 🎯 Özet

✅ **Tamamlanan:**
- [x] Öğrenci Dashboard API
- [x] Öğretmen Dashboard Sayfası
- [x] Rehberlik Dashboard Sayfası
- [x] 4 İstatistik Kartı
- [x] 4 Detay Kartı (ödevler, yoklama, sınavlar, görüşler)
- [x] Zaman periyodu filtreleri
- [x] Sidebar güncellemeleri

📋 **Bekleyen (Gelecek Fazlar):**
- [ ] Grafik & Analiz araçları
- [ ] İleri istatistikler
- [ ] PDF/Excel export
- [ ] Bildirim sistemi
- [ ] Sınıf dashboard

---

**Son Güncelleme:** 25 Ocak 2025  
**Versiyon:** 1.0.0  
**Durum:** ✅ Tamamlandı (FAZ 5 - Öğrenci Dashboard)

---

## 📝 Teknik Notlar

### Performance
- **Eager Loading:** Tüm ilişkili veriler tek sorguda (include)
- **Limit:** Her veri kategorisinde son 10-20 kayıt
- **Index'ler:** Tüm foreign key'lerde index mevcut

### Caching (Gelecek)
- Dashboard verileri 5 dakika cache edilebilir
- Redis ile cache implementasyonu

### Responsive Design
- **Desktop:** 4 sütunlu istatistik grid'i
- **Tablet:** 2 sütunlu istatistik grid'i
- **Mobil:** 1 sütunlu istatistik grid'i

### Error Handling
- Loading state'leri
- Empty state'ler
- Error mesajları
- Retry mekanizması

---

## 🎊 FAZ 1-5 TAMAMLANDI!

### Tüm Geliştirmeler:
1. ✅ **FAZ 1:** Veli Authentication Sistemi
2. ✅ **FAZ 2:** Ödevlendirme & Yoklama Modülü
3. ✅ **FAZ 3:** Sınav Analizi Modülü (+ Sınıf Entegrasyonu)
4. ✅ **FAZ 4:** Görüş Girişi Modülü
5. ✅ **FAZ 5:** Öğrenci Dashboard

### Toplam İstatistikler:
- **Yeni Modeller:** 7 (Parent, ParentStudent, Homework, HomeworkAssignment, Attendance, Exam, ExamResult, StudentComment)
- **Yeni Enum'lar:** 5 (ParentRelation, AttendanceStatus, ExamType, CommentType)
- **API Endpoints:** 25+
- **Frontend Sayfaları:** 15+
- **Migration Dosyaları:** 5
- **Dokümantasyon:** 5 MD dosyası

---

## 🏆 Sistem Özellikleri

### Roller & Yetkiler
- **Admin/Müdür:** Tüm modüllere erişim
- **Öğrenci İşleri:** Öğrenci yönetimi, sözleşmeler
- **Rehberlik:** Sınav yönetimi, görüşler, öğrenci dashboard
- **Öğretmen:** Ödevler, yoklama, görüşler, öğrenci dashboard
- **Veli:** Öğrenci bilgileri görüntüleme (ödevler, yoklama, sınavlar, görüşler)

### Ana Modüller
1. **Neredeyiz** (Yıllık plan takibi)
2. **Sınıf Yönetimi**
3. **Ödevlendirme**
4. **Yoklama**
5. **Sınav Analizi**
6. **Görüş Girişi**
7. **Öğrenci Dashboard**
8. **Veli Paneli**

### Entegrasyonlar
- ✅ Tüm modüller birbirleriyle entegre
- ✅ Sınıf yönetimi ile ilişkili
- ✅ Role-based access control (RBAC)
- ✅ Responsive tasarım
- ✅ Dark mode hazır altyapı

