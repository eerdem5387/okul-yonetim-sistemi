# FAZ 4 - GÖRÜŞ GİRİŞİ MODÜLÜ DOKÜMANTASYONU

## 📋 Genel Bakış

Bu modül, öğretmen ve rehberlik ekibinin öğrenciler hakkında akademik, davranışsal ve genel görüşlerini sisteme girmesini ve bu görüşlerin veli tarafından görüntülenmesini sağlar. Öğrenci gelişiminin takibi ve veli-okul iletişiminin güçlendirilmesi için kritik öneme sahiptir.

---

## 🗄️ Veritabanı Yapısı

### 1. **StudentComment (Öğrenci Görüşü) Modeli**

```prisma
model StudentComment {
  id          String      @id @default(cuid())
  studentId   String      // Görüş yazılan öğrenci
  student     Student     @relation
  staffId     String      // Görüş yazan personel (Öğretmen/Rehberlik)
  staff       Staff       @relation("StaffComments")
  commentType CommentType // ACADEMIC, BEHAVIORAL, GENERAL
  category    String?     // Ders adı veya alan (opsiyonel)
  content     String      @db.Text // Görüş içeriği
  isPositive  Boolean     @default(true) // Olumlu/Gelişmeli
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([studentId])
  @@index([staffId])
  @@index([commentType])
  @@index([createdAt])
}
```

**Özellikler:**
- **studentId**: Hangi öğrenci hakkında
- **staffId**: Kim yazdı (Öğretmen veya Rehberlik)
- **commentType**: 3 tip desteklenir (ACADEMIC, BEHAVIORAL, GENERAL)
- **category**: Esneklik için opsiyonel (örn: "Matematik", "Sosyal Gelişim")
- **content**: Görüş metni (Text field - sınırsız)
- **isPositive**: Olumlu/Gelişmeli işaretleme

### 2. **CommentType Enum**

```prisma
enum CommentType {
  ACADEMIC    // Akademik (Ders başarısı, not durumu)
  BEHAVIORAL  // Davranışsal (Sınıf içi davranış, sosyal ilişkiler)
  GENERAL     // Genel (Diğer gözlemler)
}
```

### 3. **İlişkiler**

- **Student ↔ StudentComment**: Bir öğrencinin birden fazla görüşü olabilir
- **Staff ↔ StudentComment**: Bir personel birden fazla görüş yazabilir

---

## 🔌 API Endpoints

### StudentComment API'ları

#### 1. **GET /api/student-comments**
Öğrenci görüşlerini listeler

**Query Parameters:**
- `studentId`: Belirli öğrencinin görüşleri
- `staffId`: Belirli personelin yazdığı görüşler
- `commentType`: Görüş tipi (ACADEMIC, BEHAVIORAL, GENERAL)
- `isPositive`: Olumlu/Gelişmeli filtre

**Response:**
```json
{
  "comments": [
    {
      "id": "...",
      "commentType": "ACADEMIC",
      "category": "Matematik",
      "content": "Öğrencimiz matematik dersinde çok başarılı. Problem çözme becerisi gelişmiş.",
      "isPositive": true,
      "createdAt": "2025-01-25T10:00:00.000Z",
      "student": {
        "id": "...",
        "firstName": "Ali",
        "lastName": "Demir",
        "grade": "9"
      },
      "staff": {
        "id": "...",
        "firstName": "Ayşe",
        "lastName": "Yılmaz",
        "department": "TEACHER",
        "subject": "Matematik"
      }
    }
  ]
}
```

#### 2. **POST /api/student-comments**
Yeni görüş oluşturur

**Request Body:**
```json
{
  "studentId": "...",
  "staffId": "...",
  "commentType": "ACADEMIC",
  "category": "Matematik",
  "content": "Öğrencimiz matematik dersinde çok başarılı...",
  "isPositive": true
}
```

**Response:**
```json
{
  "success": true,
  "comment": {
    "id": "...",
    "commentType": "ACADEMIC",
    "category": "Matematik",
    "content": "...",
    "isPositive": true,
    "createdAt": "2025-01-25T10:00:00.000Z",
    "student": { ... },
    "staff": { ... }
  }
}
```

#### 3. **GET /api/student-comments/[id]**
Belirli bir görüşü getirir

**Response:**
```json
{
  "comment": {
    "id": "...",
    "commentType": "BEHAVIORAL",
    "category": "Sınıf İçi Davranış",
    "content": "Öğrencimiz arkadaşlarıyla iyi iletişim kuruyor.",
    "isPositive": true,
    "createdAt": "2025-01-25T10:00:00.000Z",
    "student": { ... },
    "staff": { ... }
  }
}
```

#### 4. **PUT /api/student-comments/[id]**
Görüşü günceller

**Request Body:**
```json
{
  "commentType": "BEHAVIORAL",
  "category": "Sosyal Gelişim",
  "content": "Güncellenmiş görüş...",
  "isPositive": true
}
```

#### 5. **DELETE /api/student-comments/[id]**
Görüşü siler

**Response:**
```json
{
  "success": true,
  "message": "Görüş başarıyla silindi"
}
```

---

## 🖥️ Frontend Sayfaları

### 1. **Öğretmen - Görüş Yönetimi** (`/ogretmen/gorusler`)

**Dosya:** `/src/app/ogretmen/gorusler/page.tsx`

**Özellikler:**
- ✅ Yeni görüş ekleme formu
- ✅ Öğrenci seçimi (dropdown)
- ✅ Görüş tipi seçimi (Akademik, Davranışsal, Genel)
- ✅ Kategori girişi (ders adı veya alan)
- ✅ Olumlu/Gelişmeli seçimi
- ✅ Görüş listesi (sadece kendi görüşleri)
- ✅ Görüş düzenleme
- ✅ Görüş silme
- ✅ Tarih göstergesi

**UI Tasarımı:**
- **Renk Teması:** Mavi (Öğretmen)
- **Görüş Kartları:** Sol kenarda renkli çizgi (Yeşil: Olumlu, Turuncu: Gelişmeli)
- **İkonlar:** 👍 Olumlu, 👎 Gelişmeli
- **Etiketler:** 📚 Akademik, 🤝 Davranışsal, 💬 Genel

---

### 2. **Rehberlik - Görüş Yönetimi** (`/rehberlik/gorusler`)

**Dosya:** `/src/app/rehberlik/gorusler/page.tsx`

**Özellikler:**
- ✅ Tüm özellikler öğretmen sayfası ile aynı
- ✅ Rehberlik ekibine özel renk teması (Mor)
- ✅ Akademik, Davranışsal ve Genel görüşler
- ✅ Kategori alanı (örn: "Sosyal Gelişim", "Kariyer")

**UI Tasarımı:**
- **Renk Teması:** Mor (Rehberlik)
- **Butonlar:** Mor gradient
- **Diğer tasarım öğeleri öğretmen sayfası ile aynı

---

### 3. **Veli - Görüş Görüntüleme** (`/veli/gorusler`)

**Dosya:** `/src/app/veli/gorusler/page.tsx`

**Özellikler:**
- ✅ Öğrenci hakkındaki tüm görüşleri görüntüleme (READ-ONLY)
- ✅ Görüşleri yazan öğretmen/rehberlik bilgisi
- ✅ Görüş tarihi
- ✅ Görüş tipi ve kategori göstergesi
- ✅ Olumlu/Gelişmeli göstergesi
- ✅ Bilgilendirme notu (rehberlik ile iletişim)
- ❌ Görüş ekleme/düzenleme/silme YOK

**Gösterilen Bilgiler:**
- Görüş içeriği (büyük font, okunabilir)
- Yazan kişi: Ad Soyad, Departman, Branş
- Tarih: Uzun format (örn: "25 Ocak 2025")
- Görüş tipi etiketleri
- Kategori (varsa)
- Olumlu/Gelişmeli ikonu

**UI Tasarımı:**
- **Renk Teması:** Yeşil (Veli)
- **Görüş Kartları:** Büyük, okunabilir
- **Bilgilendirme Kartı:** Mavi arka plan (alt kısımda)
- **İkonlar:** 👍/👎, 👤 (kişi), 📅 (tarih)

---

## 🎨 UI/UX Tasarım Prensipleri

### Öğretmen & Rehberlik Arayüzü
- **Hızlı Görüş Ekleme:** Minimal form, açık placeholder'lar
- **Öğrenci Arama:** Dropdown ile hızlı seçim
- **Görüş Listesi:** Kart görünümü, hover efekti
- **Düzenleme/Silme:** İkon butonlar (✏️ / 🗑️)
- **Renk Kodlaması:** 
  - Yeşil kenarlık: Olumlu görüşler
  - Turuncu kenarlık: Gelişmeli görüşler

### Veli Arayüzü
- **Okuma Odaklı:** Büyük fontlar, rahat okuma
- **Bilgilendirici:** Kim, ne zaman, hangi alanda
- **Şeffaf İletişim:** Alt kısımda not ile rehberlik iletişim teşviki
- **Pozitif Vurgu:** Olumlu görüşler öne çıkar

---

## 🔄 İş Akışları

### Görüş Ekleme Akışı (Öğretmen/Rehberlik)

```
1. Öğretmen/Rehberlik → "Yeni Görüş" butonuna tıklar
2. Form açılır → Öğrenci seçilir
3. Görüş tipi seçilir (Akademik/Davranışsal/Genel)
4. Kategori girilir (opsiyonel)
5. Görüş metni yazılır
6. Olumlu/Gelişmeli işaretlenir
7. "Kaydet" butonuna tıklanır
8. Sistem → Görüşü kaydeder
9. Sayfa → Görüş listesinde görünür
10. Veli → Veli panelinde görüşü görür
```

### Görüş Görüntüleme Akışı (Veli)

```
1. Veli → Veli paneline giriş yapar
2. Veli → "Görüşler" sekmesine tıklar
3. Sistem → Öğrencinin tüm görüşlerini getirir
4. Veli → Görüşleri okur
5. Veli → Kim yazdığını, tarihini görür
6. Veli → Bilgilendirme notunu okur
7. (Opsiyonel) Veli → Rehberlik ile iletişime geçer
```

---

## 🔐 Yetkilendirme

### Öğretmen Yetkileri
- ✅ Kendi öğrencileri hakkında görüş yazma
- ✅ Kendi yazdığı görüşleri görüntüleme
- ✅ Kendi yazdığı görüşleri düzenleme
- ✅ Kendi yazdığı görüşleri silme
- ❌ Diğer öğretmenlerin görüşlerini görüntüleme

### Rehberlik Yetkileri
- ✅ Tüm öğrenciler hakkında görüş yazma
- ✅ Kendi yazdığı görüşleri görüntüleme
- ✅ Kendi yazdığı görüşleri düzenleme
- ✅ Kendi yazdığı görüşleri silme
- ❌ Diğer personelin görüşlerini silme/düzenleme

### Veli Yetkileri
- ✅ Kendi öğrencisinin tüm görüşlerini görüntüleme
- ❌ Görüş yazma
- ❌ Görüş düzenleme
- ❌ Görüş silme

### Admin/Müdür Yetkileri (Şu anda yok, gelecekte eklenebilir)
- 🔄 Tüm görüşleri görüntüleme (rapor amaçlı)
- 🔄 İstatistikler ve analizler

---

## 📊 Örnek Kullanım Senaryoları

### Senaryo 1: Akademik Başarı Görüşü

**Öğretmen:**
- Öğrenci: Ali Demir (9/A)
- Tip: Akademik
- Kategori: Matematik
- İçerik: "Ali matematik dersinde öne çıkan bir öğrencidir. Problem çözme becerisi yaşıtlarına göre ileri seviyededir. Özellikle geometri konusunda yetenekli."
- Durum: Olumlu 👍

**Veli Görünümü:**
```
📚 Akademik | Matematik

Ali matematik dersinde öne çıkan bir öğrencidir. Problem çözme becerisi
yaşıtlarına göre ileri seviyededir. Özellikle geometri konusunda yetenekli.

👤 Ayşe Yılmaz • Öğretmen • Matematik • 📅 25 Ocak 2025
```

---

### Senaryo 2: Davranışsal Gelişim Görüşü

**Rehberlik:**
- Öğrenci: Zeynep Kaya (10/B)
- Tip: Davranışsal
- Kategori: Sosyal Gelişim
- İçerik: "Zeynep sosyal becerileri gelişiyor. Grup çalışmalarında daha aktif katılım sağlaması teşvik edilmeli."
- Durum: Gelişmeli 👎

**Veli Görünümü:**
```
🤝 Davranışsal | Sosyal Gelişim

Zeynep sosyal becerileri gelişiyor. Grup çalışmalarında daha aktif katılım
sağlaması teşvik edilmeli.

👤 Mehmet Özkan • Rehberlik • 📅 20 Ocak 2025
```

---

### Senaryo 3: Genel Görüş

**Öğretmen:**
- Öğrenci: Can Yıldız (11/C)
- Tip: Genel
- Kategori: -
- İçerik: "Can derslere düzenli katılıyor ve sorumluluklarını yerine getiriyor. Genel performansı tatmin edici."
- Durum: Olumlu 👍

---

## 📈 Gelecek Geliştirmeler (FAZ 5)

### Öğrenci Dashboard Entegrasyonu
- Görüşlerin öğrenci dashboard'ında gösterilmesi
- Görüş istatistikleri (Olumlu/Gelişmeli oranı)
- Zamana göre görüş grafiği
- En çok görüş alan kategoriler

### İleri Özellikler
- **Görüş Şablonları:** Hızlı görüş yazma için hazır şablonlar
- **Bildirimler:** Yeni görüş eklendiğinde veliye e-posta/SMS
- **Etiketler:** Anahtar kelime bazlı etiketleme
- **Arama/Filtreleme:** Tarih, tip, kategori bazlı filtreleme
- **Excel Export:** Tüm görüşleri Excel'e aktarma
- **Analitik:** En çok olumlu/gelişmeli görüş alan alanlar

### Admin Paneli
- Tüm görüşleri görüntüleme
- Öğretmen/Rehberlik görüş istatistikleri
- Sınıf bazlı görüş analizi
- Trend analizi (zaman içinde gelişim)

---

## 🎯 Özet

✅ **Tamamlanan:**
- [x] 1 Yeni Model (StudentComment)
- [x] 1 Yeni Enum (CommentType)
- [x] Migration dosyası
- [x] 5 API Endpoint (CRUD)
- [x] 3 Frontend Sayfası (Öğretmen, Rehberlik, Veli)
- [x] Sidebar Güncellemeleri

📋 **Bekleyen (Gelecek Fazlar):**
- [ ] FAZ 5: Öğrenci Dashboard + İleri Özellikler
- [ ] Görüş şablonları
- [ ] Bildirim sistemi entegrasyonu
- [ ] Analitik ve raporlama
- [ ] Admin paneli

---

**Son Güncelleme:** 25 Ocak 2025  
**Versiyon:** 1.0.0  
**Durum:** ✅ Tamamlandı (FAZ 4 - Görüş Girişi Modülü)

---

## 📝 Teknik Notlar

### Performance
- **Index'ler:** studentId, staffId, commentType, createdAt
- **Text Field:** PostgreSQL Text type (sınırsız içerik)
- **Eager Loading:** İlişkili veriler tek sorguda

### Güvenlik
- **Input Validation:** Tüm API endpoint'lerinde
- **Auth Kontrolü:** Rol bazlı erişim
- **Cascade Delete:** Öğrenci/Staff silindiğinde görüşler de silinir

### Veri Bütünlüğü
- **staffId:** Kim tarafından yazıldığı takip edilir
- **updatedAt:** Son güncelleme zamanı
- **createdAt:** Oluşturulma tarihi (kronolojik sıralama için)

### Best Practices
- **Kısa ve Öz:** Görüşler spesifik ve eyleme dönük olmalı
- **Yapıcı Dil:** Gelişmeli görüşler de yapıcı şekilde ifade edilmeli
- **Kategori Kullanımı:** Alan belirtmek takibi kolaylaştırır
- **Düzenli Güncelleme:** Dönemsel görüş girişi teşvik edilmeli

