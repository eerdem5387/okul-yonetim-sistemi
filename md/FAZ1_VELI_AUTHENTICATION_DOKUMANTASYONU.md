# FAZ 1 - VELİ GİRİŞ SİSTEMİ DOKÜMANTASYONU

## 📋 Genel Bakış

Bu modül, velilerin öğrencilerinin bilgilerine erişebilmesi için **Öğrenci TC Kimlik No** tabanlı bir authentication (kimlik doğrulama) sistemidir. Her öğrenci için bir veli hesabı oluşturulur ve hem anne hem baba aynı hesapla (öğrencinin TC'si ile) giriş yapar.

---

## 🗄️ Veritabanı Yapısı

### 1. **Parent (Veli Hesabı) Modeli**

```prisma
model Parent {
  id                 String   @id @default(cuid())
  studentTcNumber    String   @unique // Öğrencinin TC'si (giriş için)
  
  // Authentication
  password           String?
  isFirstLogin       Boolean  @default(true)
  mustChangePassword Boolean  @default(false)
  lastLoginAt        DateTime?
  isActive           Boolean  @default(true)
  
  // İlişkiler
  students           ParentStudent[] // Bu hesaba bağlı veliler
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Özellikler:**
- **studentTcNumber**: Öğrencinin TC Kimlik No (Unique - Giriş için kullanılır)
- **password**: Hashed password (bcrypt ile) - İlk giriş sonrası set edilir
- **isFirstLogin**: İlk giriş kontrolü (Default: true)
- **isActive**: Hesap aktif mi? (Default: true)

**Önemli:** Her öğrenci için bir Parent hesabı oluşturulur. Anne ve baba aynı hesapla giriş yapar.

### 2. **ParentStudent (Veli Bilgileri) Modeli**

```prisma
model ParentStudent {
  id        String         @id @default(cuid())
  parentId  String // Parent hesabı (öğrenci TC bazlı)
  studentId String // Öğrenci ID
  relation  ParentRelation // ANNE, BABA, VASI
  
  // Veli bilgileri
  parentName       String  // Velinin adı soyadı
  parentTcNumber   String  // Velinin kendi TC'si
  parentPhone      String? // Velinin telefonu
  parentEmail      String? // Velinin e-postası
  
  parent  Parent  @relation(fields: [parentId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([parentId, studentId, relation])
}
```

**Özellikler:**
- **relation**: ANNE, BABA, VASI (Enum)
- **parentName, parentTcNumber, parentPhone**: Velinin kendi bilgileri
- **Unique Constraint**: Bir hesapta her veli tipi (anne/baba/vasi) bir kez olabilir

### 3. **ParentRelation Enum**

```prisma
enum ParentRelation {
  ANNE
  BABA
  VASI
}
```

---

## 🔌 API Endpoints

### 1. **POST /api/auth/parent-login**

Veli girişi (Öğrenci TC Kimlik No + Şifre)

**Request Body:**
```json
{
  "studentTcNumber": "98765432101",
  "password": "********"
}
```

**İlk Giriş Senaryosu:**
- `password` null ise, öğrenci TC No ile giriş yapılır
- Veli ilk girişte **öğrencinin TC Kimlik No'sunu** şifre olarak kullanır

**Response (Success):**
```json
{
  "success": true,
  "token": "parent_{parentId}_{timestamp}",
  "parent": {
    "id": "...",
    "studentTcNumber": "98765432101",
    "isFirstLogin": true,
    "mustChangePassword": false,
    "parents": [
      {
        "name": "Ahmet Yılmaz",
        "tcNumber": "12345678901",
        "phone": "05551234567",
        "email": "ahmet@example.com",
        "relation": "BABA"
      },
      {
        "name": "Ayşe Yılmaz",
        "tcNumber": "98765432102",
        "phone": "05559876543",
        "email": "ayse@example.com",
        "relation": "ANNE"
      }
    ],
    "student": {
      "id": "...",
      "firstName": "Ali",
      "lastName": "Yılmaz",
      "grade": "9",
      "tcNumber": "98765432101"
    }
  }
}
```

**Hata Kodları:**
- `400`: Öğrenci TC Kimlik No veya şifre eksik
- `404`: Öğrenci kaydı bulunamadı
- `403`: Hesap aktif değil
- `401`: Öğrenci TC Kimlik No veya şifre hatalı

---

### 2. **GET /api/auth/parent/me**

Veli bilgilerini döndürür (Detaylı)

**Headers:**
```
Authorization: Bearer parent_{parentId}_{timestamp}
```

**Response:**
```json
{
  "parent": {
    "id": "...",
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "tcNumber": "12345678901",
    "email": "ahmet@example.com",
    "phone": "05551234567",
    "isFirstLogin": false,
    "mustChangePassword": false,
    "students": [
      {
        "id": "...",
        "firstName": "Ali",
        "lastName": "Yılmaz",
        "grade": "9",
        "tcNumber": "98765432101",
        "birthDate": "2005-01-15T00:00:00.000Z",
        "phone": "05559876543",
        "email": "ali@example.com",
        "relation": "BABA"
      }
    ]
  }
}
```

**Token Kontrolü:**
- Token yaşı 24 saat ile sınırlıdır
- Token süresi dolmuşsa 401 hatası döner

---

### 3. **POST /api/auth/parent-change-password**

Veli şifre değiştirme

**Request Body:**
```json
{
  "parentId": "...",
  "oldPassword": "********", // İlk giriş hariç
  "newPassword": "********",
  "isFirstLogin": false
}
```

**Validasyon:**
- `newPassword`: Minimum 6 karakter
- İlk giriş değilse `oldPassword` gereklidir

**Response (Success):**
```json
{
  "success": true,
  "message": "Şifreniz başarıyla değiştirildi"
}
```

**Hata Kodları:**
- `400`: Eksik veya geçersiz parametreler
- `401`: Eski şifre hatalı
- `404`: Veli bulunamadı

---

### 4. **GET /api/parents/my-students**

Velinin öğrencilerini döndürür (Detaylı sınıf ve rehberlik bilgileriyle)

**Query Parameters:**
```
?parentId={parentId}
```

**Response:**
```json
{
  "students": [
    {
      "id": "...",
      "firstName": "Ali",
      "lastName": "Yılmaz",
      "tcNumber": "98765432101",
      "birthDate": "2005-01-15T00:00:00.000Z",
      "grade": "9",
      "phone": "05559876543",
      "email": "ali@example.com",
      "address": "İstanbul",
      "relation": "BABA",
      "class": {
        "id": "...",
        "name": "9/A",
        "grade": "9",
        "section": "A",
        "counselor": {
          "id": "...",
          "firstName": "Zeynep",
          "lastName": "Kaya",
          "phone": "05551112233",
          "email": "zeynep@school.com"
        }
      }
    }
  ]
}
```

---

## 🖥️ Frontend Yapısı

### 1. **Veli Giriş Sayfası** (`/veli-login`)

**Dosya:** `/src/app/veli-login/page.tsx`

**Özellikler:**
- TC Kimlik No + Şifre ile giriş
- İlk girişte şifre TC No olarak ayarlanır
- Responsive tasarım (Mobil uyumlu)
- Personel girişine geri dönüş linki
- Yeşil tema (Veli için özel)

**Kullanılan Componentler:**
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Button`, `Input`, `Label`
- `LogIn`, `Users`, `ArrowLeft` (Lucide Icons)

**LocalStorage Kayıtları:**
```javascript
localStorage.setItem("auth_role", "parent")
localStorage.setItem("auth_token", data.token)
localStorage.setItem("parent_id", data.parent.id)
localStorage.setItem("student_tc", data.parent.studentTcNumber)
localStorage.setItem("student_name", `${data.parent.student.firstName} ${data.parent.student.lastName}`)
localStorage.setItem("parent_name", data.parent.parents[0].name) // İlk velinin adı
```

---

### 2. **Veli Ana Panel** (`/veli/panel`)

**Dosya:** `/src/app/veli/panel/page.tsx`

**Özellikler:**
- Velinin tüm öğrencileri listelenir
- Öğrenci kartları (İsim, Sınıf, Rehberlik Danışmanı)
- Hızlı erişim kartları:
  - Ödevler
  - Yoklama
  - Sınavlar
  - Görüşler
- Auth kontrolü (Giriş yapmamış veliler redirect edilir)

**Öğrenci Kartı Bilgileri:**
- İsim Soyisim
- Sınıf (9/A vb.)
- İlişki (ANNE, BABA, VASI)
- Rehberlik Danışmanı bilgileri
- "Detaylı Bilgiler" butonu (→ `/veli/ogrenci/{studentId}`)

---

### 3. **Veli Sidebar** (`/components/layout/veli-sidebar.tsx`)

**Dosya:** `/src/components/layout/veli-sidebar.tsx`

**Özellikler:**
- Kollapsible (Daraltılabilir)
- Yeşil tema (Veli için özel)
- Navigation:
  - Ana Sayfa (`/veli/panel`)
  - Öğrencilerim (`/veli/ogrenciler`)
  - Ödevler (`/veli/odevler`) - **FAZ 2**
  - Yoklama (`/veli/yoklama`) - **FAZ 2**
  - Sınavlar (`/veli/sinavlar`) - **FAZ 3**
  - Görüşler (`/veli/gorusler`) - **FAZ 4**
- Footer:
  - Veli bilgileri (İsim, Avatar)
  - Çıkış butonu

---

### 4. **Şifre Değiştirme Sayfası** (`/change-password`)

**Dosya:** `/src/app/change-password/page.tsx`

**Güncellemeler:**
- Veli desteği eklendi
- `?parent=true` query parametresi ile veli girişi algılanır
- Veli için yeşil tema (Personel için mavi)
- İlk girişte şifre oluşturma
- Şifre gücü göstergesi (Zayıf, Orta, Güçlü)

---

## 🛠️ Script: Veli Kayıtları Oluşturma

**Dosya:** `/scripts/create-parents.ts`

**Kullanım:**
```bash
npx ts-node scripts/create-parents.ts
```

**İşlevsellik:**
1. Tüm öğrencileri getirir (`Student` modeli)
2. Her öğrenci için:
   - Parent hesabı oluşturur (`studentTcNumber` = öğrenci TC)
   - Anne bilgilerini ParentStudent'a ekler (`motherTc`, `motherName`)
   - Baba bilgilerini ParentStudent'a ekler (`fatherTc`, `fatherName`)
3. İlerleme gösterisi (Her 10 öğrencide bir)
4. İstatistikler:
   - Oluşturulan hesap sayısı
   - Anne kayıtları sayısı
   - Baba kayıtları sayısı
   - Hata sayısı

**Not:**
- İlk giriş için şifre **öğrencinin TC Kimlik No** olarak ayarlanır (`password` null)
- `upsert` kullanılarak duplicate kayıtlar önlenir
- Her öğrenci için tek bir Parent hesabı oluşturulur

---

## 🔐 Authentication Flow

### İlk Giriş Akışı

1. Veli `/veli-login` sayfasına gider
2. **Öğrencinin TC Kimlik No**'sunu ve şifre (öğrenci TC No) girer
3. API `/api/auth/parent-login` çağrılır
4. `isFirstLogin: true` dönerse → `/change-password?parent=true`
5. Veli yeni şifre oluşturur
6. Şifre başarıyla değiştirilir → `/veli-login`
7. Yeni şifreyle giriş yapılır → `/veli/panel`

### Sonraki Girişler

1. Veli `/veli-login` sayfasına gider
2. **Öğrencinin TC Kimlik No**'sunu ve şifre (yeni şifre) girer
3. API `/api/auth/parent-login` çağrılır
4. `isFirstLogin: false` dönerse → `/veli/panel`

### Önemli Notlar

- **Anne ve Baba Aynı Şifreyi Kullanır:** Aynı öğrenci için oluşturulan hesap hem anne hem baba tarafından kullanılır
- **Giriş: Öğrenci TC:** Veliler kendi TC'lerini değil, öğrencinin TC'sini kullanır
- **İlk Şifre: Öğrenci TC:** İlk girişte şifre öğrencinin TC Kimlik numarasıdır

### Token Yönetimi

- Token format: `parent_{parentId}_{timestamp}`
- Token yaşı: 24 saat
- LocalStorage'da saklanır: `auth_token`

---

## 📱 Mobil Uyumluluk

Tüm veli sayfaları responsive tasarıma sahiptir:
- Küçük ekranlar (sm): 640px+
- Orta ekranlar (md): 768px+
- Büyük ekranlar (lg): 1024px+

**Tailwind Breakpoints:**
```
p-3 sm:p-4 md:p-6
text-xl sm:text-2xl
h-11 sm:h-12
```

---

## 🎨 Tema ve Tasarım

### Veli Teması (Yeşil)

- **Gradient:** `from-green-600 via-emerald-600 to-teal-600`
- **Primary Button:** `bg-green-600 hover:bg-green-700`
- **Sidebar:** Yeşil gradient arka plan

### Personel Teması (Mavi)

- **Gradient:** `from-blue-600 to-indigo-600`
- **Primary Button:** `bg-blue-600 hover:bg-blue-700`
- **Sidebar:** Mavi gradient arka plan

---

## 🔄 Migration

**Dosya:** `/prisma/migrations/20250125000000_add_parent_authentication_system/migration.sql`

**SQL İşlemleri:**
1. `ParentRelation` Enum oluşturulur
2. `parents` tablosu oluşturulur
3. `parent_students` pivot tablosu oluşturulur
4. Foreign key'ler eklenir
5. Index'ler oluşturulur:
   - `parents.tcNumber` (Unique)
   - `parents.isActive`
   - `parent_students.parentId`
   - `parent_students.studentId`

---

## 🚀 Sonraki Adımlar (FAZ 2+)

### FAZ 2 - Ödevlendirme & Yoklama
- `/veli/odevler` - Öğrenci ödevlerini görüntüleme
- `/veli/yoklama` - Devam durumu görüntüleme

### FAZ 3 - Sınav Analizi
- `/veli/sinavlar` - Deneme sınavı sonuçları

### FAZ 4 - Görüş Girişi
- `/veli/gorusler` - Öğretmen/Rehberlik görüşleri

### FAZ 5 - Öğrenci Dashboard
- `/veli/ogrenci/{studentId}` - Tek bir öğrenciye ait tüm bilgiler (Ödev, Yoklama, Sınav, Görüş)

---

## 📝 Notlar

1. **Güvenlik:**
   - Tüm şifreler bcrypt ile hash'lenir (10 rounds)
   - Token 24 saat sonra expire olur
   - TC Kimlik No unique constraint ile korunur

2. **Validasyon:**
   - TC No: 11 haneli sayısal değer
   - Şifre: Minimum 6 karakter

3. **Hata Yönetimi:**
   - API hataları console'da loglanır
   - Kullanıcıya anlaşılır hata mesajları gösterilir

4. **Performance:**
   - Database index'ler optimize edilmiştir
   - Token kontrolü client-side yapılır (24 saat)

---

## 🎯 Özet

✅ **Tamamlanan:**
- [x] Prisma Schema (Parent, ParentStudent, ParentRelation)
- [x] Migration oluşturma
- [x] API Endpoints (Login, Me, Change Password, My Students)
- [x] Frontend (Veli Login, Veli Panel, Veli Sidebar)
- [x] Script (create-parents.ts)
- [x] Change Password sayfası veli desteği

📋 **Bekleyen:**
- [ ] FAZ 2: Ödevlendirme & Yoklama modülleri
- [ ] FAZ 3: Sınav Analizi modülü
- [ ] FAZ 4: Görüş Girişi modülü
- [ ] FAZ 5: Öğrenci Dashboard

---

## 🔄 Değişiklik Geçmişi

### v1.1.0 (25 Ocak 2025)
- ✅ **Önemli Değişiklik:** Veli girişi artık **öğrencinin TC Kimlik No** ile yapılıyor
- ✅ Parent modeli güncellendi: `tcNumber` → `studentTcNumber`
- ✅ ParentStudent modeline veli bilgileri eklendi (parentName, parentTcNumber, parentPhone, parentEmail)
- ✅ Her öğrenci için tek bir Parent hesabı oluşturuluyor
- ✅ Anne ve baba aynı hesapla (öğrenci TC) giriş yapıyor

### v1.0.0 (25 Ocak 2025)
- ✅ İlk versiyon: Veli girişi kendi TC'si ile (Değiştirildi)

---

**Son Güncelleme:** 25 Ocak 2025  
**Versiyon:** 1.1.0  
**Durum:** ✅ Tamamlandı (FAZ 1 - Öğrenci TC Bazlı Giriş)

