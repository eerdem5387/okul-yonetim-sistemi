# FAZ 3 - SINAV ANALİZİ MODÜLÜ DOKÜMANTASYONU

## 📋 Genel Bakış

Bu modül, rehberlik ekibinin öğrencilerin deneme sınavı sonuçlarını sisteme girmesini ve bu sonuçların veli, öğretmen ve öğrenciler tarafından görüntülenmesini sağlar. Sınav analizi, öğrencilerin akademik performansının takibi için kritik öneme sahiptir.

---

## 🗄️ Veritabanı Yapısı

### 1. **Exam (Sınav) Modeli**

```prisma
model Exam {
  id          String   @id @default(cuid())
  name        String   // "2024-2025 1. Dönem Deneme Sınavı"
  examType    ExamType // YKS, LGS, KPSS, DENEME, DIGER
  examDate    DateTime // Sınav tarihi
  grade       Int?     // Sınıf seviyesi (5-12) - opsiyonel (tüm okul için null)
  classId     String?  // Belirli bir sınıfa özel sınav - opsiyonel
  class       Class?   @relation
  description String?  @db.Text
  subjects    Json?    // Dersler ve puan türleri (JSON)
  createdById String   // Rehberlik uzmanı ID
  createdBy   Staff    @relation("ExamCreator")
  isActive    Boolean  @default(true)
  results     ExamResult[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Özellikler:**
- **examType**: 5 tip desteklenir (YKS, LGS, KPSS, DENEME, DIGER)
- **grade**: Hangi sınıf seviyesi için (5-12) - opsiyonel
- **classId**: Belirli bir sınıfa özel sınav - opsiyonel
- **subjects**: JSON formatında esneklik sağlar (TYT, AYT, vb.)

**Sınav Kapsamı (Scope):**
- **Tüm Okul:** `grade = null`, `classId = null` → Tüm okul genelinde sınav
- **Sınıf Seviyesi:** `grade = 9`, `classId = null` → Tüm 9. sınıflar (9/A, 9/B, 9/C)
- **Belirli Sınıf:** `classId = "..."` → Sadece 9/A sınıfı

### 2. **ExamResult (Sınav Sonucu) Modeli**

```prisma
model ExamResult {
  id          String  @id @default(cuid())
  examId      String
  exam        Exam    @relation
  studentId   String
  student     Student @relation
  scores      Json    // Detaylı sonuçlar (JSON)
  totalScore  Float?  // Toplam puan
  ranking     Int?    // Sıralama
  percentile  Float?  // Yüzdelik dilim
  notes       String? @db.Text // Rehberlik notları
  enteredById String  // Sonucu giren rehberlik uzmanı ID
  enteredBy   Staff   @relation("ExamResultEntry")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([examId, studentId])
}
```

**Özellikler:**
- **scores**: JSON formatında ders bazlı sonuçlar (esneklik)
- **Unique Constraint**: Bir öğrenci aynı sınava birden fazla sonuç giremez
- **enteredById**: Veri bütünlüğü ve takip için

### 3. **ExamType Enum**

```prisma
enum ExamType {
  YKS    // Yükseköğretim Kurumları Sınavı
  LGS    // Liselere Geçiş Sınavı
  KPSS   // Kamu Personeli Seçme Sınavı
  DENEME // Deneme Sınavı
  DIGER  // Diğer
}
```

---

## 🔌 API Endpoints

### Exam (Sınav) API'ları

#### 1. **GET /api/exams**
Sınavları listeler

**Query Parameters:**
- `grade`: Sınıf seviyesi (5-12)
- `classId`: Sınıf ID (belirli sınıfa özel sınavlar)
- `examType`: Sınav tipi
- `isActive`: Aktif sınavlar

**Response:**
```json
{
  "exams": [
    {
      "id": "...",
      "name": "2024-2025 1. Dönem YKS Denemesi",
      "examType": "YKS",
      "examDate": "2025-01-15T00:00:00.000Z",
      "grade": 12,
      "classId": null,
      "class": null,
      "createdBy": {
        "firstName": "Ayşe",
        "lastName": "Kaya",
        "department": "REHBERLIK"
      },
      "results": [
        { "id": "...", "studentId": "...", "totalScore": 450 }
      ]
    },
    {
      "id": "...",
      "name": "9/A Sınıfı Matematik Yazılı",
      "examType": "DIGER",
      "examDate": "2025-01-20T00:00:00.000Z",
      "grade": 9,
      "classId": "...",
      "class": {
        "id": "...",
        "name": "9/A",
        "grade": 9,
        "section": "A"
      },
      "results": []
    }
  ]
}
```

#### 2. **POST /api/exams**
Yeni sınav oluşturur

**Request Body:**
```json
{
  "name": "2024-2025 1. Dönem YKS Denemesi",
  "examType": "YKS",
  "examDate": "2025-01-15",
  "scope": "GRADE",
  "grade": 12,
  "classId": null,
  "description": "İlk dönem deneme sınavı",
  "subjects": {
    "TYT": {
      "turkce": {"sorular": 40, "sure": 75},
      "matematik": {"sorular": 40, "sure": 75}
    }
  },
  "createdById": "..."
}
```

**Scope Parametresi:**
- `WHOLE_SCHOOL`: Tüm okul (grade ve classId null olacak)
- `GRADE`: Sınıf seviyesi (grade gerekli, classId null)
- `CLASS`: Belirli sınıf (classId gerekli, grade otomatik)

**Örnekler:**

1. **Tüm Okul İçin:**
```json
{
  "name": "Genel Okul Sınavı",
  "scope": "WHOLE_SCHOOL",
  "examType": "DIGER",
  "examDate": "2025-01-15",
  "createdById": "..."
}
```

2. **Tüm 9. Sınıflar İçin:**
```json
{
  "name": "9. Sınıf Matematik Sınavı",
  "scope": "GRADE",
  "grade": 9,
  "examType": "DIGER",
  "examDate": "2025-01-15",
  "createdById": "..."
}
```

3. **Sadece 9/A Sınıfı İçin:**
```json
{
  "name": "9/A Matematik Yazılı",
  "scope": "CLASS",
  "classId": "clxxxx",
  "examType": "DIGER",
  "examDate": "2025-01-15",
  "createdById": "..."
}
```

#### 3. **GET /api/exams/[id]**
Sınav detayını getirir (sonuçlarla birlikte)

#### 4. **PUT /api/exams/[id]**
Sınavı günceller

#### 5. **DELETE /api/exams/[id]**
Sınavı siler

---

### ExamResult (Sınav Sonucu) API'ları

#### 1. **GET /api/exams/[id]/results**
Sınav sonuçlarını listeler

**Query Parameters:**
- `studentId`: Belirli bir öğrencinin sonucu

**Response:**
```json
{
  "results": [
    {
      "id": "...",
      "totalScore": 450.5,
      "ranking": 12,
      "percentile": 85.5,
      "scores": {
        "TYT": {
          "turkce": {"dogru": 35, "yanlis": 3, "net": 34},
          "matematik": {"dogru": 30, "yanlis": 5, "net": 28.33}
        },
        "AYT": {
          "matematik": {"dogru": 25, "yanlis": 2, "net": 24.33}
        }
      },
      "notes": "Matematik alanında gelişme göstermiş",
      "student": {
        "id": "...",
        "firstName": "Ali",
        "lastName": "Demir",
        "grade": "12"
      },
      "exam": {
        "name": "2024-2025 1. Dönem YKS Denemesi",
        "examType": "YKS",
        "examDate": "2025-01-15T00:00:00.000Z"
      }
    }
  ]
}
```

#### 2. **POST /api/exams/[id]/results**
Toplu sınav sonuçları girer

**Request Body:**
```json
{
  "results": [
    {
      "studentId": "...",
      "scores": {
        "TYT": {"turkce": 35, "matematik": 30, "toplam": 120}
      },
      "totalScore": 450.5,
      "ranking": 12,
      "percentile": 85.5,
      "notes": "İyi performans"
    }
  ],
  "enteredById": "..." // Rehberlik uzmanı ID
}
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "message": "25 öğrenci için sınav sonucu kaydedildi"
}
```

---

## 🖥️ Frontend Sayfaları

### 1. **Rehberlik - Sınav Yönetimi** (`/rehberlik/sinavlar`)

**Dosya:** `/src/app/rehberlik/sinavlar/page.tsx`

**Özellikler:**
- ✅ Yeni sınav oluşturma formu
- ✅ Sınav listesi
- ✅ Sınav tipi seçimi (YKS, LGS, KPSS, DENEME, DIGER)
- ✅ **Sınav kapsamı seçimi (Tüm Okul, Sınıf Seviyesi, Belirli Sınıf)**
- ✅ Sınıf seviyesi seçimi (5-12) - kapsama göre
- ✅ Sınıf seçimi dropdown'u - kapsama göre
- ✅ Sınav detayları (ad, tarih, açıklama)
- ✅ "Sonuçları Gir" butonu (her sınav için)
- ✅ Sonuç sayısı göstergesi

**Gösterilen Bilgiler:**
- Sınav adı
- Sınav tipi (YKS, LGS, vb.)
- Sınav tarihi
- **Sınav kapsamı (🏫 Tüm Okul, 🎓 9. Sınıf, 📚 9/A)**
- Girilmiş sonuç sayısı

**İş Akışı:**
1. Rehberlik uzmanı "Yeni Sınav" butonuna tıklar
2. Form doldurulur:
   - Sınav adı, tipi, tarihi
   - **Kapsam seçimi:** Tüm Okul / Sınıf Seviyesi / Belirli Sınıf
   - Kapsama göre grade veya classId seçimi
   - Açıklama (opsiyonel)
3. Sınav oluşturulur
4. Liste sayfasında kapsam bilgisiyle birlikte görünür
5. "Sonuçları Gir" butonuna tıklanır
6. Sonuç girme sayfasına yönlendirilir (FAZ 5'te geliştirilecek)

---

### 2. **Veli - Sınavlar** (`/veli/sinavlar`)

**Dosya:** `/src/app/veli/sinavlar/page.tsx`

**Özellikler:**
- ✅ Öğrencinin tüm sınav sonuçlarını görüntüleme
- ✅ Toplam puan göstergesi
- ✅ Sıralama göstergesi (#12 gibi)
- ✅ Yüzdelik dilim göstergesi (%85.5)
- ✅ Rehberlik notları görüntüleme
- ✅ Sınav tarihi ve tipi bilgisi
- ✅ Renkli göstergeler (mavi: puan, mor: sıralama, yeşil: yüzdelik)

**Gösterilen İstatistikler:**
- **Toplam Puan:** Mavi arka plan
- **Sıralama:** Mor arka plan, ödül ikonu
- **Yüzdelik Dilim:** Yeşil arka plan

---

### 3. **Öğretmen Görünümü**

Öğretmenler için sınav sonuçları görüntüleme özelliği FAZ 5'te (Öğrenci Dashboard) eklenecektir. Öğretmenler, sınıflarındaki öğrencilerin genel performansını görebilecektir.

---

## 🎨 UI/UX Tasarım

### Rehberlik Arayüzü
- **Mor Tema:** Rehberlik ekibine özel renk
- **Basit Form:** Hızlı sınav oluşturma
- **Kart Görünümü:** Her sınav için ayrı kart
- **Görsel İkonlar:** FileText, Calendar, TrendingUp

### Veli Arayüzü
- **Yeşil Tema:** Veli arayüzü renk paleti
- **Vurgulanan Metrікler:** Büyük fontlar ve renkli arka planlar
- **Ödül İkonu:** Sıralama için özel ikon (#)
- **Bilgilendirici Notlar:** Rehberlik notları açıkça gösteriliyor

---

## 🔄 İş Akışları

### Sınav Oluşturma ve Sonuç Girme

```
1. Rehberlik → "Yeni Sınav" butonuna tıklar
2. Rehberlik → Formu doldurur (ad, tip, tarih, sınıf)
3. Rehberlik → "Oluştur" butonuna tıklar
4. Sistem → Sınavı oluşturur ve listede gösterir
5. Rehberlik → "Sonuçları Gir" butonuna tıklar
6. Rehberlik → Öğrenci bazlı sonuçları girer (FAZ 5)
7. Sistem → Sonuçları kaydeder
8. Veli → Veli panelinde sonuçları görür
9. Öğretmen → Sınıf performansını görür (FAZ 5)
```

---

## 📊 Esneklik: JSON Scores

### Neden JSON Kullanıldı?

Sınav sonuçları (`scores`) JSON formatında saklanır çünkü:

1. **Esneklik:** Her sınav tipi farklı yapıya sahip olabilir
   - YKS: TYT + AYT + Dil
   - LGS: Türkçe, Matematik, Fen, Sosyal, İngilizce
   - KPSS: Genel Yetenek, Genel Kültür

2. **Genişletilebilirlik:** Gelecekte yeni alanlar eklenebilir

3. **Detay:** Ders bazlı doğru/yanlış/net bilgileri saklanabilir

### Örnek JSON Yapıları

**YKS:**
```json
{
  "TYT": {
    "turkce": {"dogru": 35, "yanlis": 3, "net": 34},
    "matematik": {"dogru": 30, "yanlis": 5, "net": 28.33},
    "fen": {"dogru": 18, "yanlis": 2, "net": 17.33},
    "sosyal": {"dogru": 15, "yanlis": 3, "net": 14}
  },
  "AYT": {
    "matematik": {"dogru": 25, "yanlis": 2, "net": 24.33},
    "fizik": {"dogru": 12, "yanlis": 1, "net": 11.67}
  },
  "totalScore": 450.5,
  "ranking": 1250
}
```

**LGS:**
```json
{
  "turkce": {"dogru": 18, "yanlis": 2, "net": 17.33},
  "matematik": {"dogru": 17, "yanlis": 3, "net": 16},
  "fen": {"dogru": 18, "yanlis": 2, "net": 17.33},
  "sosyal": {"dogru": 9, "yanlis": 1, "net": 8.67},
  "ingilizce": {"dogru": 8, "yanlis": 0, "net": 8},
  "totalScore": 425.8
}
```

---

## 🔐 Yetkilendirme

### Rehberlik Yetkileri
- ✅ Sınav oluşturma
- ✅ Sınav güncelleme/silme
- ✅ Sonuç girme (toplu)
- ✅ Tüm sınavları ve sonuçları görüntüleme
- ✅ Rehberlik notları ekleme

### Veli Yetkileri
- ✅ Öğrencisinin sınav sonuçlarını görüntüleme
- ❌ Sınav oluşturma
- ❌ Sonuç girme

### Öğretmen Yetkileri (FAZ 5)
- ✅ Sınıf performansını görüntüleme
- ❌ Sınav oluşturma
- ❌ Sonuç girme

---

## 🚀 Sonraki Adımlar (FAZ 4+)

### FAZ 4 - Görüş Girişi Modülü
- Öğretmen ve rehberlik görüşleri
- Akademik ve bireysel gelişim notları
- Tarihli görüş geçmişi

### FAZ 5 - Öğrenci Dashboard & İleri Özellikler
- Tüm modülleri birleştiren merkezi panel
- **Sonuç Girme Detay Sayfası:** `/rehberlik/sinavlar/[id]` - Öğrenci listesi ve sonuç gir me formu
- Grafik ve analiz araçları
- Karşılaştırmalı raporlar
- Excel/PDF export

---

## 📝 Teknik Notlar

### Performance
- **Index'ler:** examId, studentId, totalScore, ranking
- **JSON Performansı:** PostgreSQL JSONB kullanılıyor (hızlı sorgulama)
- **Eager Loading:** İlişkili veriler tek sorguda

### Güvenlik
- **Input Validation:** Tüm API endpoint'lerinde
- **Unique Constraint:** Aynı öğrenci aynı sınava birden fazla sonuç giremez
- **Auth Kontrolü:** Sadece rehberlik sonuç girebilir

### Veri Bütünlüğü
- **enteredById:** Kim tarafından girildiği takip edilir
- **updatedAt:** Son güncelleme zamanı
- **Cascade Delete:** Sınav silindiğinde sonuçlar da silinir

---

## 🎯 Özet

✅ **Tamamlanan:**
- [x] 2 Yeni Model (Exam, ExamResult)
- [x] 1 Yeni Enum (ExamType)
- [x] Migration dosyası
- [x] 8 API Endpoint (Exam CRUD, Results)
- [x] 2 Frontend Sayfası (Rehberlik, Veli)
- [x] Sidebar Güncellemeleri

📋 **Bekleyen (Gelecek Fazlar):**
- [ ] FAZ 4: Görüş Girişi Modülü
- [ ] FAZ 5: Öğrenci Dashboard + İleri Özellikler

---

**Son Güncelleme:** 25 Ocak 2025  
**Versiyon:** 1.1.0  
**Durum:** ✅ Tamamlandı (FAZ 3 - Sınav Analizi + Sınıf Yönetimi Entegrasyonu)

---

## 🆕 v1.1.0 Güncellemeleri (Sınıf Yönetimi Entegrasyonu)

### Eklenen Özellikler:
1. **Sınav Kapsamı (Scope) Sistemi:**
   - 🏫 Tüm Okul: Tüm öğrenciler için genel sınavlar
   - 🎓 Sınıf Seviyesi: Belirli grade'deki tüm sınıflar (örn: tüm 9'lar)
   - 📚 Belirli Sınıf: Sadece seçilen sınıf (örn: 9/A)

2. **Class Model İlişkisi:**
   - `Exam` modeline `classId` ve `class` ilişkisi eklendi
   - `Class` modeline `exams` ilişkisi eklendi
   - Her sınıf için sınava özel sınavlar tanımlanabilir

3. **API Güncellemeleri:**
   - `POST /api/exams`: `scope`, `classId` parametreleri eklendi
   - `GET /api/exams`: `classId` query parametresi eklendi
   - Response'larda `class` bilgisi dahil edildi

4. **Frontend İyileştirmeleri:**
   - Rehberlik panelinde kapsam seçimi dropdown'u
   - Dinamik form: Kapsama göre sınıf/grade seçimi
   - Sınav listesinde kapsam göstergesi (ikonlarla)

### Teknik Değişiklikler:
- `grade` alanı artık opsiyonel (nullable)
- `classId` alanı eklendi (opsiyonel)
- Migration güncellemeleri
- Frontend type interface'leri güncellendi

