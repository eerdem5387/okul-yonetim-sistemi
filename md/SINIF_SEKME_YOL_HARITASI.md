# Sınıf ve Şube Faktörü Entegrasyon Yol Haritası

## 📋 Genel Bakış
Neredeyiz modülüne sınıf (5-12) ve şube (A, B, C, vb.) faktörlerini ekleyerek derslerin sınıf bazlı yönetilmesini sağlamak.

---

## 🗄️ 1. VERİTABANI DEĞİŞİKLİKLERİ

### 1.1 Prisma Schema Güncellemeleri

**Subject Model Değişiklikleri:**
```prisma
model Subject {
  id            String   @id @default(cuid())
  academicYearId String
  name          String   // Örn: "Biyoloji"
  code          String?  // Ders kodu
  grade         Int      // Sınıf: 5, 6, 7, 8, 9, 10, 11, 12
  section       String?  // Şube: "A", "B", "C", vb. (opsiyonel)
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  academicYear AcademicYear      @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  units        Unit[]
  assignments  SubjectAssignment[]

  @@unique([academicYearId, name, grade, section]) // Aynı akademik yılda aynı ders-sınıf-şube kombinasyonu tekrar edemez
  @@index([academicYearId])
  @@index([academicYearId, grade])
  @@index([academicYearId, grade, section])
  @@index([name, grade])
  @@map("subjects")
}
```

**Disruption Model Değişiklikleri (Opsiyonel - Sınıf Bazlı Aksamalar İçin):**
```prisma
model Disruption {
  // ... mevcut alanlar
  affectedGrades Int[]?     // Etkilenen sınıflar [5, 6, 7, ...]
  affectedSections String[]? // Etkilenen şubeler ["A", "B", ...]
  // affectedSubjects yerine veya yanında kullanılabilir
}
```

### 1.2 Migration Stratejisi

**Adım 1: Yeni Migration Oluştur**
```bash
npx prisma migrate dev --name add_grade_section_to_subjects
```

**Adım 2: Mevcut Veriler İçin Strateji**
- Mevcut dersler için varsayılan sınıf değeri belirlenmeli (ör: 9. sınıf)
- Şube alanı nullable olduğu için null olarak kalabilir
- Migration script'inde mevcut verileri güncelleme mantığı eklenmeli

**Adım 3: Unique Constraint**
- `@@unique([academicYearId, name, grade, section])` ile aynı kombinasyonun tekrarını engelle

---

## 🔌 2. API DEĞİŞİKLİKLERİ

### 2.1 Subject API (`/api/neredeyiz/subjects`)

**GET Endpoint Güncellemeleri:**
- `grade` parametresi ekle (filtreleme için)
- `section` parametresi ekle (filtreleme için)
- `academicYearId` + `grade` + `section` kombinasyonu ile filtreleme

**POST Endpoint Güncellemeleri:**
- `grade` alanı zorunlu (5-12 arası validation)
- `section` alanı opsiyonel (string validation)
- Unique constraint kontrolü

**PUT Endpoint Güncellemeleri:**
- `grade` ve `section` güncelleme desteği
- Unique constraint kontrolü

### 2.2 Progress API (`/api/neredeyiz/progress`)

**GET Endpoint Güncellemeleri:**
- `grade` parametresi ekle
- `section` parametresi ekle
- Subject üzerinden grade/section filtreleme

### 2.3 Reports API (`/api/neredeyiz/reports/progress`)

**Güncellemeler:**
- `grade` parametresi ekle
- `section` parametresi ekle
- Sınıf ve şube bazlı istatistikler

### 2.4 Disruptions API (`/api/neredeyiz/disruptions`)

**Güncellemeler (Opsiyonel):**
- `affectedGrades` ve `affectedSections` parametreleri
- Sınıf/şube bazlı aksama kayıtları

---

## 🎨 3. FRONTEND DEĞİŞİKLİKLERİ

### 3.1 Yönetim Sayfası (`/neredeyiz/yonetim`)

**Ders Oluşturma Formu:**
- Sınıf seçimi dropdown (5, 6, 7, 8, 9, 10, 11, 12)
- Şube seçimi input (opsiyonel, text field veya dropdown)
- Form validasyonu (sınıf zorunlu, 5-12 arası)

**Ders Listesi:**
- Sınıf ve şube bilgisi gösterimi
- Sınıf bazlı filtreleme
- Şube bazlı filtreleme
- Ders adı formatı: "Biyoloji - 11. Sınıf - A Şubesi"

**Interface Güncellemeleri:**
```typescript
interface Subject {
  id: string
  name: string
  code: string | null
  academicYearId: string
  grade: number        // YENİ
  section: string | null // YENİ
  // ... diğer alanlar
}
```

### 3.2 İlerleme Takibi Sayfası (`/neredeyiz/ilerleme`)

**Filtreleme Bölümü:**
- Akademik Yıl seçimi (mevcut)
- Sınıf seçimi dropdown (YENİ)
- Şube seçimi dropdown (YENİ, opsiyonel)
- Ders seçimi (sınıf ve şubeye göre filtrelenmiş)

**Ders Kutucukları:**
- Her kutucukta sınıf ve şube bilgisi
- Format: "Biyoloji - 11. Sınıf - A Şubesi"
- Sınıf bazlı gruplandırma (opsiyonel)

**Dashboard İstatistikleri:**
- Sınıf bazlı ilerleme yüzdeleri
- Şube bazlı karşılaştırmalar (opsiyonel)

### 3.3 Dashboard Sayfası (`/neredeyiz`)

**Genel İstatistikler:**
- Sınıf bazlı kartlar (5. Sınıf, 6. Sınıf, vb.)
- Her sınıf için:
  - Toplam ders sayısı
  - Tamamlanan konu sayısı
  - İlerleme yüzdesi
  - Gecikmeli konu sayısı

**Sınıf Seçimi:**
- Sınıf dropdown'ı ekle
- Seçilen sınıfa göre istatistikleri güncelle

**Kısayol Butonları:**
- Sınıf seçimi ile birlikte çalışacak şekilde güncelle

### 3.4 Aksamalar Sayfası (`/neredeyiz/aksamalar`)

**Aksama Oluşturma Formu:**
- Etkilenen sınıflar seçimi (multi-select checkbox)
- Etkilenen şubeler seçimi (multi-select checkbox, opsiyonel)
- Sınıf/şube bazlı aksama kayıtları

**Aksama Listesi:**
- Sınıf ve şube bilgisi gösterimi
- Sınıf bazlı filtreleme

### 3.5 Raporlar Sayfası (`/neredeyiz/raporlar`)

**Rapor Filtreleri:**
- Sınıf seçimi
- Şube seçimi (opsiyonel)
- Sınıf bazlı ilerleme raporları
- Şube bazlı karşılaştırma raporları

**Rapor İçeriği:**
- Sınıf bazlı istatistikler
- Şube bazlı karşılaştırmalar
- Sınıf-şube kombinasyonu bazlı detaylı raporlar

### 3.6 Ders Detay Sayfası (`/neredeyiz/dersler/[id]`)

**Header:**
- Ders adı, sınıf ve şube bilgisi
- Format: "Biyoloji - 11. Sınıf - A Şubesi"

---

## 📊 4. VERİ MİGRASYONU

### 4.1 Mevcut Veriler İçin Strateji

**Seçenek 1: Varsayılan Sınıf Atama**
- Tüm mevcut derslere varsayılan olarak 9. sınıf atanır
- Şube null olarak kalır
- Kullanıcılar sonradan düzenleyebilir

**Seçenek 2: Manuel Atama**
- Migration sırasında kullanıcıdan sınıf bilgisi istenir
- Her ders için sınıf seçimi yapılır

**Önerilen: Seçenek 1**
- Migration script'inde otomatik atama
- Sonrasında kullanıcılar düzenleyebilir

### 4.2 Migration Script Örneği

```sql
-- Mevcut derslere varsayılan sınıf atama
UPDATE subjects 
SET grade = 9, section = NULL 
WHERE grade IS NULL;
```

---

## ✅ 5. VALİDASYON KURALLARI

### 5.1 Sınıf Validasyonu
- Zorunlu alan
- 5, 6, 7, 8, 9, 10, 11, 12 değerlerinden biri olmalı
- Integer tipinde

### 5.2 Şube Validasyonu
- Opsiyonel alan
- String tipinde
- Boş string kabul edilmemeli (null olmalı)
- Örnek değerler: "A", "B", "C", "1", "2", vb.

### 5.3 Unique Constraint
- Aynı akademik yılda aynı ders adı + sınıf + şube kombinasyonu tekrar edemez
- Örnek: "2025-2026" yılında "Biyoloji - 11. Sınıf - A Şubesi" sadece bir kez olabilir

---

## 🎯 6. KULLANICI DENEYİMİ İYİLEŞTİRMELERİ

### 6.1 Ders Listesi Görünümü
- Sınıf bazlı gruplandırma (accordion)
- Her sınıf altında şubeler
- Görsel hiyerarşi: Sınıf → Şube → Ders

### 6.2 Filtreleme Deneyimi
- Çoklu seçim (multi-select) dropdown'lar
- "Tüm Sınıflar" seçeneği
- "Tüm Şubeler" seçeneği
- Filtre kombinasyonları (Akademik Yıl + Sınıf + Şube)

### 6.3 Dashboard Deneyimi
- Sınıf bazlı kartlar
- Her kartta o sınıfa ait özet bilgiler
- Kartlara tıklanınca o sınıfın detaylarına git

---

## 🔄 7. GERİYE DÖNÜK UYUMLULUK

### 7.1 API Uyumluluğu
- Mevcut API çağrıları çalışmaya devam etmeli
- `grade` ve `section` parametreleri opsiyonel olabilir (varsayılan filtreleme)
- Eski API çağrıları tüm sınıfları döndürebilir

### 7.2 Veri Uyumluluği
- Mevcut veriler migration ile güncellenmeli
- Eksik veriler için varsayılan değerler

---

## 📝 8. UYGULAMA SIRASI

### Faz 1: Veritabanı ve API (Kritik)
1. ✅ Prisma schema güncellemesi
2. ✅ Migration oluşturma ve uygulama
3. ✅ Subject API güncellemeleri
4. ✅ Progress API güncellemeleri
5. ✅ Reports API güncellemeleri

### Faz 2: Yönetim Sayfası (Yüksek Öncelik)
6. ✅ Ders oluşturma formu güncellemesi
7. ✅ Ders listesi güncellemesi
8. ✅ Sınıf/şube filtreleme

### Faz 3: İlerleme Takibi (Yüksek Öncelik)
9. ✅ İlerleme takibi sayfası filtreleme
10. ✅ Ders kutucukları güncellemesi
11. ✅ Sınıf bazlı görünüm

### Faz 4: Dashboard (Orta Öncelik)
12. ✅ Dashboard sınıf seçimi
13. ✅ Sınıf bazlı istatistikler
14. ✅ Sınıf bazlı kartlar

### Faz 5: Aksamalar ve Raporlar (Orta Öncelik)
15. ✅ Aksamalar sayfası güncellemesi
16. ✅ Raporlar sayfası güncellemesi
17. ✅ Sınıf/şube bazlı raporlar

### Faz 6: Test ve İyileştirme (Düşük Öncelik)
18. ✅ Tüm sayfaların test edilmesi
19. ✅ Responsive tasarım kontrolü
20. ✅ Performans optimizasyonu

---

## ⚠️ 9. DİKKAT EDİLMESİ GEREKENLER

### 9.1 Veri Bütünlüğü
- Mevcut dersler için sınıf bilgisi mutlaka atanmalı
- Unique constraint ihlalleri önlenmeli
- Cascade delete'ler kontrol edilmeli

### 9.2 Performans
- Sınıf/şube bazlı filtreleme için index'ler
- Büyük veri setlerinde pagination
- Cache stratejisi (opsiyonel)

### 9.3 Kullanıcı Deneyimi
- Sınıf seçimi kolay ve anlaşılır olmalı
- Şube seçimi opsiyonel olduğu için net gösterilmeli
- Filtreleme sonuçları hızlı görünmeli

---

## 📈 10. BAŞARI KRİTERLERİ

- ✅ Tüm dersler sınıf ve şube bilgisine sahip
- ✅ Ders oluştururken sınıf seçimi zorunlu
- ✅ İlerleme takibi sınıf bazlı çalışıyor
- ✅ Dashboard sınıf bazlı istatistikler gösteriyor
- ✅ Raporlar sınıf/şube bazlı üretiliyor
- ✅ Tüm sayfalar responsive çalışıyor
- ✅ Mevcut veriler migration ile güncellenmiş

---

## 🚀 TAHMİNİ SÜRE

- **Faz 1 (Veritabanı & API):** 2-3 saat
- **Faz 2 (Yönetim):** 1-2 saat
- **Faz 3 (İlerleme Takibi):** 2-3 saat
- **Faz 4 (Dashboard):** 1-2 saat
- **Faz 5 (Aksamalar & Raporlar):** 1-2 saat
- **Faz 6 (Test & İyileştirme):** 1-2 saat

**Toplam:** 8-14 saat

---

## ❓ SORULAR VE CEVAPLAR

**S: Şube bilgisi zorunlu mu?**
C: Hayır, opsiyonel. Şube olmayan dersler için null değer kullanılacak.

**S: Aynı ders farklı şubelerde farklı öğretmenlere atanabilir mi?**
C: Evet, SubjectAssignment modeli zaten var. Her şube için ayrı öğretmen atanabilir.

**S: Aksamalar sınıf bazlı mı olacak?**
C: Opsiyonel. Genel aksamalar (tüm sınıflar) veya sınıf bazlı aksamalar kaydedilebilir.

**S: Raporlarda sınıf karşılaştırması yapılacak mı?**
C: Evet, sınıf bazlı karşılaştırma raporları eklenecek.

---

Bu yol haritası onaylandıktan sonra adım adım uygulanacaktır.

