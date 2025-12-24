# Teklif Görüşmeleri Modülü Dokümantasyonu

## Genel Bakış

"Teklif Görüşmeleri" modülü, okul yönetim sistemine eklenen yeni bir modüldür. Bu modül, öğrenci kayıt süreçlerinde yapılan teklif görüşmelerini kaydetmek, takip etmek ve yönetmek için tasarlanmıştır. Modül, görüşme geçmişini timeline formatında görüntüleme, filtreleme, arama ve Excel export gibi özellikler sunar.

## Özellikler

### 1. Temel Özellikler
- ✅ Yeni teklif görüşmesi oluşturma
- ✅ Teklif görüşmelerini listeleme
- ✅ Teklif görüşmesi detaylarını görüntüleme
- ✅ Teklif görüşmesi düzenleme (yeni görüşme kaydı ekler)
- ✅ Teklif görüşmesi silme
- ✅ Görüşme geçmişi/timeline görüntüleme
- ✅ Arama ve filtreleme
- ✅ Excel export

### 2. Form Alanları

#### Öğrenci Bilgileri
- **Ad Soyad** (zorunlu)
- **Okul** (zorunlu)
- **Sınıf** (zorunlu) - Dropdown: 4. Sınıf, 5. Sınıf, ..., 12. Sınıf

#### Veli Bilgileri (Tek Bölüm)
- **Veli Ad Soyad** (zorunlu)
- **Telefon** (zorunlu)
- **Email** (opsiyonel)
- **Meslek** (opsiyonel)
- **Adres** (opsiyonel)

#### Teklif Bilgileri
- **Teklif Edilen Fiyat** (sayısal, zorunlu)
- **Okul Fiyatı** (sayısal, zorunlu)

#### Görüşme Bilgileri
- **Görüşme Tarihi** (otomatik - oluşturulduğu tarih)
- **Görüşmeyi Yapan** (text, zorunlu)
- **Görüşme Durumu** (dropdown, zorunlu):
  - Olumlu
  - Olumsuz
  - Belirsiz
- **Durum Notu** (opsiyonel - seçilen duruma özel not)
- **Genel Not/Açıklama** (opsiyonel)

### 3. Görüşme Geçmişi (Timeline)

Her teklif görüşmesi için tüm görüşmelerin geçmişi kronolojik sırada görüntülenir:
- İlk görüşme kaydı
- Sonraki görüşmeler/düzenlemeler
- Her kayıt için:
  - Görüşme tarihi
  - Görüşmeyi yapan kişi
  - Durum (Olumlu/Olumsuz/Belirsiz)
  - Durum notu
  - Genel not

### 4. Arama ve Filtreleme

#### Arama
- Öğrenci adı
- Okul adı
- Veli adı
- Veli telefonu

#### Filtreleme
- **Sınıf**: Dropdown ile sınıf seçimi
- **Okul**: Dropdown ile okul seçimi (benzersiz okullar listelenir)
- **Durum**: Olumlu, Olumsuz, Belirsiz
- **Tarih Aralığı**: Başlangıç ve bitiş tarihi

### 5. Excel Export

Tüm teklif görüşmeleri Excel formatında export edilebilir:
- Filtrelenmiş veriler de export edilebilir
- Kolonlar:
  - Sıra No
  - Öğrenci Ad Soyad
  - Okul
  - Sınıf
  - Veli Bilgileri (Ad Soyad, Telefon, Email, Meslek, Adres)
  - Teklif Edilen Fiyat
  - Okul Fiyatı
  - Son Görüşme Tarihi
  - Son Görüşmeyi Yapan
  - Son Durum
  - Son Durum Notu
  - Son Genel Not
  - Toplam Görüşme Sayısı
  - Oluşturulma Tarihi

## Veritabanı Yapısı

### Prisma Schema

```prisma
enum TeklifGorusmeDurumu {
  OLUMLU
  OLUMSUZ
  BELIRSIZ
}

model TeklifGorusmesi {
  id                String   @id @default(cuid())
  // Öğrenci Bilgileri
  ogrenciAdSoyad    String
  okul              String
  sinif             String
  // Veli Bilgileri
  veliAdSoyad       String
  veliTelefon       String
  veliEmail         String?
  veliMeslek        String?
  veliAdres         String?
  // Teklif Bilgileri
  teklifEdilenFiyat Float
  okulFiyati        Float
  // Sistem Bilgileri
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String?

  // Relations
  kayitlar TeklifGorusmeKaydi[]

  @@index([ogrenciAdSoyad])
  @@index([okul])
  @@index([sinif])
  @@index([createdAt])
  @@map("teklif_gorusmeleri")
}

model TeklifGorusmeKaydi {
  id                String              @id @default(cuid())
  teklifGorusmesiId String
  // Görüşme Bilgileri
  gorusmeTarihi     DateTime            @default(now())
  gorusmeyiYapan    String
  durum             TeklifGorusmeDurumu
  durumNotu         String?
  genelNot          String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relations
  teklifGorusmesi TeklifGorusmesi @relation(fields: [teklifGorusmesiId], references: [id], onDelete: Cascade)

  @@index([teklifGorusmesiId])
  @@index([gorusmeTarihi])
  @@index([durum])
  @@map("teklif_gorusme_kayitlari")
}
```

### İlişkiler

- `TeklifGorusmesi` (1) -> `TeklifGorusmeKaydi` (N): Bir teklif görüşmesi birden fazla görüşme kaydına sahip olabilir
- Cascade Delete: Teklif görüşmesi silindiğinde, tüm görüşme kayıtları da otomatik olarak silinir

## API Endpoints

### 1. GET /api/teklif-gorusmeleri

Teklif görüşmelerini listeler.

**Query Parameters:**
- `page` (number, default: 1): Sayfa numarası
- `limit` (number, default: 20): Sayfa başına kayıt sayısı
- `search` (string): Arama terimi (öğrenci adı, okul, veli adı, telefon)
- `sinif` (string): Sınıf filtresi
- `okul` (string): Okul filtresi
- `durum` (string): Durum filtresi (OLUMLU, OLUMSUZ, BELIRSIZ)
- `startDate` (string): Başlangıç tarihi (ISO format)
- `endDate` (string): Bitiş tarihi (ISO format)

**Response:**
```json
{
  "teklifGorusmeleri": [
    {
      "id": "string",
      "ogrenciAdSoyad": "string",
      "okul": "string",
      "sinif": "string",
      "veliAdSoyad": "string",
      "veliTelefon": "string",
      "veliEmail": "string | null",
      "veliMeslek": "string | null",
      "veliAdres": "string | null",
      "teklifEdilenFiyat": 0,
      "okulFiyati": 0,
      "createdAt": "string",
      "createdBy": "string | null",
      "kayitlar": [
        {
          "id": "string",
          "gorusmeTarihi": "string",
          "gorusmeyiYapan": "string",
          "durum": "OLUMLU | OLUMSUZ | BELIRSIZ",
          "durumNotu": "string | null",
          "genelNot": "string | null"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### 2. POST /api/teklif-gorusmeleri

Yeni teklif görüşmesi oluşturur.

**Request Body:**
```json
{
  "ogrenciAdSoyad": "string",
  "okul": "string",
  "sinif": "string",
  "veliAdSoyad": "string",
  "veliTelefon": "string",
  "veliEmail": "string | null",
  "veliMeslek": "string | null",
  "veliAdres": "string | null",
  "teklifEdilenFiyat": 0,
  "okulFiyati": 0,
  "gorusmeyiYapan": "string",
  "durum": "OLUMLU | OLUMSUZ | BELIRSIZ",
  "durumNotu": "string | null",
  "genelNot": "string | null",
  "createdBy": "string | null"
}
```

**Response:**
```json
{
  "success": true,
  "teklifGorusmesi": {
    // Teklif görüşmesi objesi (kayıtlarıyla birlikte)
  }
}
```

### 3. GET /api/teklif-gorusmeleri/[id]

Belirli bir teklif görüşmesinin detaylarını getirir.

**Response:**
```json
{
  "teklifGorusmesi": {
    // Teklif görüşmesi objesi (tüm kayıtlarıyla birlikte, kronolojik sırada)
  }
}
```

### 4. PUT /api/teklif-gorusmeleri/[id]

Teklif görüşmesini günceller. Eğer yeni görüşme bilgileri (gorusmeyiYapan, durum, vb.) sağlanırsa, yeni bir görüşme kaydı oluşturulur.

**Request Body:**
```json
{
  "ogrenciAdSoyad": "string",
  "okul": "string",
  "sinif": "string",
  "veliAdSoyad": "string",
  "veliTelefon": "string",
  "veliEmail": "string | null",
  "veliMeslek": "string | null",
  "veliAdres": "string | null",
  "teklifEdilenFiyat": 0,
  "okulFiyati": 0,
  // Yeni görüşme kaydı için (opsiyonel)
  "gorusmeyiYapan": "string",
  "durum": "OLUMLU | OLUMSUZ | BELIRSIZ",
  "durumNotu": "string | null",
  "genelNot": "string | null"
}
```

**Response:**
```json
{
  "success": true,
  "teklifGorusmesi": {
    // Güncellenmiş teklif görüşmesi objesi
  }
}
```

### 5. DELETE /api/teklif-gorusmeleri/[id]

Teklif görüşmesini siler (tüm görüşme kayıtları cascade olarak silinir).

**Response:**
```json
{
  "success": true,
  "message": "Teklif görüşmesi başarıyla silindi"
}
```

### 6. GET /api/teklif-gorusmeleri/export

Teklif görüşmelerini Excel formatında export eder.

**Query Parameters:** (GET /api/teklif-gorusmeleri ile aynı filtreleme parametreleri)

**Response:** Excel dosyası (binary)

## Frontend Yapısı

### Dosya Yapısı

```
src/
├── app/
│   ├── teklif-gorusmeleri/
│   │   └── page.tsx          # Ana liste sayfası
│   └── api/
│       └── teklif-gorusmeleri/
│           ├── route.ts      # GET, POST
│           ├── [id]/
│           │   └── route.ts  # GET, PUT, DELETE
│           └── export/
│               └── route.ts  # Excel export
└── components/
    └── layout/
        └── sidebar.tsx        # Sidebar menüsü (güncellendi)
```

### Ana Sayfa Özellikleri

1. **Header**
   - Başlık ve açıklama
   - "Yeni Teklif Oluştur" butonu
   - "Excel İndir" butonu

2. **Arama ve Filtreleme Bölümü**
   - Arama input'u
   - Genişletilebilir filtre paneli
   - Aktif filtre sayısı göstergesi
   - "Filtreleri Temizle" butonu

3. **Liste Görünümü**
   - Kart bazlı görünüm
   - Her kart için:
     - Öğrenci bilgileri
     - Veli bilgileri
     - Teklif bilgileri
     - Son görüşme durumu (badge)
     - Son görüşme tarihi ve görüşmeyi yapan
     - Toplam görüşme sayısı
     - İşlem butonları (Görüntüle, Düzenle, Sil)

4. **Pagination**
   - Sayfa numarası gösterimi
   - Önceki/Sonraki butonları

5. **Modals**
   - **Detay Modal**: Teklif görüşmesi detayları ve timeline görünümü
   - **Form Modal**: Yeni oluşturma veya düzenleme formu

### Timeline Görünümü

Detay modalında görüşme geçmişi timeline formatında gösterilir:
- Her görüşme kaydı için:
  - Sol tarafta mavi çizgi ve nokta
  - Tarih ve saat
  - Durum badge'i (renkli)
  - Görüşmeyi yapan kişi
  - Durum notu (varsa)
  - Genel not (varsa)
- Kronolojik sıralama (en yeni üstte)

## Kullanım Senaryoları

### Senaryo 1: Yeni Teklif Görüşmesi Oluşturma

1. Sidebar'dan "Teklif Görüşmeleri" menüsüne tıklayın
2. "Yeni Teklif Oluştur" butonuna tıklayın
3. Formu doldurun:
   - Öğrenci bilgileri (Ad Soyad, Okul, Sınıf)
   - Veli bilgileri (Ad Soyad, Telefon, Email, Meslek, Adres)
   - Teklif bilgileri (Teklif Edilen Fiyat, Okul Fiyatı)
   - Görüşme bilgileri (Görüşmeyi Yapan, Durum, Durum Notu, Genel Not)
4. "Oluştur" butonuna tıklayın

### Senaryo 2: Teklif Görüşmesi Düzenleme (Yeni Görüşme Kaydı Ekleme)

1. Liste görünümünde düzenlemek istediğiniz teklif görüşmesinin "Düzenle" butonuna tıklayın
2. Form açılır (mevcut bilgiler dolu gelir)
3. Temel bilgileri güncelleyebilirsiniz (opsiyonel)
4. **Yeni görüşme kaydı** için:
   - Görüşmeyi Yapan
   - Durum
   - Durum Notu
   - Genel Not
5. "Güncelle" butonuna tıklayın
6. Yeni görüşme kaydı timeline'a eklenir

### Senaryo 3: Görüşme Geçmişini Görüntüleme

1. Liste görünümünde "Görüntüle" (göz ikonu) butonuna tıklayın
2. Detay modal açılır
3. "Görüşme Geçmişi" bölümünde tüm görüşmeler timeline formatında görüntülenir
4. Her görüşme kaydı için:
   - Tarih ve saat
   - Durum
   - Görüşmeyi yapan
   - Notlar

### Senaryo 4: Filtreleme ve Arama

1. Arama kutusuna öğrenci adı, okul, veli adı veya telefon yazın
2. Filtre panelini açmak için "Filtre" butonuna tıklayın
3. İstediğiniz filtreleri seçin:
   - Sınıf
   - Okul
   - Durum
   - Tarih aralığı
4. Sonuçlar otomatik olarak güncellenir
5. Aktif filtre sayısı badge'de gösterilir

### Senaryo 5: Excel Export

1. İsterseniz filtreleme yapın
2. "Excel İndir" butonuna tıklayın
3. Excel dosyası indirilir
4. Dosya adı: `teklif_gorusmeleri_YYYY-MM-DD.xlsx`

## Teknik Detaylar

### State Management

- React hooks (`useState`, `useEffect`, `useMemo`)
- Local state yönetimi
- Toast notifications için `useToast` hook'u

### Toast Notifications

- Başarılı işlemler: Yeşil toast
- Hata durumları: Kırmızı toast
- Bilgilendirme: Mavi toast

### Form Validation

- Client-side validation
- Zorunlu alan kontrolü
- Durum enum kontrolü

### Error Handling

- Try-catch blokları
- Console error logging
- User-friendly error messages

### Responsive Design

- Tailwind CSS
- Mobile-first yaklaşım
- Grid layout (1 kolon mobile, 2-3 kolon desktop)

## Migration

### Migration Dosyası

Migration dosyası: `prisma/migrations/20250103120000_add_teklif_gorusmeleri_module/migration.sql`

### Migration Çalıştırma

**Development:**
```bash
npx prisma migrate dev
```

**Production:**
```bash
npx prisma migrate deploy
```

### Migration İçeriği

1. `TeklifGorusmeDurumu` enum oluşturulur
2. `teklif_gorusmeleri` tablosu oluşturulur
3. `teklif_gorusme_kayitlari` tablosu oluşturulur
4. Index'ler oluşturulur
5. Foreign key constraint eklenir

## Güvenlik

- Tüm API endpoint'leri server-side'da çalışır
- Input validation (hem client hem server)
- SQL injection koruması (Prisma ORM)
- XSS koruması (React'in built-in escaping)

## Performans

- Pagination (sayfa başına 20 kayıt)
- Database index'leri (arama ve filtreleme için)
- Lazy loading (modal'lar)
- Memoization (benzersiz okullar listesi)

## Gelecek Geliştirmeler (Öneriler)

1. **Bildirim Sistemi**: Yeni görüşme kaydı eklendiğinde bildirim
2. **Raporlama**: Görüşme istatistikleri ve grafikler
3. **Takvim Görünümü**: Görüşmeleri takvim formatında görüntüleme
4. **Email Entegrasyonu**: Veli bilgilerine otomatik email gönderme
5. **PDF Export**: Teklif görüşmesi detaylarını PDF olarak export etme
6. **Toplu İşlemler**: Birden fazla teklif görüşmesini toplu olarak işleme
7. **Görüşme Şablonları**: Sık kullanılan görüşme notları için şablonlar

## Sorun Giderme

### Migration Hatası

Eğer migration çalıştırılırken hata alırsanız:
1. Veritabanı bağlantısını kontrol edin
2. Migration dosyasının doğru dizinde olduğundan emin olun
3. Önceki migration'ların tamamlandığından emin olun

### Prisma Client Hatası

Eğer Prisma client hatası alırsanız:
```bash
npx prisma generate
```

### Build Hatası

Eğer build hatası alırsanız:
1. TypeScript hatalarını kontrol edin
2. ESLint uyarılarını kontrol edin
3. Import path'lerini kontrol edin

## İletişim ve Destek

Modül ile ilgili sorularınız veya önerileriniz için lütfen geliştirme ekibi ile iletişime geçin.

---

**Son Güncelleme:** 2025-01-03  
**Versiyon:** 1.0.0  
**Durum:** Production Ready ✅

