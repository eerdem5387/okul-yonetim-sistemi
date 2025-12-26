# FAZ 2 - ÖDEVLENDİRME & YOKLAMA MODÜLÜ DOKÜMANTASYONU

## 📋 Genel Bakış

Bu modül, öğretmenlerin öğrencilere ödev vermesi, yoklama alması ve velilerin bu bilgileri takip etmesini sağlar. Sistem, sınıf bazlı ve bireysel ödev atama, devam durumu takibi ve detaylı raporlama özellikleri içerir.

---

## 🗄️ Veritabanı Yapısı

### 1. **Homework (Ödev) Modeli**

```prisma
model Homework {
  id            String   @id @default(cuid())
  title         String   // Ödev başlığı
  description   String   @db.Text // Ödev açıklaması
  dueDate       DateTime // Teslim tarihi
  subject       String?  // Ders adı
  teacherId     String   // Öğretmen ID
  teacher       Staff    @relation("TeacherHomeworks")
  classId       String?  // Sınıf ID (tüm sınıfa)
  class         Class?   @relation
  attachmentUrl String?  // Ek dosya URL
  isActive      Boolean  @default(true)
  
  assignments   HomeworkAssignment[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Özellikler:**
- Öğretmen tek bir ödev ile tüm sınıfa veya seçili öğrencilere ödev verebilir
- `classId` varsa sınıftaki tüm öğrencilere otomatik atanır
- `attachmentUrl` ile Vercel Blob kullanılarak dosya ekleme desteği (opsiyonel)

### 2. **HomeworkAssignment (Ödev Ataması) Modeli**

```prisma
model HomeworkAssignment {
  id          String    @id @default(cuid())
  homeworkId  String
  homework    Homework  @relation
  studentId   String
  student     Student   @relation
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  completedBy String?   // Öğretmen veya öğrenci ID
  note        String?   // Öğretmen notu
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([homeworkId, studentId])
}
```

**Özellikler:**
- Her öğrenci için ayrı ödev ataması
- `isCompleted`: Tamamlanma durumu
- `completedBy`: Kim tamamladı (öğretmen işaretlemesi)
- Unique constraint: Aynı ödev bir öğrenciye birden fazla kez atanamaz

### 3. **Attendance (Yoklama) Modeli**

```prisma
model Attendance {
  id         String            @id @default(cuid())
  scheduleId String?           // Ders programı ID (opsiyonel)
  schedule   Schedule?         @relation
  classId    String
  class      Class             @relation
  teacherId  String
  teacher    Staff             @relation("TeacherAttendances")
  date       DateTime          // Yoklama tarihi
  lessonName String            // Ders adı
  startTime  String            // Başlangıç (HH:mm)
  endTime    String            // Bitiş (HH:mm)
  studentId  String
  student    Student           @relation
  status     AttendanceStatus  @default(PRESENT)
  note       String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Özellikler:**
- Her öğrenci için ayrı yoklama kaydı
- `scheduleId`: Ders programı ile ilişkilendirme (opsiyonel)
- Toplu yoklama alınabilir (bir request'te tüm sınıf)

### 4. **AttendanceStatus Enum**

```prisma
enum AttendanceStatus {
  PRESENT // Geldi
  ABSENT  // Gelmedi
  LATE    // Geç Kaldı
  EXCUSED // İzinli
}
```

---

## 🔌 API Endpoints

### Homework (Ödev) API'ları

#### 1. **GET /api/homework**
Ödevleri listeler

**Query Parameters:**
- `teacherId`: Öğretmen ID (filtreleme)
- `classId`: Sınıf ID (filtreleme)
- `studentId`: Öğrenci ID (öğrenciye atanmış ödevler)
- `isActive`: Aktif ödevler (true/false)

**Response:**
```json
{
  "homeworks": [
    {
      "id": "...",
      "title": "Matematik Problemleri",
      "description": "Sayfa 45-50 soruları",
      "dueDate": "2025-01-30T21:00:00.000Z",
      "subject": "Matematik",
      "teacher": {
        "id": "...",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "subject": "Matematik"
      },
      "class": {
        "id": "...",
        "name": "9/A"
      },
      "assignments": [
        {
          "id": "...",
          "isCompleted": true,
          "student": {
            "id": "...",
            "firstName": "Ali",
            "lastName": "Demir"
          }
        }
      ]
    }
  ]
}
```

#### 2. **POST /api/homework**
Yeni ödev oluşturur

**Request Body:**
```json
{
  "title": "Matematik Problemleri",
  "description": "Sayfa 45-50 soruları çözülecek",
  "dueDate": "2025-01-30",
  "subject": "Matematik",
  "teacherId": "...",
  "classId": "...", // Tüm sınıfa (opsiyonel)
  "studentIds": ["...", "..."], // Belirli öğrencilere (opsiyonel)
  "attachmentUrl": "https://..." // Ek dosya (opsiyonel)
}
```

**Response:**
```json
{
  "success": true,
  "homework": { /* ödev detayları */ }
}
```

#### 3. **GET /api/homework/[id]**
Ödev detayını getirir

#### 4. **PUT /api/homework/[id]**
Ödevi günceller

#### 5. **DELETE /api/homework/[id]**
Ödevi siler

#### 6. **PUT /api/homework/[id]/complete**
Ödev tamamlama durumunu günceller

**Request Body:**
```json
{
  "studentId": "...",
  "isCompleted": true,
  "completedBy": "...", // Öğretmen ID
  "note": "Çok iyi yapılmış"
}
```

---

### Attendance (Yoklama) API'ları

#### 1. **GET /api/attendance**
Yoklamaları listeler

**Query Parameters:**
- `teacherId`: Öğretmen ID
- `classId`: Sınıf ID
- `studentId`: Öğrenci ID
- `date`: Tarih (ISO format - YYYY-MM-DD)
- `status`: Durum (PRESENT, ABSENT, LATE, EXCUSED)

**Response:**
```json
{
  "attendances": [
    {
      "id": "...",
      "date": "2025-01-25T00:00:00.000Z",
      "lessonName": "Matematik",
      "startTime": "09:00",
      "endTime": "09:45",
      "status": "PRESENT",
      "student": {
        "id": "...",
        "firstName": "Ali",
        "lastName": "Demir"
      },
      "teacher": {
        "id": "...",
        "firstName": "Ahmet",
        "lastName": "Yılmaz"
      },
      "class": {
        "id": "...",
        "name": "9/A"
      }
    }
  ]
}
```

#### 2. **POST /api/attendance**
Toplu yoklama alır

**Request Body:**
```json
{
  "classId": "...",
  "teacherId": "...",
  "date": "2025-01-25",
  "lessonName": "Matematik",
  "startTime": "09:00",
  "endTime": "09:45",
  "scheduleId": "...", // Opsiyonel
  "attendances": [
    {
      "studentId": "...",
      "status": "PRESENT",
      "note": ""
    },
    {
      "studentId": "...",
      "status": "ABSENT",
      "note": "Hastalık raporu var"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "message": "25 öğrenci için yoklama kaydedildi"
}
```

---

## 🖥️ Frontend Sayfaları

### 1. **Öğretmen - Ödevlerim** (`/ogretmen/odevler`)

**Dosya:** `/src/app/ogretmen/odevler/page.tsx`

**Özellikler:**
- ✅ Ödevleri listeleme (tamamlanma oranı ile)
- ✅ Yeni ödev oluşturma formu
- ✅ Sınıf seçimi
- ✅ Teslim tarihi belirleme
- ✅ Ödev detayları (başlık, açıklama, ders)
- ✅ Tamamlanma istatistikleri

**Gösterilen Bilgiler:**
- Ödev başlığı ve açıklaması
- Ders adı
- Sınıf
- Teslim tarihi
- Tamamlanma yüzdesi
- Tamamlayan/tamamlamayan öğrenci sayısı

---

### 2. **Öğretmen - Yoklama** (`/ogretmen/yoklama`)

**Dosya:** `/src/app/ogretmen/yoklama/page.tsx`

**Özellikler:**
- ✅ Sınıf seçimi
- ✅ Tarih ve ders bilgileri girişi
- ✅ Öğrenci listesini otomatik getirme
- ✅ 4 durum butonu: Geldi, Gelmedi, Geç Kaldı, İzinli
- ✅ Canlı istatistikler (toplam, geldi, gelmedi, geç, izinli)
- ✅ Toplu yoklama kaydetme

**İş Akışı:**
1. Sınıf seç → Öğrenciler otomatik gelir
2. Tarih, ders, saat bilgilerini gir
3. Her öğrenci için durum seç (varsayılan: Geldi)
4. Toplu kaydet

---

### 3. **Veli - Ödevler** (`/veli/odevler`)

**Dosya:** `/src/app/veli/odevler/page.tsx`

**Özellikler:**
- ✅ Öğrencinin tüm ödevlerini görüntüleme
- ✅ Durum rozetleri: Tamamlandı, Bekliyor, Süre Geçti
- ✅ İstatistikler: Toplam, tamamlanan, bekleyen, süresi geçen
- ✅ Ödev detayları (başlık, açıklama, öğretmen, teslim tarihi)
- ✅ Renkli göstergeler (yeşil: tamamlandı, sarı: bekliyor, kırmızı: süre geçti)

**Gösterilen İstatistikler:**
- Toplam ödev sayısı
- Tamamlanan ödev sayısı
- Bekleyen ödev sayısı
- Süresi geçen ödev sayısı

---

### 4. **Veli - Yoklama** (`/veli/yoklama`)

**Dosya:** `/src/app/veli/yoklama/page.tsx`

**Özellikler:**
- ✅ Öğrencinin tüm yoklamalarını görüntüleme
- ✅ Tarih filtreleme
- ✅ Devam oranı hesaplama
- ✅ Durum ikonları ve rozetleri
- ✅ Detaylı yoklama bilgileri (ders, öğretmen, tarih, saat)
- ✅ Öğretmen notları görüntüleme

**Gösterilen İstatistikler:**
- Toplam ders sayısı
- Devam oranı (%)
- Geldi sayısı
- Gelmedi sayısı
- Geç kaldı sayısı
- İzinli sayısı

---

## 🎨 UI/UX Tasarım Kararları

### Öğretmen Arayüzü
- **Mavi Tema:** Profesyonel ve güvenilir görünüm
- **Hızlı Erişim:** Ana işlevler tek tıkla ulaşılabilir
- **Toplu İşlemler:** Yoklama alırken tüm sınıf tek seferde kaydedilebilir
- **Görsel İstatistikler:** İkonlar ve sayılarla hızlı bilgi

### Veli Arayüzü
- **Yeşil Tema:** Veli arayüzü için ayrı renk paleti
- **Açıklayıcı Rozetler:** Durum bilgileri anlaşılır şekilde gösteriliyor
- **Filtreleme:** Tarih bazlı filtreleme ile geçmiş kayıtlar incelenebilir
- **Görsel Feedback:** Renkli ikonlar ile durum hızlıca anlaşılıyor

---

## 🔄 İş Akışları

### Ödevlendirme İş Akışı

```
1. Öğretmen → "Yeni Ödev" butonuna tıklar
2. Öğretmen → Form doldurur:
   - Başlık, açıklama, ders, teslim tarihi
   - Sınıf seçer (tüm sınıfa)
   VEYA
   - Bireysel öğrenciler seçer
3. Öğretmen → "Oluştur" butonuna tıklar
4. Sistem → Ödev oluşturur
5. Sistem → Seçilen öğrencilere otomatik atama yapar
6. Veli → Veli panelinde yeni ödevi görür
7. Öğretmen → Tamamlanma durumunu takip eder
```

### Yoklama İş Akışı

```
1. Öğretmen → Yoklama sayfasına gider
2. Öğretmen → Sınıf seçer
3. Sistem → Öğrencileri otomatik getirir (tümü varsayılan "Geldi")
4. Öğretmen → Tarih, ders, saat bilgilerini girer
5. Öğretmen → Gelmeyenler için "Gelmedi" butonuna tıklar
6. Öğretmen → Geç kalanlar için "Geç Kaldı" butonuna tıklar
7. Öğretmen → İzinliler için "İzinli" butonuna tıklar
8. Öğretmen → "Yoklamayı Kaydet" butonuna tıklar
9. Sistem → Tüm yoklamaları toplu kaydeder
10. Veli → Veli panelinde yoklama kaydını görür
```

---

## 📊 İstatistikler ve Raporlama

### Ödev İstatistikleri
- **Tamamlanma Oranı:** Yüzde olarak hesaplanır
- **Tamamlayan/Tamamlamayan:** Sayısal gösterim
- **Durum İkonları:** CheckCircle (yeşil), XCircle (kırmızı)

### Yoklama İstatistikleri
- **Devam Oranı:** (Geldi + Geç Kaldı) / Toplam × 100
- **Durum Dağılımı:** Her durum için ayrı sayaç
- **Tarih Bazlı Filtreleme:** Geçmiş kayıtları inceleme

---

## 🔐 Yetkilendirme

### Öğretmen Yetkileri
- ✅ Ödev oluşturma
- ✅ Ödev güncelleme/silme
- ✅ Ödev tamamlama durumunu işaretleme
- ✅ Yoklama alma
- ✅ Tüm ödevlerini ve yoklamalarını görüntüleme

### Veli Yetkileri
- ✅ Öğrencinin ödevlerini görüntüleme
- ✅ Öğrencinin yoklamalarını görüntüleme
- ❌ Ödev oluşturma/güncelleme
- ❌ Yoklama alma

---

## 🚀 Sonraki Adımlar (FAZ 3+)

### FAZ 3 - Sınav Analizi
- Rehberlik ekibinin deneme sınavı sonuçlarını girmesi
- Veli ve öğretmenlerin sınav analizlerini görüntülemesi
- Grafik ve istatistiklerle performans takibi

### FAZ 4 - Görüş Girişi
- Öğretmen ve rehberlik görüşleri
- Akademik ve bireysel gelişim notları
- Veli ve öğretmen erişimi

### FAZ 5 - Öğrenci Dashboard
- Tüm modülleri birleştiren merkezi panel
- Ödev, yoklama, sınav, görüş tek ekranda
- Öğrenci ve veli için özelleştirilmiş görünüm

---

## 📝 Teknik Notlar

### Performance Optimizasyonları
- **Index'ler:** Tüm foreign key'ler ve sık sorgulanan alanlar index'lenmiş
- **Toplu İşlemler:** `createMany` ile performanslı kayıt
- **Eager Loading:** İlişkili veriler tek sorguda getiriliyor

### Güvenlik
- **Input Validation:** Tüm API endpoint'lerinde validasyon
- **Auth Kontrolü:** Her sayfada role-based access control
- **SQL Injection:** Prisma ORM ile otomatik korunma

### Genişletilebilirlik
- **Ek Dosya Desteği:** Vercel Blob entegrasyonu hazır
- **Bildirim Entegrasyonu:** Mevcut bildirim modülü ile entegre edilebilir
- **Raporlama:** Excel/PDF export eklenebilir

---

## 🎯 Özet

✅ **Tamamlanan:**
- [x] 3 Yeni Model (Homework, HomeworkAssignment, Attendance)
- [x] 1 Yeni Enum (AttendanceStatus)
- [x] Migration dosyası
- [x] 7 API Endpoint (Homework CRUD + Complete, Attendance)
- [x] 4 Frontend Sayfası (2 Öğretmen, 2 Veli)
- [x] Sidebar Güncellemeleri

📋 **Bekleyen (Gelecek Fazlar):**
- [ ] FAZ 3: Sınav Analizi
- [ ] FAZ 4: Görüş Girişi
- [ ] FAZ 5: Öğrenci Dashboard

---

**Son Güncelleme:** 25 Ocak 2025  
**Versiyon:** 1.0.0  
**Durum:** ✅ Tamamlandı (FAZ 2 - Ödevlendirme & Yoklama)

