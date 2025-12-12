# Neredeyiz Modülü - Geliştirme Dokümantasyonu

## 📋 Genel Bakış

"Neredeyiz" modülü, okuldaki eğitim-öğretim yılının akademik ilerlemesini, planlanan takvime göre nerede olunduğunu ve planlanan/planlanmayan aksamaların etkisini izlemeyi amaçlayan bir İlerleme Takip ve Yönetim Sistemi'dir.

**Modül Amacı:** Yıllık plan takibini sistematik hale getirmek, derslerin planlanan takvime göre ilerlemesini izlemek, aksamaları kayıt altına almak ve detaylı raporlar üretmek.

---

## 🗄️ 1. VERİTABANI YAPISI

### 1.1 Prisma Schema Modelleri

#### AcademicYear (Akademik Yıl)
```prisma
model AcademicYear {
  id            String   @id @default(cuid())
  name          String   // Örn: "2024-2025"
  startDate     DateTime
  endDate       DateTime
  isActive      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  subjects      Subject[]
  holidays      Holiday[]
  disruptions   Disruption[]

  @@index([isActive])
  @@index([startDate, endDate])
  @@map("academic_years")
}
```

**Özellikler:**
- Yıllık plan takibinin temel zaman çerçevesi
- Sadece bir akademik yıl aktif olabilir
- Başlangıç ve bitiş tarihleri ile çalışma günleri hesaplanır

#### Subject (Ders)
```prisma
model Subject {
  id            String   @id @default(cuid())
  academicYearId String
  name          String   // Örn: "Geometri"
  code          String?  // Ders kodu
  grade         Int      // Sınıf: 5, 6, 7, 8, 9, 10, 11, 12
  section       String?  // Şube: "A", "B", "C", vb. (opsiyonel)
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  academicYear AcademicYear      @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  units        Unit[]
  assignments  SubjectAssignment[]

  @@unique([academicYearId, name, grade, section])
  @@index([academicYearId])
  @@index([academicYearId, grade])
  @@index([academicYearId, grade, section])
  @@index([name, grade])
  @@map("subjects")
}
```

**Özellikler:**
- Sınıf ve şube bazlı ders tanımlama
- Aynı akademik yılda aynı ders-sınıf-şube kombinasyonu tekrar edemez
- Öğretmen atama desteği

#### Unit (Ünite)
```prisma
model Unit {
  id          String   @id @default(cuid())
  subjectId   String
  name        String   // Örn: "Üçgenler"
  order       Int      // Sıralama
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  topics  Topic[]

  @@index([subjectId])
  @@index([subjectId, order])
  @@map("units")
}
```

**Özellikler:**
- Ders içeriğinin ünite bazlı organizasyonu
- Sıralama (order) ile hiyerarşik yapı

#### Topic (Konu)
```prisma
model Topic {
  id                String    @id @default(cuid())
  unitId            String
  name              String    // Örn: "Üçgenin İç Açıları"
  order             Int       // Sıralama
  hasTimeRange      Boolean   @default(true) // Belirli bir zaman aralığı olup olmadığı
  plannedStartWeek  Int?      // Planlanan başlangıç haftası
  plannedEndWeek    Int?      // Planlanan bitiş haftası
  plannedStartDate  DateTime? // Planlanan başlangıç tarihi
  plannedEndDate    DateTime? // Planlanan bitiş tarihi
  estimatedDuration Int?      // Tahmini süre (gün)
  description       String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  unit      Unit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  subTopics SubTopic[]
  progress  Progress[]

  @@index([unitId])
  @@index([unitId, order])
  @@map("topics")
}
```

**Özellikler:**
- Zaman aralığı olmayan konular için `hasTimeRange: false` seçeneği
- Planlanan tarih ve hafta bilgileri
- Otomatik durum hesaplama (Planlandı, Devam Ediyor, Gecikmeli, Tamamlandı)

#### SubTopic (Alt Konu)
```prisma
model SubTopic {
  id          String   @id @default(cuid())
  topicId     String
  name        String
  order       Int
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@index([topicId])
  @@index([topicId, order])
  @@map("sub_topics")
}
```

**Özellikler:**
- Konuların alt konulara bölünebilmesi
- Detaylı içerik organizasyonu

#### Holiday (Tatil)
```prisma
model Holiday {
  id            String      @id @default(cuid())
  academicYearId String
  name          String      // Örn: "Kurban Bayramı"
  type          HolidayType
  startDate     DateTime
  endDate       DateTime
  description   String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@index([academicYearId])
  @@index([startDate, endDate])
  @@index([type])
  @@map("holidays")
}

enum HolidayType {
  RESMI_TATIL      // Resmi Tatil
  YARILYIL_TATILI  // Yarıyıl Tatili
  ARA_TATIL        // Ara Tatil
  DIGER            // Diğer
}
```

**Özellikler:**
- Akademik yıl başında tatillerin tanımlanması
- Çalışma günü hesaplamalarında otomatik düşülme

#### Disruption (Aksama)
```prisma
model Disruption {
  id              String          @id @default(cuid())
  academicYearId  String
  name            String          // Örn: "Kar Tatili"
  type            DisruptionType
  reason          String          // Açıklama
  startDate       DateTime
  endDate         DateTime
  affectedSubjects String[]       // Etkilenen dersler (Subject ID'leri)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdBy       String?         // Oluşturan kullanıcı

  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@index([academicYearId])
  @@index([startDate, endDate])
  @@index([type])
  @@map("disruptions")
}

enum DisruptionType {
  PLANLI_OKUL        // Planlı/Okul Kaynaklı (Gezi, tören, veli toplantısı, müfettiş ziyareti)
  PLANDISI_DOGAL     // Plan Dışı/Doğal (Kar tatili, sel, elektrik kesintisi)
  OGRETMEN_KAYNAKLI  // Öğretmen Kaynaklı (Hastalık, hizmet içi eğitim)
}
```

**Özellikler:**
- Planlanan ve planlanmayan aksamaların kayıt altına alınması
- Aksamaların sebep bazlı kategorize edilmesi
- Etkilenen derslerin belirlenmesi

#### Progress (İlerleme)
```prisma
model Progress {
  id              String         @id @default(cuid())
  topicId         String
  status          ProgressStatus
  plannedDate     DateTime?
  actualStartDate DateTime?
  actualEndDate   DateTime?
  notes           String?
  reportedBy      String?        // Bildiren öğretmen
  markedBy        String?        // İşaretleyen rehberlik danışmanı
  markedAt        DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@unique([topicId])
  @@index([topicId])
  @@index([status])
  @@index([markedAt])
  @@map("progress")
}

enum ProgressStatus {
  PLANLANDI     // Planlandı
  DEVAM_EDIYOR  // Devam Ediyor
  TAMAMLANDI    // Tamamlandı
  ERTELENDI     // Ertelendi
}
```

**Özellikler:**
- Konuların gerçek tamamlanma durumunun kayıt altına alınması
- Planlanan vs. gerçek tarih karşılaştırması
- Otomatik durum hesaplama (tarih bazlı)

#### SubjectAssignment (Ders-Öğretmen Atama)
```prisma
model SubjectAssignment {
  id        String   @id @default(cuid())
  subjectId String
  staffId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  staff   Staff  @relation(fields: [staffId], references: [id], onDelete: Cascade)

  @@unique([subjectId, staffId])
  @@index([subjectId])
  @@index([staffId])
  @@map("subject_assignments")
}
```

**Özellikler:**
- Personel Yönetimi modülünden öğretmenlerin derslere atanması
- Bir derse birden fazla öğretmen atanabilir

---

## 🔌 2. API ROUTE'LARI

### 2.1 Academic Years API

**Dosya:** `src/app/api/neredeyiz/academic-years/route.ts`

**GET `/api/neredeyiz/academic-years`**
- Tüm akademik yılları listeler
- Aktif akademik yıl bilgisi dahil

**POST `/api/neredeyiz/academic-years`**
- Yeni akademik yıl oluşturur
- Validasyon: `name`, `startDate`, `endDate` zorunlu
- `startDate < endDate` kontrolü
- Yeni yıl aktif yapılırsa, diğer aktif yıllar otomatik pasif yapılır

**PUT `/api/neredeyiz/academic-years/[id]`**
- Akademik yıl günceller
- Aynı validasyon kuralları geçerli

**DELETE `/api/neredeyiz/academic-years/[id]`**
- Akademik yıl siler (cascade ile ilişkili veriler de silinir)

### 2.2 Subjects API

**Dosya:** `src/app/api/neredeyiz/subjects/route.ts`

**GET `/api/neredeyiz/subjects`**
- Query parametreleri:
  - `academicYearId`: Akademik yıl filtresi
  - `grade`: Sınıf filtresi (5-12)
  - `section`: Şube filtresi
- İlişkili veriler: `academicYear`, `assignments.staff`, `units.topics.progress`
- Sıralama: `grade` (ascending)

**POST `/api/neredeyiz/subjects`**
- Yeni ders oluşturur
- Validasyon:
  - `academicYearId`, `name`, `grade` zorunlu
  - `grade` 5-12 arası olmalı
  - `section` opsiyonel (boş string ise null)
- Unique constraint kontrolü: `[academicYearId, name, grade, section]`

**PUT `/api/neredeyiz/subjects/[id]`**
- Ders günceller
- Aynı validasyon kuralları geçerli

**DELETE `/api/neredeyiz/subjects/[id]`**
- Ders siler (cascade ile ilişkili veriler de silinir)

**GET `/api/neredeyiz/subjects/[id]`**
- Tek ders detayını getirir
- Tüm ilişkili veriler dahil

**POST `/api/neredeyiz/subjects/[id]/assignments`**
- Derse öğretmen atar
- Body: `{ staffId: string }`
- Unique constraint: Aynı öğretmen aynı derse tekrar atanamaz

**DELETE `/api/neredeyiz/subjects/[id]/assignments`**
- Ders-öğretmen atamasını kaldırır
- Query: `?staffId=xxx`

### 2.3 Units API

**Dosya:** `src/app/api/neredeyiz/units/route.ts`

**GET `/api/neredeyiz/units`**
- Query: `subjectId` (zorunlu)
- Üniteleri `order` sırasına göre listeler

**POST `/api/neredeyiz/units`**
- Yeni ünite oluşturur
- Validasyon: `name`, `order`, `subjectId` zorunlu

**PUT `/api/neredeyiz/units/[id]`**
- Ünite günceller

**DELETE `/api/neredeyiz/units/[id]`**
- Ünite siler

### 2.4 Topics API

**Dosya:** `src/app/api/neredeyiz/topics/route.ts`

**GET `/api/neredeyiz/topics`**
- Query: `unitId` (zorunlu)
- Konuları `order` sırasına göre listeler

**POST `/api/neredeyiz/topics`**
- Yeni konu oluşturur
- Validasyon:
  - `name`, `order`, `unitId` zorunlu
  - `hasTimeRange`: true ise tarih/hafta bilgileri zorunlu
  - `plannedStartDate < plannedEndDate` kontrolü
  - `plannedStartWeek < plannedEndWeek` kontrolü

**PUT `/api/neredeyiz/topics/[id]`**
- Konu günceller
- Aynı validasyon kuralları geçerli

**DELETE `/api/neredeyiz/topics/[id]`**
- Konu siler

### 2.5 Holidays API

**Dosya:** `src/app/api/neredeyiz/holidays/route.ts`

**GET `/api/neredeyiz/holidays`**
- Query: `academicYearId` (zorunlu)
- Tatilleri listeler

**POST `/api/neredeyiz/holidays`**
- Yeni tatil oluşturur
- Validasyon:
  - `name`, `startDate`, `endDate`, `type`, `academicYearId` zorunlu
  - `startDate < endDate` kontrolü

**PUT `/api/neredeyiz/holidays/[id]`**
- Tatil günceller

**DELETE `/api/neredeyiz/holidays/[id]`**
- Tatil siler

### 2.6 Disruptions API

**Dosya:** `src/app/api/neredeyiz/disruptions/route.ts`

**GET `/api/neredeyiz/disruptions`**
- Query: `academicYearId` (zorunlu)
- Aksamaları listeler

**POST `/api/neredeyiz/disruptions`**
- Yeni aksama oluşturur
- Validasyon:
  - `name`, `startDate`, `endDate`, `type`, `academicYearId` zorunlu
  - `startDate < endDate` kontrolü

**PUT `/api/neredeyiz/disruptions/[id]`**
- Aksama günceller

**DELETE `/api/neredeyiz/disruptions/[id]`**
- Aksama siler

### 2.7 Progress API

**Dosya:** `src/app/api/neredeyiz/progress/route.ts`

**GET `/api/neredeyiz/progress`**
- Query parametreleri:
  - `topicId`: Konu filtresi
  - `status`: Durum filtresi
  - `subjectId`: Ders filtresi
  - `grade`: Sınıf filtresi
  - `section`: Şube filtresi
- İlişkili veriler: `topic.unit.subject`

**POST `/api/neredeyiz/progress`**
- İlerleme kaydı oluşturur veya günceller
- Eğer `topicId` için kayıt varsa günceller, yoksa oluşturur
- Validasyon: `topicId`, `status` zorunlu
- `actualEndDate` manuel olarak girilebilir (zaman aralığı olmayan konular için)

### 2.8 Reports API

**Dosya:** `src/app/api/neredeyiz/reports/progress/route.ts`

**GET `/api/neredeyiz/reports/progress`**
- Query parametreleri:
  - `academicYearId` (zorunlu)
  - `subjectId` (opsiyonel)
  - `grade` (opsiyonel)
  - `section` (opsiyonel)
- Dönen veriler:
  - Ders bazında istatistikler (toplam konu, tamamlanan, devam eden, planlanan, gecikmeli)
  - Genel özet (toplam ders, toplam konu, ortalama tamamlanma yüzdesi)
- Otomatik durum hesaplama:
  - Tarih bazlı "Devam Ediyor" ve "Gecikmeli" durumları
  - `plannedStartDate` ve `plannedEndDate` ile mevcut tarih karşılaştırması

**Dosya:** `src/app/api/neredeyiz/reports/disruptions/route.ts`

**GET `/api/neredeyiz/reports/disruptions`**
- Query: `academicYearId` (zorunlu)
- Dönen veriler:
  - Aksama tipi bazında istatistikler (sayı, toplam gün, yüzde)
  - Genel özet (toplam aksama, toplam kayıp gün, ortalama gün/aksama)

---

## 🎨 3. FRONTEND SAYFALARI

### 3.1 Dashboard (`/neredeyiz`)

**Dosya:** `src/app/neredeyiz/page.tsx`

**Özellikler:**
- Genel istatistikler kartları:
  - Toplam Konu
  - Tamamlanan Konu
  - Devam Eden Konu
  - Gecikmeli Konu
  - Tamamlanma Yüzdesi
- Ders bazında ilerleme durumu:
  - Her ders için dairesel ilerleme göstergesi
  - Renk kodlaması (yeşil: iyi, sarı: orta, kırmızı: kötü)
  - Detaylı istatistikler (tamamlanan/toplam, devam eden, gecikmeli)
- Aksama sebep analizi:
  - Aksama tipi bazında yüzdelik dağılım
  - Toplam aksama sayısı ve kayıp gün bilgisi
- Kısayol butonları:
  - Ders Oluştur
  - Öğretmen Ata
  - Aksama Oluştur
  - İlerleme Takibi
  - Raporlar
  - Yönetim Paneli
- Filtreler:
  - Sınıf seçimi (5-12)
  - Şube seçimi (dinamik, mevcut şubelerden)

**Teknik Detaylar:**
- `useMemo` ile performans optimizasyonu
- Skeleton loader ile yükleme durumu
- Responsive tasarım (mobile-first)

### 3.2 Yönetim Sayfası (`/neredeyiz/yonetim`)

**Dosya:** `src/app/neredeyiz/yonetim/page.tsx`

**Özellikler:**

#### Akademik Yıllar Yönetimi
- Akademik yıl listesi
- Yeni akademik yıl oluşturma formu:
  - Ad, başlangıç tarihi, bitiş tarihi
  - Aktif yıl seçimi
  - **Tatil Yönetimi:**
    - "Resmi Tatil Ekle" butonu
    - Her tatil için: ad, tip, başlangıç tarihi, bitiş tarihi, açıklama
    - Kaydet/Kaldır butonları
    - Yeni tatiller için anlık kayıt
    - Mevcut tatiller için güncelleme
- Akademik yıl düzenleme
- Akademik yıl silme

#### Dersler Yönetimi
- Ders listesi (sınıf ve şube bilgisi ile)
- Yeni ders oluşturma formu:
  - Ders adı (zorunlu)
  - Ders kodu (opsiyonel)
  - **Sınıf seçimi (zorunlu, 5-12)**
  - **Şube (opsiyonel)**
  - Açıklama (opsiyonel)
- Ders düzenleme
- Ders silme
- Ders detay sayfasına yönlendirme
- Öğretmen atama bilgisi gösterimi

**Teknik Detaylar:**
- Tab yapısı (Akademik Yıllar / Dersler)
- Form validasyonu (client-side)
- Toast bildirimleri
- Responsive tasarım

### 3.3 Ders Detay Sayfası (`/neredeyiz/dersler/[id]`)

**Dosya:** `src/app/neredeyiz/dersler/[id]/page.tsx`

**Özellikler:**
- Ders bilgileri (ad, sınıf, şube)
- Öğretmen atama:
  - Atanmış öğretmenler listesi
  - Öğretmen ekleme modalı (Personel Yönetimi'nden `OGRETMEN` departmanı)
  - Öğretmen kaldırma
- Ünite yönetimi:
  - Ünite listesi (accordion yapısı)
  - Yeni ünite ekleme
  - Ünite düzenleme
  - Ünite silme
- Konu yönetimi:
  - Konu listesi (ünite bazlı)
  - Yeni konu ekleme formu:
    - Konu adı, sıra, açıklama
    - **"Belirli bir zaman aralığı olsun" checkbox'ı**
    - Checkbox işaretliyse:
      - Planlanan başlangıç/bitiş haftası
      - Planlanan başlangıç/bitiş tarihi
      - Tahmini süre (gün)
    - Checkbox işaretsizse: Tarih/hafta alanları gizlenir
  - Konu düzenleme
  - Konu silme
  - Konu durumu gösterimi (renk kodlu)

**Teknik Detaylar:**
- Accordion yapısı ile ünitelerin açılıp kapanması
- Conditional rendering (zaman aralığı checkbox'ına göre)
- Form validasyonu
- Toast bildirimleri

### 3.4 İlerleme Takibi Sayfası (`/neredeyiz/ilerleme`)

**Dosya:** `src/app/neredeyiz/ilerleme/page.tsx`

**Özellikler:**
- **Filtreler:**
  - Akademik yıl seçimi
  - **Sınıf seçimi (5-12)**
  - **Şube seçimi (dinamik)**
- **Ders Kartları:**
  - Her ders için tıklanabilir kart
  - Ders adı, sınıf, şube bilgisi
  - Toplam konu sayısı
  - Tamamlanan konu sayısı
  - İlerleme yüzdesi (progress bar)
  - Kart tıklanınca genişler ve detaylar gösterilir
- **Ders Detayları (Genişletilmiş):**
  - Ünite listesi (accordion)
  - Her ünite için:
    - Ünite adı
    - İstatistikler: toplam konu, tamamlanma yüzdesi, tamamlanan/devam eden/planlanan/gecikmeli sayıları
    - "Tamamlandı" butonu (ünite bazlı)
  - Konu listesi:
    - Konu adı
    - Durum badge'i (renk kodlu)
    - Planlanan tarih aralığı
    - Gecikme bilgisi (varsa)
    - "Tamamlandı" butonu
- **Arama ve Filtreleme:**
  - Konu adı ve ünite adına göre arama
  - Durum filtresi (Tümü, Planlandı, Devam Ediyor, Tamamlandı, Gecikmeli)
- **Tamamlama İşlemleri:**
  - Zaman aralığı olmayan konular için: Tamamlama tarihi seçme modalı
  - Zaman aralığı olan konular için: Otomatik tarih atama
  - Ünite tamamlama: Ünite içindeki tüm konuları tamamlandı olarak işaretler

**Otomatik Durum Hesaplama:**
```typescript
function getTopicStatus(topic: Topic): {
  status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI"
  label: string
  color: string
  icon: React.ComponentType
} {
  // Progress kaydı varsa ve TAMAMLANDI ise
  if (topic.progress?.[0]?.status === "TAMAMLANDI") {
    return { status: "TAMAMLANDI", ... }
  }
  
  // Tarih bilgisi varsa
  if (topic.plannedStartDate && topic.plannedEndDate) {
    const now = new Date()
    const start = new Date(topic.plannedStartDate)
    const end = new Date(topic.plannedEndDate)
    
    if (now < start) {
      return { status: "PLANLANDI", ... }
    } else if (now >= start && now <= end) {
      return { status: "DEVAM_EDIYOR", ... }
    } else {
      return { status: "GECIKMELI", ... }
    }
  }
  
  // Varsayılan
  return { status: "PLANLANDI", ... }
}
```

**Teknik Detaylar:**
- `useMemo` ile filtreleme ve arama optimizasyonu
- Accordion yapısı
- Modal dialog (tamamlama tarihi seçimi)
- Responsive tasarım
- Loading states

### 3.5 Aksamalar Sayfası (`/neredeyiz/aksamalar`)

**Dosya:** `src/app/neredeyiz/aksamalar/page.tsx`

**Özellikler:**
- Akademik yıl seçimi
- Aksama listesi:
  - Aksama adı, tipi, sebebi
  - Başlangıç/bitiş tarihi
  - Etkilenen dersler
- Yeni aksama oluşturma formu:
  - Aksama adı
  - Tip seçimi (Planlı/Okul, Plan Dışı/Doğal, Öğretmen Kaynaklı)
  - Sebep açıklaması
  - Başlangıç/bitiş tarihi
  - Etkilenen dersler (multi-select)
- Aksama düzenleme
- Aksama silme

**Teknik Detaylar:**
- Form validasyonu
- Tarih kontrolü (başlangıç < bitiş)
- Toast bildirimleri

### 3.6 Raporlar Sayfası (`/neredeyiz/raporlar`)

**Dosya:** `src/app/neredeyiz/raporlar/page.tsx`

**Özellikler:**
- Akademik yıl seçimi
- İlerleme raporu:
  - Ders bazında detaylı istatistikler
  - Genel özet bilgileri
- Aksama raporu:
  - Aksama tipi bazında analiz
  - Yüzdelik dağılım
  - Toplam kayıp gün bilgisi

**Teknik Detaylar:**
- API'den veri çekme
- Grafik gösterimleri (opsiyonel)
- Export özellikleri (gelecekte eklenebilir)

---

## 🎯 4. ÖZEL ÖZELLİKLER

### 4.1 Dedicated Sidebar ve Layout

**Dosya:** `src/components/layout/neredeyiz-sidebar.tsx`

**Özellikler:**
- Neredeyiz modülüne özel sidebar
- Navigasyon menüleri:
  - Dashboard
  - Yönetim
  - İlerleme Takibi
  - Aksamalar
  - Raporlar
- "Ana Panele Dön" butonu
- Aktif sayfa vurgulama
- Responsive tasarım (mobile'da hamburger menu)

**Dosya:** `src/app/neredeyiz/layout.tsx`

**Özellikler:**
- Neredeyiz modülü için özel layout
- Sidebar entegrasyonu
- Tüm alt sayfaları kapsar

### 4.2 Personel Yönetimi Entegrasyonu

**Özellikler:**
- Personel Yönetimi modülünden öğretmenlerin çekilmesi
- `department: OGRETMEN` filtresi
- Derslere öğretmen atama
- Atanmış öğretmenlerin görüntülenmesi

**API Entegrasyonu:**
- `GET /api/staff?department=OGRETMEN`
- `POST /api/neredeyiz/subjects/[id]/assignments`
- `DELETE /api/neredeyiz/subjects/[id]/assignments`

### 4.3 Sınıf ve Şube Faktörü

**Özellikler:**
- Derslerin sınıf bazlı tanımlanması (5-12)
- Şube desteği (opsiyonel)
- Sınıf/şube bazlı filtreleme:
  - Dashboard
  - İlerleme Takibi
  - Raporlar
- Unique constraint: `[academicYearId, name, grade, section]`

**Migration:**
- `20251212120000_add_grade_section_to_subjects`
- Mevcut derslere varsayılan sınıf atama (9. sınıf)

### 4.4 Otomatik Durum Hesaplama

**Özellikler:**
- Tarih bazlı otomatik durum belirleme
- Progress kaydı yoksa bile durum hesaplanır
- Durumlar:
  - **Planlandı:** `now < plannedStartDate`
  - **Devam Ediyor:** `plannedStartDate <= now <= plannedEndDate`
  - **Gecikmeli:** `now > plannedEndDate` ve `status !== "TAMAMLANDI"`
  - **Tamamlandı:** `progress.status === "TAMAMLANDI"`

**Kullanım Yerleri:**
- İlerleme Takibi sayfası
- Dashboard istatistikleri
- Raporlar

### 4.5 Zaman Aralığı Olmayan Konular

**Özellikler:**
- `hasTimeRange: false` seçeneği
- Tarih/hafta alanları gizlenir
- Manuel tamamlama:
  - "Tamamlandı" butonuna tıklanınca
  - Tamamlama tarihi seçme modalı açılır
  - Seçilen tarih `actualEndDate` olarak kaydedilir

**Kullanım Senaryosu:**
- Belirli bir zaman aralığına bağlı olmayan konular
- Öğretmenin kendi takdirine göre tamamladığı konular
- Proje bazlı çalışmalar

### 4.6 Akademik Yıl Tatil Yönetimi

**Özellikler:**
- Akademik yıl oluştururken/düzenlerken tatil ekleme
- "Resmi Tatil Ekle" butonu
- Her tatil için:
  - Ad, tip, başlangıç/bitiş tarihi, açıklama
  - Anlık kayıt (yeni tatiller için)
  - Güncelleme (mevcut tatiller için)
  - Silme

**Tatil Tipleri:**
- Resmi Tatil
- Yarıyıl Tatili
- Ara Tatil
- Diğer

---

## 🔄 5. MİGRASYONLAR

### 5.1 İlk Modül Oluşturma

**Migration:** `20251211150000_add_neredeyiz_module`

**İçerik:**
- `academic_years` tablosu
- `subjects` tablosu
- `subject_assignments` tablosu
- `units` tablosu
- `topics` tablosu
- `sub_topics` tablosu
- `holidays` tablosu
- `disruptions` tablosu
- `progress` tablosu
- Enum'lar: `HolidayType`, `DisruptionType`, `ProgressStatus`

### 5.2 Topic hasTimeRange Eklendi

**Migration:** `20251211160000_add_topic_has_time_range`

**İçerik:**
- `topics` tablosuna `hasTimeRange` boolean kolonu eklendi
- Default değer: `true`

### 5.3 Sınıf ve Şube Faktörü

**Migration:** `20251212120000_add_grade_section_to_subjects`

**İçerik:**
- `subjects` tablosuna `grade` integer kolonu eklendi
- `subjects` tablosuna `section` text kolonu eklendi
- Mevcut derslere varsayılan sınıf atama (9. sınıf)
- Unique constraint: `[academicYearId, name, grade, section]`
- Index'ler: `[academicYearId, grade]`, `[academicYearId, grade, section]`, `[name, grade]`

---

## 🎨 6. UI/UX ÖZELLİKLERİ

### 6.1 Responsive Tasarım

**Yaklaşım:**
- Mobile-first design
- Tailwind CSS utility classes
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`

**Örnekler:**
- Grid yapıları: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Padding: `px-3 sm:px-4 lg:px-6`
- Font boyutları: `text-xs sm:text-sm lg:text-base`
- Button boyutları: `h-9 sm:h-10`

### 6.2 Loading States

**Özellikler:**
- Skeleton loaders (Dashboard, İlerleme Takibi)
- Button loading states (spinner + disabled)
- Toast bildirimleri (başarı, hata, bilgi)

**Kullanılan Bileşenler:**
- `Skeleton` component
- `Loader2` icon (lucide-react)
- Custom toast system

### 6.3 Form Validasyonu

**Client-Side:**
- Zorunlu alan kontrolü
- Tarih karşılaştırması (başlangıç < bitiş)
- Sınıf aralığı kontrolü (5-12)
- String trim ve boş kontrolü

**Server-Side:**
- API route'larda aynı validasyonlar
- Prisma unique constraint kontrolü
- Error handling ve uygun HTTP status kodları

### 6.4 Kullanıcı Geri Bildirimi

**Toast Bildirimleri:**
- Başarı: Yeşil, checkmark icon
- Hata: Kırmızı, alert icon
- Bilgi: Mavi, info icon

**Örnekler:**
- "Ders başarıyla oluşturuldu!"
- "Konu tamamlandı olarak işaretlendi!"
- "Lütfen bir akademik yıl seçin!"

### 6.5 Boş Durumlar (Empty States)

**Özellikler:**
- İkon + mesaj kombinasyonu
- Kullanıcıya ne yapması gerektiğini söyleyen mesajlar

**Örnekler:**
- "Henüz ders tanımlanmamış"
- "Bu akademik yılda henüz ders tanımlanmamış"
- "Bu derste henüz konu tanımlanmamış"

---

## 🔐 7. GÜVENLİK VE VALİDASYON

### 7.1 Veri Validasyonu

**Client-Side:**
- Form alanlarında `required` attribute
- JavaScript ile ek kontroller
- Kullanıcı dostu hata mesajları

**Server-Side:**
- API route'larda input validasyonu
- Prisma schema constraints
- Type safety (TypeScript)

### 7.2 Unique Constraints

**Örnekler:**
- `Subject`: `[academicYearId, name, grade, section]`
- `SubjectAssignment`: `[subjectId, staffId]`
- `Progress`: `[topicId]` (bir konu için tek ilerleme kaydı)

### 7.3 Cascade Delete

**Özellikler:**
- Akademik yıl silinince → Dersler, tatiller, aksamalar silinir
- Ders silinince → Üniteler, konular, atamalar silinir
- Ünite silinince → Konular silinir
- Konu silinince → Alt konular, ilerleme kayıtları silinir

---

## 📊 8. PERFORMANS OPTİMİZASYONLARI

### 8.1 Database Indexing

**Index'ler:**
- `academic_years`: `[isActive]`, `[startDate, endDate]`
- `subjects`: `[academicYearId]`, `[academicYearId, grade]`, `[academicYearId, grade, section]`, `[name, grade]`
- `units`: `[subjectId]`, `[subjectId, order]`
- `topics`: `[unitId]`, `[unitId, order]`
- `progress`: `[topicId]`, `[status]`, `[markedAt]`

### 8.2 Frontend Optimizasyonları

**useMemo:**
- Filtrelenmiş veriler
- Hesaplanmış istatistikler
- Sıralanmış listeler

**useEffect:**
- Dependency array ile gereksiz re-render'ların önlenmesi
- ESLint disable comments (gerekli durumlarda)

### 8.3 API Optimizasyonları

**Include Stratejisi:**
- Sadece gerekli ilişkili verilerin çekilmesi
- Nested includes ile tek sorguda tüm verilerin alınması

**Örnek:**
```typescript
include: {
  academicYear: { select: { id: true, name: true, isActive: true } },
  assignments: { include: { staff: { select: { id: true, firstName: true, lastName: true } } } },
  units: { include: { topics: { include: { progress: true } } } }
}
```

---

## 🚀 9. GELECEKTEKİ GELİŞTİRMELER

### 9.1 Önerilen Özellikler

1. **Grafik ve Görselleştirme:**
   - İlerleme grafikleri (line chart, bar chart)
   - Aksama analizi pie chart'ları
   - Zaman çizelgesi görünümü

2. **Export Özellikleri:**
   - PDF rapor export
   - Excel export
   - CSV export

3. **Bildirimler:**
   - Gecikmeli konular için email bildirimi
   - Dashboard'da uyarılar

4. **Gelişmiş Filtreleme:**
   - Tarih aralığı filtresi
   - Öğretmen bazlı filtreleme
   - Çoklu durum filtresi

5. **Toplu İşlemler:**
   - Birden fazla konuyu aynı anda tamamlandı olarak işaretleme
   - Toplu öğretmen atama

6. **Versiyonlama:**
   - Plan değişikliklerinin versiyonlanması
   - Değişiklik geçmişi

---

## 📝 10. NOTLAR VE ÖNEMLİ BİLGİLER

### 10.1 Tarih Yönetimi

- Tüm tarihler UTC olarak saklanır
- Frontend'de kullanıcının timezone'una göre gösterilir
- Tarih karşılaştırmalarında saat bilgisi sıfırlanır (00:00:00)

### 10.2 Durum Hesaplama Mantığı

- Progress kaydı varsa ve `TAMAMLANDI` ise → Durum: Tamamlandı
- Progress kaydı yoksa veya `PLANLANDI` ise:
  - Tarih bilgisi varsa → Tarih bazlı hesaplama
  - Tarih bilgisi yoksa → Durum: Planlandı

### 10.3 Sınıf ve Şube Yönetimi

- Sınıf zorunlu (5-12)
- Şube opsiyonel (null olabilir)
- Şube boş string ise null'a çevrilir
- Unique constraint'te null değerler ayrı ayrı değerlendirilir

### 10.4 Öğretmen Atama

- Personel Yönetimi modülünden `department: OGRETMEN` olanlar çekilir
- Bir derse birden fazla öğretmen atanabilir
- Aynı öğretmen aynı derse tekrar atanamaz (unique constraint)

---

## 🎓 11. KULLANIM KILAVUZU

### 11.1 Yeni Akademik Yıl Oluşturma

1. Yönetim → Akademik Yıllar sekmesi
2. "Yeni Akademik Yıl" butonuna tıkla
3. Ad, başlangıç/bitiş tarihlerini gir
4. "Resmi Tatil Ekle" butonu ile tatilleri ekle
5. Kaydet

### 11.2 Ders Oluşturma

1. Yönetim → Dersler sekmesi
2. Akademik yıl seç
3. "Yeni Ders" butonuna tıkla
4. Ders adı, sınıf (zorunlu), şube (opsiyonel) gir
5. Kaydet

### 11.3 Yıllık Plan Girişi

1. Ders Detay sayfasına git
2. Ünite ekle
3. Ünite içine konu ekle
4. Konu için:
   - Zaman aralığı varsa: Tarih/hafta bilgilerini gir
   - Zaman aralığı yoksa: "Belirli bir zaman aralığı olsun" checkbox'ını kaldır

### 11.4 İlerleme Takibi

1. İlerleme Takibi sayfasına git
2. Akademik yıl, sınıf, şube seç (opsiyonel)
3. Ders kartına tıkla
4. Konu veya ünite için "Tamamlandı" butonuna tıkla
5. Zaman aralığı yoksa: Tamamlama tarihi seç

### 11.5 Aksama Kaydı

1. Aksamalar sayfasına git
2. "Yeni Aksama" butonuna tıkla
3. Aksama bilgilerini gir
4. Etkilenen dersleri seç
5. Kaydet

---

## 🔧 12. TEKNİK STACK

- **Frontend:** Next.js 15, React, TypeScript
- **UI Library:** Shadcn UI, Tailwind CSS
- **Icons:** Lucide React
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **State Management:** React Hooks (useState, useEffect, useMemo)
- **Form Handling:** Native HTML forms + controlled components

---

## 📅 13. GELİŞTİRME TARİHÇESİ

- **2024-12-11:** İlk modül oluşturuldu (AcademicYear, Subject, Unit, Topic, vb.)
- **2024-12-11:** Topic hasTimeRange özelliği eklendi
- **2024-12-11:** Personel Yönetimi entegrasyonu
- **2024-12-11:** Dedicated sidebar ve layout
- **2024-12-11:** Dashboard kısayolları
- **2024-12-11:** İlerleme Takibi sayfası yeniden tasarımı
- **2024-12-11:** Otomatik durum hesaplama
- **2024-12-11:** Akademik yıl tatil yönetimi
- **2024-12-11:** Zaman aralığı olmayan konular
- **2024-12-11:** Manuel tamamlama tarihi
- **2024-12-12:** Sınıf ve şube faktörü entegrasyonu

---

## ✅ 14. TEST EDİLMESİ GEREKENLER

- [ ] Akademik yıl oluşturma ve tatil ekleme
- [ ] Ders oluşturma (sınıf/şube ile)
- [ ] Ünite ve konu ekleme
- [ ] Zaman aralığı olmayan konu oluşturma
- [ ] Öğretmen atama
- [ ] İlerleme takibi (otomatik durum hesaplama)
- [ ] Zaman aralığı olmayan konu tamamlama (tarih seçimi)
- [ ] Aksama kaydı
- [ ] Dashboard filtreleme (sınıf/şube)
- [ ] Raporlar (sınıf/şube bazlı)
- [ ] Responsive tasarım (mobile, tablet, desktop)
- [ ] Form validasyonları
- [ ] Error handling

---

## 📞 15. DESTEK VE İLETİŞİM

Herhangi bir sorun veya öneri için geliştirme ekibi ile iletişime geçin.

---

**Son Güncelleme:** 2024-12-12  
**Versiyon:** 1.0.0  
**Durum:** Production Ready ✅

