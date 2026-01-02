# MODÜL TEST LİSTESİ
## Ödevlendirme, Yoklama, Sınav Analizi ve Öğrenci Görüşü Modülleri

**Test Tarihi:** _______________  
**Test Edilen:** _______________  
**Test Ortamı:** Production / Development

---

## 📚 1. ÖDEVLENDİRME MODÜLÜ TEST LİSTESİ

### 1.1 Öğretmen Perspektifi (`/ogretmen/odevler`)

#### ✅ Ödev Oluşturma
- [ ] **Sınıf Bazlı Ödev Verme**
  - [ ] Öğretmen olarak giriş yap
  - [ ] "Ödevlerim" sayfasına git
  - [ ] "Yeni Ödev" butonuna tıkla
  - [ ] Sınıf seçimi yap (sadece öğretmene atanmış sınıflar görünmeli)
  - [ ] Ödev başlığı gir (örn: "Matematik Problemleri")
  - [ ] Ödev açıklaması gir
  - [ ] Teslim tarihi seç
  - [ ] Ders adı gir (opsiyonel)
  - [ ] Ödevi kaydet
  - [ ] Tüm sınıf öğrencilerine otomatik atandığını doğrula

- [ ] **Bireysel Ödev Verme**
  - [ ] "Yeni Ödev" formunda "Belirli Öğrenciler" seçeneğini seç
  - [ ] Öğrenci arama yap (sadece öğretmene atanmış sınıflardan)
  - [ ] Birden fazla öğrenci seç
  - [ ] Ödev bilgilerini gir ve kaydet
  - [ ] Sadece seçilen öğrencilere atandığını doğrula

- [ ] **Form Validasyonu**
  - [ ] Boş başlık ile kaydetmeyi dene → Hata mesajı görünmeli
  - [ ] Boş açıklama ile kaydetmeyi dene → Hata mesajı görünmeli
  - [ ] Geçmiş tarih seçmeyi dene → Uyarı/Onay görünmeli
  - [ ] Sınıf veya öğrenci seçmeden kaydetmeyi dene → Hata mesajı görünmeli

#### ✅ Ödev Listeleme ve Görüntüleme
- [ ] **Ödev Listesi**
  - [ ] Öğretmenin verdiği tüm ödevler listeleniyor mu?
  - [ ] Sınıf bazlı filtreleme çalışıyor mu?
  - [ ] Tarih bazlı sıralama doğru mu? (en yeni üstte)
  - [ ] Her ödevde öğrenci sayısı ve tamamlanma durumu görünüyor mu?

- [ ] **Ödev Detayları**
  - [ ] Bir ödeve tıkla
  - [ ] Ödev bilgileri (başlık, açıklama, tarih, ders) görünüyor mu?
  - [ ] Öğrenci listesi ve tamamlanma durumları görünüyor mu?
  - [ ] Tamamlanan/Tamamlanmayan öğrenci sayıları doğru mu?

#### ✅ Ödev Tamamlama İşaretleme
- [ ] **Tekil Öğrenci Tamamlama**
  - [ ] Bir ödev detayına git
  - [ ] Bir öğrencinin ödevini "Tamamlandı" olarak işaretle
  - [ ] Not ekle (opsiyonel)
  - [ ] Kaydet
  - [ ] Öğrencinin durumu "Tamamlandı" olarak güncellendi mi?
  - [ ] Tamamlanma tarihi kaydedildi mi?

- [ ] **Toplu Tamamlama**
  - [ ] Birden fazla öğrencinin ödevini seç
  - [ ] Toplu olarak "Tamamlandı" işaretle
  - [ ] Tüm seçilen öğrencilerin durumu güncellendi mi?

#### ✅ Ödev Düzenleme ve Silme
- [ ] **Ödev Düzenleme**
  - [ ] Bir ödevi düzenle
  - [ ] Başlık, açıklama, tarih değiştir
  - [ ] Kaydet
  - [ ] Değişiklikler kaydedildi mi?

- [ ] **Ödev Silme**
  - [ ] Bir ödevi sil
  - [ ] Onay mesajı göründü mü?
  - [ ] Ödev ve tüm atamalar silindi mi?

#### ✅ Filtreleme ve Arama
- [ ] **Sınıf Filtresi**
  - [ ] Sadece öğretmene atanmış sınıflar listeleniyor mu?
  - [ ] Filtreleme çalışıyor mu?

- [ ] **Tarih Filtresi**
  - [ ] Geçmiş ödevler filtreleniyor mu?
  - [ ] Gelecek ödevler filtreleniyor mu?

### 1.2 Veli Perspektifi (`/veli/odevler`)

#### ✅ Ödev Görüntüleme
- [ ] **Ödev Listesi**
  - [ ] Veli olarak giriş yap (öğrenci TC ile)
  - [ ] "Ödevler" sayfasına git
  - [ ] Çocuğunun ödevleri listeleniyor mu?
  - [ ] Ödev başlığı, açıklama, teslim tarihi görünüyor mu?
  - [ ] Tamamlanma durumu (Tamamlandı/Bekliyor) görünüyor mu?

- [ ] **Ödev Detayları**
  - [ ] Bir ödeve tıkla
  - [ ] Tüm ödev bilgileri görünüyor mu?
  - [ ] Öğretmen notu varsa görünüyor mu?

#### ✅ Filtreleme
- [ ] **Durum Filtresi**
  - [ ] "Tamamlanan" filtresi çalışıyor mu?
  - [ ] "Bekleyen" filtresi çalışıyor mu?

- [ ] **Tarih Filtresi**
  - [ ] Tarih bazlı filtreleme çalışıyor mu?

### 1.3 Öğrenci Dashboard Entegrasyonu

#### ✅ Öğretmen Dashboard (`/ogretmen/ogrenci-dashboard`)
- [ ] **Ödev İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Ödev tamamlama oranı doğru hesaplanıyor mu?
  - [ ] Toplam ödev sayısı doğru mu?
  - [ ] Tamamlanan/Bekleyen ödev sayıları doğru mu?

- [ ] **Son Ödevler Listesi**
  - [ ] Son 10 ödev listeleniyor mu?
  - [ ] Ödev durumları (Tamamlandı/Bekliyor) doğru görünüyor mu?
  - [ ] Teslim tarihleri doğru mu?

#### ✅ Rehberlik/Admin Dashboard (`/ogrenci-dashboard`, `/rehberlik/ogrenci-dashboard`)
- [ ] **Ödev İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Ödev tamamlama oranı görünüyor mu?
  - [ ] İstatistikler doğru hesaplanıyor mu?

- [ ] **Son Ödevler**
  - [ ] Ödev listesi görünüyor mu?
  - [ ] Durumlar doğru mu?

---

## 📅 2. YOKLAMA MODÜLÜ TEST LİSTESİ

### 2.1 Öğretmen Perspektifi (`/ogretmen/yoklama`)

#### ✅ Yoklama Alma
- [ ] **Sınıf ve Ders Seçimi**
  - [ ] Öğretmen olarak giriş yap
  - [ ] "Yoklama" sayfasına git
  - [ ] Sınıf seçimi yap (sadece öğretmene atanmış sınıflar görünmeli)
  - [ ] Ders programı seçimi yap
  - [ ] Tarih seç
  - [ ] Ders adı otomatik dolduruldu mu?

- [ ] **Toplu Yoklama Alma**
  - [ ] Sınıftaki tüm öğrenciler listelendi mi?
  - [ ] Her öğrenci için durum seçimi yap:
    - [ ] PRESENT (Geldi) seç
    - [ ] ABSENT (Gelmedi) seç
    - [ ] LATE (Geç Kaldı) seç
    - [ ] EXCUSED (İzinli) seç
  - [ ] Not ekle (opsiyonel)
  - [ ] Yoklamayı kaydet
  - [ ] Başarı mesajı göründü mü?
  - [ ] Tüm öğrenciler için yoklama kaydedildi mi?

- [ ] **Yoklama Durumları**
  - [ ] PRESENT → Yeşil renk görünüyor mu?
  - [ ] ABSENT → Kırmızı renk görünüyor mu?
  - [ ] LATE → Turuncu renk görünüyor mu?
  - [ ] EXCUSED → Mavi renk görünüyor mu?

#### ✅ Yoklama Listeleme
- [ ] **Yoklama Geçmişi**
  - [ ] Alınan yoklamalar listeleniyor mu?
  - [ ] Tarih, sınıf, ders bilgileri görünüyor mu?
  - [ ] Öğrenci bazlı yoklama durumları görünüyor mu?

- [ ] **Filtreleme**
  - [ ] Sınıf bazlı filtreleme çalışıyor mu?
  - [ ] Tarih bazlı filtreleme çalışıyor mu?
  - [ ] Durum bazlı filtreleme çalışıyor mu?

#### ✅ Yoklama Düzenleme
- [ ] **Yoklama Güncelleme**
  - [ ] Bir yoklama kaydını düzenle
  - [ ] Öğrenci durumunu değiştir
  - [ ] Kaydet
  - [ ] Değişiklik kaydedildi mi?

### 2.2 Veli Perspektifi (`/veli/yoklama`)

#### ✅ Yoklama Görüntüleme
- [ ] **Yoklama Listesi**
  - [ ] Veli olarak giriş yap
  - [ ] "Yoklama" sayfasına git
  - [ ] Çocuğunun yoklama kayıtları listeleniyor mu?
  - [ ] Tarih, ders, durum bilgileri görünüyor mu?
  - [ ] Renk kodlaması doğru mu?

- [ ] **Yoklama İstatistikleri**
  - [ ] Devam oranı hesaplanıyor mu?
  - [ ] Toplam ders sayısı doğru mu?
  - [ ] Geldi/Gelmedi/Geç Kaldı/İzinli sayıları doğru mu?

#### ✅ Filtreleme
- [ ] **Tarih Filtresi**
  - [ ] Tarih aralığı seç
  - [ ] Filtreleme çalışıyor mu?

- [ ] **Durum Filtresi**
  - [ ] Durum bazlı filtreleme çalışıyor mu?

### 2.3 Öğrenci Dashboard Entegrasyonu

#### ✅ Öğretmen Dashboard (`/ogretmen/ogrenci-dashboard`)
- [ ] **Yoklama İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Devam oranı doğru hesaplanıyor mu?
  - [ ] Toplam yoklama sayısı doğru mu?
  - [ ] Durum bazlı sayılar (Geldi/Gelmedi/Geç/İzinli) doğru mu?

- [ ] **Son Yoklamalar**
  - [ ] Son 20 yoklama listeleniyor mu?
  - [ ] Tarih, ders, durum bilgileri görünüyor mu?
  - [ ] Renk kodlaması doğru mu?

#### ✅ Rehberlik/Admin Dashboard
- [ ] **Yoklama İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Devam oranı görünüyor mu?
  - [ ] İstatistikler doğru mu?

---

## 📊 3. SINAV ANALİZİ MODÜLÜ TEST LİSTESİ

### 3.1 Rehberlik Perspektifi (`/rehberlik/sinavlar`)

#### ✅ Sınav Oluşturma
- [ ] **Sınav Tanımlama**
  - [ ] Rehberlik olarak giriş yap
  - [ ] "Sınav Yönetimi" sayfasına git
  - [ ] "Yeni Sınav" butonuna tıkla
  - [ ] Sınav adı gir (örn: "2024-2025 1. Dönem Deneme Sınavı")
  - [ ] Sınav tipi seç (YKS, LGS, KPSS, DENEME, DIGER)
  - [ ] Sınav tarihi seç
  - [ ] Sınav kapsamı seç:
    - [ ] **Tüm Okul** seçeneği
      - [ ] Sınıf ve şube seçimi yapılmamalı
      - [ ] Tüm okul öğrencileri için sınav oluşturulmalı
    - [ ] **Sınıf Seviyesi** seçeneği
      - [ ] Sınıf seviyesi seç (5-12)
      - [ ] Tüm o seviyedeki sınıflar için sınav oluşturulmalı
    - [ ] **Belirli Sınıf** seçeneği
      - [ ] Sınıf seç (örn: 9/A)
      - [ ] Sadece o sınıf için sınav oluşturulmalı
  - [ ] Açıklama gir (opsiyonel)
  - [ ] Sınavı kaydet
  - [ ] Başarı mesajı göründü mü?

#### ✅ Sınav Sonuç Girişi
- [ ] **Toplu Sonuç Girişi**
  - [ ] Bir sınav seç
  - [ ] "Sonuç Girişi" butonuna tıkla
  - [ ] Öğrenci listesi görünüyor mu? (sınav kapsamına göre)
  - [ ] Her öğrenci için:
    - [ ] JSON formatında scores gir (ders bazlı sonuçlar)
    - [ ] Toplam puan gir
    - [ ] Sıralama gir (opsiyonel)
    - [ ] Yüzdelik dilim gir (opsiyonel)
    - [ ] Not ekle (opsiyonel)
  - [ ] Toplu sonuç girişi yap
  - [ ] Tüm öğrenciler için sonuçlar kaydedildi mi?

- [ ] **Sonuç Güncelleme**
  - [ ] Mevcut bir sonucu düzenle
  - [ ] Puanları güncelle
  - [ ] Kaydet
  - [ ] Güncelleme başarılı mı?

#### ✅ Sınav Listeleme ve Görüntüleme
- [ ] **Sınav Listesi**
  - [ ] Tüm sınavlar listeleniyor mu?
  - [ ] Sınav tipi, tarih, kapsam bilgileri görünüyor mu?
  - [ ] Sonuç girişi yapılan sınavlarda öğrenci sayısı görünüyor mu?

- [ ] **Sınav Detayları**
  - [ ] Bir sınav seç
  - [ ] Sınav bilgileri görünüyor mu?
  - [ ] Sonuç girişi yapılan öğrenciler listeleniyor mu?
  - [ ] Puanlar, sıralamalar görünüyor mu?

#### ✅ Sınav Düzenleme ve Silme
- [ ] **Sınav Düzenleme**
  - [ ] Bir sınavı düzenle
  - [ ] Ad, tarih, kapsam değiştir
  - [ ] Kaydet
  - [ ] Değişiklikler kaydedildi mi?

- [ ] **Sınav Silme**
  - [ ] Bir sınavı sil
  - [ ] Onay mesajı göründü mü?
  - [ ] Sınav ve tüm sonuçlar silindi mi?

#### ✅ Filtreleme
- [ ] **Sınav Tipi Filtresi**
  - [ ] YKS, LGS, DENEME vb. filtreleme çalışıyor mu?

- [ ] **Sınıf/Kapsam Filtresi**
  - [ ] Sınıf bazlı filtreleme çalışıyor mu?

### 3.2 Veli Perspektifi (`/veli/sinavlar`)

#### ✅ Sınav Sonuçları Görüntüleme
- [ ] **Sınav Listesi**
  - [ ] Veli olarak giriş yap
  - [ ] "Sınav Sonuçları" sayfasına git
  - [ ] Çocuğunun sınav sonuçları listeleniyor mu?
  - [ ] Sınav adı, tarihi, tipi görünüyor mu?

- [ ] **Sınav Detayları**
  - [ ] Bir sınava tıkla
  - [ ] Toplam puan görünüyor mu?
  - [ ] Sıralama görünüyor mu? (varsa)
  - [ ] Ders bazlı sonuçlar görünüyor mu? (JSON formatında)
  - [ ] Rehberlik notu görünüyor mu? (varsa)

### 3.3 Öğrenci Dashboard Entegrasyonu

#### ✅ Öğretmen Dashboard (`/ogretmen/ogrenci-dashboard`)
- [ ] **Sınav İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Ortalama puan hesaplanıyor mu?
  - [ ] Toplam sınav sayısı doğru mu?

- [ ] **Son Sınav Sonuçları**
  - [ ] Son 10 sınav listeleniyor mu?
  - [ ] Puanlar ve sıralamalar görünüyor mu?

#### ✅ Rehberlik/Admin Dashboard
- [ ] **Sınav İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Ortalama puan görünüyor mu?
  - [ ] Sınav listesi görünüyor mu?

---

## 💬 4. ÖĞRENCI GÖRÜŞÜ MODÜLÜ TEST LİSTESİ

### 4.1 Öğretmen Perspektifi (`/ogretmen/gorusler`)

#### ✅ Görüş Oluşturma
- [ ] **Yeni Görüş Ekleme**
  - [ ] Öğretmen olarak giriş yap
  - [ ] "Öğrenci Görüşleri" sayfasına git
  - [ ] "Yeni Görüş" butonuna tıkla
  - [ ] Öğrenci seç (sadece öğretmene atanmış sınıflardan)
  - [ ] Öğrenci arama yap (ad, soyad ile)
  - [ ] Görüş tipi seç:
    - [ ] ACADEMIC (Akademik)
    - [ ] BEHAVIORAL (Davranışsal)
    - [ ] GENERAL (Genel)
  - [ ] Kategori gir (opsiyonel, örn: "Matematik")
  - [ ] Görüş içeriği gir
  - [ ] Olumlu/Gelişmeli seçimi yap
  - [ ] Görüşü kaydet
  - [ ] Başarı mesajı göründü mü?

#### ✅ Görüş Listeleme
- [ ] **Görüş Listesi**
  - [ ] Yazdığım tüm görüşler listeleniyor mu?
  - [ ] Öğrenci adı, görüş tipi, tarih görünüyor mu?
  - [ ] Olumlu/Gelişmeli işaretleme görünüyor mu?

- [ ] **Filtreleme**
  - [ ] Öğrenci bazlı filtreleme çalışıyor mu?
  - [ ] Görüş tipi bazlı filtreleme çalışıyor mu?
  - [ ] Olumlu/Gelişmeli filtreleme çalışıyor mu?

#### ✅ Görüş Düzenleme
- [ ] **Görüş Güncelleme**
  - [ ] Bir görüşü düzenle
  - [ ] İçeriği değiştir
  - [ ] Görüş tipini değiştir
  - [ ] Olumlu/Gelişmeli durumunu değiştir
  - [ ] Kaydet
  - [ ] Değişiklikler kaydedildi mi?

#### ✅ Görüş Silme
- [ ] **Görüş Silme**
  - [ ] Bir görüşü sil
  - [ ] Onay mesajı göründü mü?
  - [ ] Görüş silindi mi?

### 4.2 Rehberlik Perspektifi (`/rehberlik/gorusler`)

#### ✅ Görüş Oluşturma
- [ ] **Yeni Görüş Ekleme**
  - [ ] Rehberlik olarak giriş yap
  - [ ] "Öğrenci Görüşleri" sayfasına git
  - [ ] "Yeni Görüş" butonuna tıkla
  - [ ] Öğrenci seç (tüm öğrenciler listelenmeli)
  - [ ] Öğrenci arama yap
  - [ ] Görüş tipi, kategori, içerik gir
  - [ ] Olumlu/Gelişmeli seçimi yap
  - [ ] Görüşü kaydet
  - [ ] Başarı mesajı göründü mü?

#### ✅ Görüş Listeleme ve Yönetimi
- [ ] **Tüm Görüşler**
  - [ ] Tüm öğrenciler için görüşler listeleniyor mu?
  - [ ] Filtreleme çalışıyor mu?

### 4.3 Veli Perspektifi (`/veli/gorusler`)

#### ✅ Görüş Görüntüleme
- [ ] **Görüş Listesi**
  - [ ] Veli olarak giriş yap
  - [ ] "Görüşler" sayfasına git
  - [ ] Çocuğu hakkındaki görüşler listeleniyor mu?
  - [ ] Görüş tipi, kategori, içerik görünüyor mu?
  - [ ] Olumlu/Gelişmeli işaretleme görünüyor mu?
  - [ ] Yazan kişi (öğretmen/rehberlik) bilgisi görünüyor mu?
  - [ ] Tarih bilgisi görünüyor mu?

- [ ] **Renk Kodlaması**
  - [ ] Olumlu görüşler yeşil renkte mi?
  - [ ] Gelişmeli görüşler turuncu/kırmızı renkte mi?

#### ✅ Filtreleme
- [ ] **Görüş Tipi Filtresi**
  - [ ] Akademik, Davranışsal, Genel filtreleme çalışıyor mu?

- [ ] **Olumlu/Gelişmeli Filtresi**
  - [ ] Filtreleme çalışıyor mu?

### 4.4 Öğrenci Dashboard Entegrasyonu

#### ✅ Öğretmen Dashboard (`/ogretmen/ogrenci-dashboard`)
- [ ] **Görüş İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Toplam görüş sayısı doğru mu?
  - [ ] Olumlu/Gelişmeli görüş sayıları doğru mu?

- [ ] **Son Görüşler**
  - [ ] Son 10 görüş listeleniyor mu?
  - [ ] Görüş tipi, içerik, tarih görünüyor mu?
  - [ ] Renk kodlaması doğru mu?

#### ✅ Rehberlik/Admin Dashboard
- [ ] **Görüş İstatistikleri**
  - [ ] Öğrenci seç
  - [ ] Görüş sayıları doğru mu?
  - [ ] Görüş listesi görünüyor mu?

---

## 🔗 5. ENTEGRASYON TESTLERİ

### 5.1 Öğrenci Dashboard Entegrasyonu
- [ ] **Tüm Modüllerin Dashboard'da Görünmesi**
  - [ ] Öğretmen Dashboard (`/ogretmen/ogrenci-dashboard`)
    - [ ] Ödev istatistikleri görünüyor mu?
    - [ ] Yoklama istatistikleri görünüyor mu?
    - [ ] Sınav istatistikleri görünüyor mu?
    - [ ] Görüş istatistikleri görünüyor mu?
    - [ ] Son aktiviteler listeleniyor mu?
  - [ ] Rehberlik Dashboard (`/rehberlik/ogrenci-dashboard`)
    - [ ] Tüm modüller görünüyor mu?
    - [ ] İstatistikler doğru mu?
  - [ ] Admin/Principal Dashboard (`/ogrenci-dashboard`)
    - [ ] Tüm modüller görünüyor mu?
    - [ ] Sadece görüntüleme modunda mı? (sınav girişi yok)

### 5.2 Veli Dashboard Entegrasyonu
- [ ] **Veli Panel (`/veli/panel`)**
  - [ ] Öğrenci kartında özet bilgiler görünüyor mu?
  - [ ] Ödev, yoklama, sınav, görüş linkleri çalışıyor mu?

### 5.3 Yetki Kontrolü
- [ ] **Öğretmen Yetkileri**
  - [ ] Ödev verme: ✅
  - [ ] Yoklama alma: ✅
  - [ ] Görüş girme: ✅
  - [ ] Sınav oluşturma: ❌
  - [ ] Sınav sonucu girme: ❌

- [ ] **Rehberlik Yetkileri**
  - [ ] Sınav oluşturma: ✅
  - [ ] Sınav sonucu girme: ✅
  - [ ] Görüş girme: ✅
  - [ ] Ödev verme: ❌
  - [ ] Yoklama alma: ❌

- [ ] **Veli Yetkileri**
  - [ ] Ödev görüntüleme: ✅
  - [ ] Yoklama görüntüleme: ✅
  - [ ] Sınav sonuçları görüntüleme: ✅
  - [ ] Görüş görüntüleme: ✅
  - [ ] Tüm düzenleme işlemleri: ❌

- [ ] **Admin/Principal Yetkileri**
  - [ ] Tüm verileri görüntüleme: ✅
  - [ ] Sınav sonuçlarını görüntüleme: ✅
  - [ ] Sınav oluşturma: ❌
  - [ ] Sınav sonucu girme: ❌

---

## 🐛 6. HATA DURUMLARI VE SINIR DURUMLARI

### 6.1 Ödevlendirme Modülü
- [ ] **Sınıf Seçimi**
  - [ ] Öğretmene atanmamış sınıf seçilebiliyor mu? → ❌ Olmamalı
  - [ ] Boş sınıf seçimi ile ödev oluşturulabiliyor mu? → ❌ Olmamalı

- [ ] **Öğrenci Seçimi**
  - [ ] Öğretmene atanmamış öğrenci seçilebiliyor mu? → ❌ Olmamalı
  - [ ] Aynı ödev aynı öğrenciye iki kez atanabiliyor mu? → ❌ Olmamalı

- [ ] **Tarih Validasyonu**
  - [ ] Geçmiş tarihli teslim tarihi seçilebiliyor mu? → ⚠️ Uyarı verilmeli

### 6.2 Yoklama Modülü
- [ ] **Sınıf Seçimi**
  - [ ] Öğretmene atanmamış sınıf seçilebiliyor mu? → ❌ Olmamalı

- [ ] **Yoklama Durumu**
  - [ ] Aynı öğrenci için aynı ders/tarih için iki yoklama kaydedilebiliyor mu? → ⚠️ Kontrol edilmeli

### 6.3 Sınav Analizi Modülü
- [ ] **Sınav Kapsamı**
  - [ ] Tüm okul + Sınıf seviyesi + Belirli sınıf seçimi birlikte yapılabiliyor mu? → ❌ Olmamalı
  - [ ] Sınav kapsamı seçilmeden sınav oluşturulabiliyor mu? → ❌ Olmamalı

- [ ] **Sonuç Girişi**
  - [ ] Aynı öğrenci için aynı sınava iki sonuç girilebiliyor mu? → ❌ Olmamalı (Unique constraint)
  - [ ] Sınav kapsamı dışındaki öğrenciye sonuç girilebiliyor mu? → ⚠️ Kontrol edilmeli

### 6.4 Öğrenci Görüşü Modülü
- [ ] **Öğrenci Seçimi**
  - [ ] Öğretmen, kendisine atanmamış öğrenci için görüş yazabiliyor mu? → ❌ Olmamalı
  - [ ] Rehberlik, tüm öğrenciler için görüş yazabiliyor mu? → ✅ Olmalı

---

## 📱 7. RESPONSIVE VE UI/UX TESTLERİ

### 7.1 Mobil Uyumluluk
- [ ] **Ödevlendirme Sayfası**
  - [ ] Mobil cihazda görüntüleme düzgün mü?
  - [ ] Formlar kullanılabilir mi?
  - [ ] Listeler okunabilir mi?

- [ ] **Yoklama Sayfası**
  - [ ] Mobil cihazda yoklama alınabiliyor mu?
  - [ ] Öğrenci listesi görüntülenebiliyor mu?

- [ ] **Sınav Analizi Sayfası**
  - [ ] Mobil cihazda sınav oluşturulabiliyor mu?
  - [ ] Sonuç girişi yapılabiliyor mu?

- [ ] **Görüş Sayfası**
  - [ ] Mobil cihazda görüş yazılabiliyor mu?
  - [ ] Listeler görüntülenebiliyor mu?

### 7.2 Kullanıcı Deneyimi
- [ ] **Yükleme Durumları**
  - [ ] Veri yüklenirken loading göstergesi var mı?
  - [ ] Hata durumlarında kullanıcı dostu mesajlar görünüyor mu?

- [ ] **Bildirimler**
  - [ ] Başarılı işlemlerde başarı mesajı görünüyor mu?
  - [ ] Hata durumlarında hata mesajı görünüyor mu?

- [ ] **Navigasyon**
  - [ ] Sayfalar arası geçişler sorunsuz mu?
  - [ ] Geri butonu çalışıyor mu?

---

## 🔒 8. GÜVENLİK TESTLERİ

### 8.1 Yetki Kontrolü
- [ ] **Yetkisiz Erişim**
  - [ ] Öğretmen, rehberlik sayfalarına erişebiliyor mu? → ❌
  - [ ] Veli, öğretmen sayfalarına erişebiliyor mu? → ❌
  - [ ] Giriş yapmadan sayfalara erişilebiliyor mu? → ❌

### 8.2 Veri Doğrulama
- [ ] **API Validasyonu**
  - [ ] Boş veri gönderildiğinde hata dönüyor mu?
  - [ ] Geçersiz veri gönderildiğinde hata dönüyor mu?
  - [ ] SQL injection denemeleri engelleniyor mu?

---

## 📊 9. PERFORMANS TESTLERİ

### 9.1 Yükleme Hızları
- [ ] **Sayfa Yükleme**
  - [ ] Ödev listesi hızlı yükleniyor mu? (< 2 saniye)
  - [ ] Yoklama listesi hızlı yükleniyor mu?
  - [ ] Sınav listesi hızlı yükleniyor mu?
  - [ ] Görüş listesi hızlı yükleniyor mu?

- [ ] **Dashboard Yükleme**
  - [ ] Öğrenci dashboard hızlı yükleniyor mu?
  - [ ] İstatistikler hızlı hesaplanıyor mu?

### 9.2 Büyük Veri Setleri
- [ ] **Çok Sayıda Ödev**
  - [ ] 100+ ödev olduğunda sayfa çalışıyor mu?
  - [ ] Pagination çalışıyor mu?

- [ ] **Çok Sayıda Öğrenci**
  - [ ] 50+ öğrencili sınıf için yoklama alınabiliyor mu?
  - [ ] Toplu işlemler performanslı mı?

---

## ✅ 10. GENEL KONTROL LİSTESİ

### 10.1 Veri Bütünlüğü
- [ ] **İlişkisel Veriler**
  - [ ] Öğrenci silindiğinde ödev atamaları siliniyor mu?
  - [ ] Öğrenci silindiğinde yoklama kayıtları siliniyor mu?
  - [ ] Öğrenci silindiğinde sınav sonuçları siliniyor mu?
  - [ ] Öğrenci silindiğinde görüşler siliniyor mu?

- [ ] **Unique Constraints**
  - [ ] Aynı ödev aynı öğrenciye iki kez atanamıyor mu?
  - [ ] Aynı öğrenci aynı sınava iki sonuç giremiyor mu?

### 10.2 Tarih ve Zaman
- [ ] **Tarih Formatları**
  - [ ] Tüm tarihler doğru formatta görüntüleniyor mu? (tr-TR)
  - [ ] Saat dilimi sorunları var mı?

### 10.3 Veri Görüntüleme
- [ ] **Boş Durumlar**
  - [ ] Ödev yoksa "Henüz ödev yok" mesajı görünüyor mu?
  - [ ] Yoklama yoksa "Henüz yoklama yok" mesajı görünüyor mu?
  - [ ] Sınav yoksa "Henüz sınav yok" mesajı görünüyor mu?
  - [ ] Görüş yoksa "Henüz görüş yok" mesajı görünüyor mu?

---

## 📝 TEST NOTLARI

### Bulunan Hatalar
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Öneriler
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Test Sonucu
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız (yukarıdaki notlara bakın)
- [ ] ❌ Kritik hatalar bulundu

**Test Edilen Tarih:** _______________  
**Test Eden:** _______________  
**Onaylayan:** _______________

