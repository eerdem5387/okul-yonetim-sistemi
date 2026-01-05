# 🧪 OKUL YÖNETİM SİSTEMİ - TEST KONTROL LİSTESİ

**Tarih:** 25 Ocak 2025  
**Versiyon:** 1.0  
**Test Eden:**  _______________

---

## 📋 ÖN HAZIRLIK

### 1. Veritabanı Hazırlığı
- [ ] `npx prisma migrate dev` komutu çalıştırıldı
- [ ] `npx prisma generate` komutu çalıştırıldı
- [ ] Veritabanında test öğrencileri var
- [ ] Veritabanında test personelleri var
- [ ] Veritabanında sınıflar oluşturuldu

### 2. Sistem Başlatma
- [ ] `npm run dev` komutu ile development server başlatıldı
- [ ] http://localhost:3000 adresi açılıyor
- [ ] Console'da kritik hata yok

### 3. Test Kullanıcıları (create-super-admin.ts ile oluştur)
- [ ] Admin kullanıcısı oluşturuldu
- [ ] Öğretmen kullanıcısı oluşturuldu
- [ ] Rehberlik kullanıcısı oluşturuldu
- [ ] Veli hesabı oluşturuldu (create-parents.ts)

---

## 🔐 FAZ 1: VELİ AUTHENTICATION SİSTEMİ

### Veli Giriş Testi
- [ ] `/veli-login` sayfası açılıyor
- [ ] "Öğrencinizin TC Kimlik Numarası" başlığı görünüyor
- [ ] Öğrenci TC ile giriş yapılabiliyor
- [ ] Yanlış şifre ile giriş engellenmiş
- [ ] Başarılı girişte `/veli/panel` sayfasına yönlendirme yapılıyor

### İlk Giriş ve Şifre Değiştirme
- [ ] İlk girişte şifre değiştirme sayfasına yönlendiriliyor
- [ ] Eski şifre olarak öğrenci TC kullanılabiliyor
- [ ] Yeni şifre belirleniyor
- [ ] Yeni şifre ile tekrar giriş yapılabiliyor

### Veli Panel Testi
- [ ] `/veli/panel` sayfası açılıyor
- [ ] Öğrenci bilgileri kartlarda görünüyor
- [ ] Veli ismi doğru görünüyor (Anne/Baba prefix'i ile)
- [ ] Sidebar menüsü görünüyor
- [ ] Çıkış yapma butonu çalışıyor

### Veli Sidebar
- [ ] "Ana Sayfa" linki çalışıyor
- [ ] "Ödevler" linki çalışıyor
- [ ] "Yoklama" linki çalışıyor
- [ ] "Sınavlar" linki çalışıyor
- [ ] "Görüşler" linki çalışıyor

---

## 📚 FAZ 2: ÖDEVLENDIRME MODÜLÜ

### Öğretmen - Ödev Oluşturma
- [ ] Öğretmen olarak giriş yapıldı
- [ ] `/ogretmen/odevler` sayfası açılıyor
- [ ] "Yeni Ödev" butonu görünüyor
- [ ] Form açılıyor ve doldurulabiliyor:
  - [ ] Ödev başlığı girildi
  - [ ] Açıklama girildi
  - [ ] Ders seçildi
  - [ ] Teslim tarihi seçildi
  - [ ] Sınıf seçildi VEYA öğrenci seçildi
- [ ] "Oluştur" butonuna tıklandı
- [ ] Ödev başarıyla oluşturuldu
- [ ] Ödev listede görünüyor

### Öğretmen - Ödev Listesi
- [ ] Oluşturulan ödevler listeleniyor
- [ ] Her ödev kartında şu bilgiler var:
  - [ ] Ödev başlığı
  - [ ] Teslim tarihi
  - [ ] Ders adı
  - [ ] Tamamlanma durumu (x/y öğrenci)
- [ ] "Detaylar" butonu çalışıyor

### Öğretmen - Ödev Tamamlama İşaretleme
- [ ] Ödev detay sayfası açılıyor
- [ ] Öğrenci listesi görünüyor
- [ ] Her öğrenci için checkbox var
- [ ] Checkbox işaretlendiğinde tamamlandı olarak kaydediliyor
- [ ] Sayfa yenilendiğinde durum korunuyor

### Veli - Ödev Görüntüleme
- [ ] Veli olarak giriş yapıldı
- [ ] `/veli/odevler` sayfası açılıyor
- [ ] Öğrencinin ödevleri listeleniyor
- [ ] Her ödev kartında şu bilgiler var:
  - [ ] Ödev başlığı
  - [ ] Teslim tarihi
  - [ ] Ders adı
  - [ ] Tamamlanma durumu (✅ veya ⏰)
- [ ] Tamamlanmış ödevler yeşil, bekleyenler turuncu

---

## 📅 FAZ 2: YOKLAMA MODÜLÜ

### Öğretmen - Yoklama Alma
- [ ] `/ogretmen/yoklama` sayfası açılıyor
- [ ] Sınıf seçim dropdown'u çalışıyor
- [ ] Ders seçim dropdown'u çalışıyor
- [ ] Tarih seçilebiliyor
- [ ] "Yoklama Al" butonu tıklanıyor
- [ ] Öğrenci listesi görünüyor
- [ ] Her öğrenci için durum seçilebiliyor:
  - [ ] ✅ Geldi (PRESENT)
  - [ ] ❌ Gelmedi (ABSENT)
  - [ ] ⏰ Geç Kaldı (LATE)
  - [ ] 📝 İzinli (EXCUSED)
- [ ] "Kaydet" butonuna tıklanıyor
- [ ] Yoklama kaydediliyor
- [ ] Başarı mesajı görünüyor

### Öğretmen - Yoklama Listesi
- [ ] Alınan yoklamalar listeleniyor
- [ ] Her yoklama için:
  - [ ] Sınıf adı
  - [ ] Ders adı
  - [ ] Tarih
  - [ ] Durum dağılımı (Geldi/Gelmedi/Geç/İzinli sayıları)

### Veli - Yoklama Görüntüleme
- [ ] `/veli/yoklama` sayfası açılıyor
- [ ] Öğrencinin yoklamaları listeleniyor
- [ ] Her yoklama için:
  - [ ] Ders adı
  - [ ] Tarih
  - [ ] Durum (renkli etiket)
- [ ] Devam oranı gösteriliyor

---

## 📝 FAZ 3: SINAV ANALİZİ MODÜLÜ

### Rehberlik - Sınav Oluşturma
- [ ] Rehberlik olarak giriş yapıldı
- [ ] `/rehberlik/sinavlar` sayfası açılıyor
- [ ] "Yeni Sınav" butonu çalışıyor
- [ ] Form açılıyor:
  - [ ] Sınav adı girildi
  - [ ] Sınav tipi seçildi (YKS, LGS, DENEME, DIGER)
  - [ ] Sınav tarihi seçildi
  - [ ] **Sınav kapsamı seçildi:**
    - [ ] 🏫 Tüm Okul
    - [ ] 🎓 Sınıf Seviyesi (grade seçildi)
    - [ ] 📚 Belirli Sınıf (sınıf dropdown'undan seçildi)
- [ ] "Oluştur" butonuna tıklandı
- [ ] Sınav başarıyla oluşturuldu

### Rehberlik - Sınav Listesi
- [ ] Oluşturulan sınavlar listeleniyor
- [ ] Her sınav için:
  - [ ] Sınav adı
  - [ ] Sınav tipi
  - [ ] Tarih
  - [ ] **Kapsam (🏫 Tüm Okul / 🎓 9. Sınıf / 📚 9/A)**
  - [ ] Sonuç sayısı
- [ ] "Sonuçları Gir" butonu görünüyor

### Rehberlik - Sınav Sonucu Girme
- [ ] "Sonuçları Gir" butonuna tıklandı
- [ ] Öğrenci listesi görünüyor
- [ ] Her öğrenci için:
  - [ ] Toplam puan girildi
  - [ ] Sıralama girildi (opsiyonel)
  - [ ] Yüzdelik dilim girildi (opsiyonel)
  - [ ] Not girildi (opsiyonel)
- [ ] "Kaydet" butonuna tıklandı
- [ ] Sonuçlar kaydedildi

### Veli - Sınav Sonuçlarını Görüntüleme
- [ ] `/veli/sinavlar` sayfası açılıyor
- [ ] Öğrencinin sınav sonuçları listeleniyor
- [ ] Her sınav için:
  - [ ] Sınav adı
  - [ ] Sınav tipi
  - [ ] Tarih
  - [ ] **Toplam puan** (mavi kart)
  - [ ] **Sıralama** (mor kart)
  - [ ] **Yüzdelik dilim** (yeşil kart)
  - [ ] Rehberlik notları (varsa)

---

## 💬 FAZ 4: GÖRÜŞ GİRİŞİ MODÜLÜ

### Öğretmen - Görüş Ekleme
- [ ] `/ogretmen/gorusler` sayfası açılıyor
- [ ] "Yeni Görüş" butonu çalışıyor
- [ ] Form açılıyor:
  - [ ] Öğrenci seçildi
  - [ ] Görüş tipi seçildi (📚 Akademik / 🤝 Davranışsal / 💬 Genel)
  - [ ] Kategori girildi (örn: "Matematik")
  - [ ] Görüş içeriği yazıldı
  - [ ] Değerlendirme seçildi (👍 Olumlu / 👎 Gelişmeli)
- [ ] "Kaydet" butonuna tıklandı
- [ ] Görüş başarıyla eklendi

### Öğretmen - Görüş Listesi
- [ ] Eklenen görüşler listeleniyor
- [ ] Her görüş için:
  - [ ] Öğrenci adı
  - [ ] Görüş tipi etiketi
  - [ ] Kategori etiketi
  - [ ] Görüş içeriği
  - [ ] Tarih
  - [ ] Olumlu/Gelişmeli göstergesi (sol kenarda renkli çizgi)
- [ ] "Düzenle" butonu çalışıyor
- [ ] "Sil" butonu çalışıyor

### Öğretmen - Görüş Düzenleme
- [ ] "Düzenle" butonuna tıklandı
- [ ] Form açılıyor (mevcut verilerle dolu)
- [ ] Değişiklik yapıldı
- [ ] "Güncelle" butonuna tıklandı
- [ ] Görüş güncellendi

### Rehberlik - Görüş Ekleme
- [ ] `/rehberlik/gorusler` sayfası açılıyor
- [ ] Tüm özellikler öğretmen ile aynı
- [ ] Mor renk teması görünüyor
- [ ] Görüş başarıyla eklendi

### Veli - Görüş Görüntüleme
- [ ] `/veli/gorusler` sayfası açılıyor
- [ ] Öğrenci hakkındaki tüm görüşler listeleniyor
- [ ] Her görüş için:
  - [ ] Görüş tipi etiketi
  - [ ] Kategori (varsa)
  - [ ] Görüş içeriği (büyük ve okunabilir)
  - [ ] Yazan öğretmen/rehberlik adı
  - [ ] Departman/Branş bilgisi
  - [ ] Tarih (uzun format)
  - [ ] Olumlu/Gelişmeli ikonu (👍/👎)
- [ ] Bilgilendirme kartı alt kısımda görünüyor
- [ ] ❌ Görüş ekleme/düzenleme/silme butonları YOK

---

## 📊 FAZ 5: ÖĞRENCİ DASHBOARD

### Öğretmen - Dashboard Erişimi
- [ ] `/ogretmen/ogrenci-dashboard` sayfası açılıyor
- [ ] "Öğrenci Dashboard" başlığı görünüyor
- [ ] Öğrenci seçim dropdown'u çalışıyor
- [ ] Zaman periyodu dropdown'u çalışıyor:
  - [ ] Son 30 Gün
  - [ ] Bu Ay
  - [ ] Tüm Zamanlar

### Öğretmen - Dashboard İstatistikleri
- [ ] Öğrenci seçildiğinde veriler yükleniyor
- [ ] **Öğrenci Bilgi Kartı** (Mavi gradient):
  - [ ] Öğrenci adı
  - [ ] Sınıf bilgisi
- [ ] **4 İstatistik Kartı:**
  - [ ] 📚 **Ödev Tamamlama:** Yüzde + Sayı (örn: %85, 17/20)
  - [ ] 📅 **Devam Oranı:** Yüzde + Sayı (örn: %95, 38/40)
  - [ ] 📝 **Sınav Ortalaması:** Puan + Sayı (örn: 450, 5 sınav)
  - [ ] 💬 **Görüşler:** Olumlu/Gelişmeli (örn: 6/2)

### Öğretmen - Dashboard Detay Kartları
- [ ] **Son Ödevler Kartı:**
  - [ ] Son 5 ödev listeleniyor
  - [ ] Her ödev için: Başlık, Ders, Teslim tarihi
  - [ ] Tamamlanma durumu ikonu (✅/⏰)
  - [ ] Boşsa "Henüz ödev yok" mesajı
- [ ] **Son Yoklamalar Kartı:**
  - [ ] Son 5 yoklama listeleniyor
  - [ ] Her yoklama için: Ders, Tarih, Durum etiketi
  - [ ] Durum renkleri doğru (Yeşil/Kırmızı/Turuncu/Mavi)
  - [ ] Boşsa "Henüz yoklama yok" mesajı
- [ ] **Son Sınav Sonuçları Kartı:**
  - [ ] Son 5 sınav listeleniyor
  - [ ] Her sınav için: Ad, Tip, Tarih, Puan, Sıralama
  - [ ] Boşsa "Henüz sınav sonucu yok" mesajı
- [ ] **Son Görüşler Kartı:**
  - [ ] Son 5 görüş listeleniyor
  - [ ] Her görüş için: Yazan, Tarih, İçerik (2 satır)
  - [ ] Olumlu/Gelişmeli göstergesi (yeşil/turuncu arka plan)
  - [ ] Boşsa "Henüz görüş yok" mesajı

### Öğretmen - Dashboard Filtreleme
- [ ] Zaman periyodu değiştirildiğinde:
  - [ ] Veriler yeniden yükleniyor
  - [ ] İstatistikler güncelleniyor
  - [ ] Detay kartları güncelleniyor

### Rehberlik - Dashboard Testi
- [ ] `/rehberlik/ogrenci-dashboard` sayfası açılıyor
- [ ] Tüm özellikler öğretmen ile aynı
- [ ] **Mor renk teması** görünüyor
- [ ] Tüm kartlar çalışıyor

---

## 🔄 ENTEGRASYON TESTLERİ

### Ödev → Dashboard Entegrasyonu
- [ ] Yeni ödev oluşturuldu
- [ ] Dashboard'da ödev sayısı arttı
- [ ] Dashboard'da tamamlama oranı güncellendi
- [ ] "Son Ödevler" kartında yeni ödev görünüyor

### Yoklama → Dashboard Entegrasyonu
- [ ] Yeni yoklama alındı
- [ ] Dashboard'da yoklama sayısı arttı
- [ ] Dashboard'da devam oranı güncellendi
- [ ] "Son Yoklamalar" kartında yeni yoklama görünüyor

### Sınav → Dashboard Entegrasyonu
- [ ] Yeni sınav sonucu girildi
- [ ] Dashboard'da sınav sayısı arttı
- [ ] Dashboard'da ortalama güncellendi
- [ ] "Son Sınav Sonuçları" kartında yeni sınav görünüyor

### Görüş → Dashboard Entegrasyonu
- [ ] Yeni görüş eklendi
- [ ] Dashboard'da görüş sayısı arttı
- [ ] Dashboard'da olumlu/gelişmeli dağılımı güncellendi
- [ ] "Son Görüşler" kartında yeni görüş görünüyor

### Sınıf Yönetimi Entegrasyonu
- [ ] Sınıf oluşturuldu
- [ ] Sınav oluştururken sınıf seçilebiliyor
- [ ] Ödev oluştururken sınıf seçilebiliyor
- [ ] Yoklama alınırken sınıf seçilebiliyor

---

## 🎨 UI/UX TESTLERİ

### Responsive Tasarım
- [ ] **Desktop (>1024px):**
  - [ ] 4 sütunlu istatistik grid'i
  - [ ] 2 sütunlu detay grid'i
  - [ ] Sidebar görünüyor
- [ ] **Tablet (768-1024px):**
  - [ ] 2 sütunlu istatistik grid'i
  - [ ] 1-2 sütunlu detay grid'i
  - [ ] Sidebar daraltılabiliyor
- [ ] **Mobil (<768px):**
  - [ ] 1 sütunlu istatistik grid'i
  - [ ] 1 sütunlu detay grid'i
  - [ ] Hamburger menü çalışıyor

### Renk Temaları
- [ ] **Öğretmen:** Mavi renk teması tutarlı
- [ ] **Rehberlik:** Mor renk teması tutarlı
- [ ] **Veli:** Yeşil renk teması tutarlı
- [ ] Butonlar ilgili renkte
- [ ] İkonlar doğru renkte

### Loading & Empty States
- [ ] Sayfa yüklenirken loading spinner görünüyor
- [ ] Veri yoksa "Henüz ... yok" mesajları görünüyor
- [ ] Hata durumunda error mesajı görünüyor

### İkonlar ve Göstergeler
- [ ] Tüm ikonlar düzgün render ediliyor
- [ ] Renkli etiketler görünüyor
- [ ] Tarih formatları Türkçe
- [ ] Sayılar düzgün formatlanmış

---

## 🔐 GÜVENLİK TESTLERİ

### Authentication
- [ ] Giriş yapmadan sayfalar açılmıyor
- [ ] Yanlış rol ile sayfalar açılmıyor (örn: Öğretmen veli sayfasına erişemiyor)
- [ ] Çıkış yapınca login'e yönlendiriliyor
- [ ] Session yönetimi çalışıyor

### Authorization
- [ ] Öğretmen sadece kendi ödevlerini görebiliyor
- [ ] Rehberlik tüm öğrencilere erişebiliyor
- [ ] Veli sadece kendi öğrencisini görebiliyor
- [ ] API endpoint'ler rol kontrolü yapıyor

---

## 🐛 HATA DURUMU TESTLERİ

### Hatalı Veri Girişi
- [ ] Boş form gönderilemiyor
- [ ] Geçersiz tarih kabul edilmiyor
- [ ] Geçersiz TC numarası reddediliyor
- [ ] Geçersiz e-posta formatı reddediliyor

### Network Hataları
- [ ] API hatası durumunda error mesajı görünüyor
- [ ] Timeout durumunda uyarı veriliyor
- [ ] Retry mekanizması çalışıyor (varsa)

### Veri Yokluğu
- [ ] Öğrenci seçilmediğinde placeholder görünüyor
- [ ] Veri yoksa empty state görünüyor
- [ ] Loading bittiğinde state güncelleniyor

---

## 📱 BROWSER UYUMLULUK

- [ ] **Chrome:** Tüm özellikler çalışıyor
- [ ] **Firefox:** Tüm özellikler çalışıyor
- [ ] **Safari:** Tüm özellikler çalışıyor
- [ ] **Edge:** Tüm özellikler çalışıyor

---

## ⚡ PERFORMANS TESTLERİ

### Sayfa Yüklenme
- [ ] Ana sayfa < 2 saniyede yükleniyor
- [ ] Dashboard < 3 saniyede yükleniyor
- [ ] Listeler < 2 saniyede yükleniyor

### API Response
- [ ] API çağrıları < 1 saniyede dönüyor
- [ ] Çoklu veri çağrıları paralel yapılıyor
- [ ] Gereksiz API çağrısı yok

---

## 📝 DOKÜMANTASYON

- [ ] README.md güncel
- [ ] API dokümantasyonu mevcut (MD dosyaları)
- [ ] Kullanıcı dokümantasyonu hazır (FAZ 1-5 MD dosyaları)
- [ ] Kurulum talimatları açık

---

## ✅ SON KONTROL

- [ ] Tüm migration'lar başarıyla çalıştı
- [ ] Tüm build warning'leri giderildi
- [ ] Console'da kritik error yok
- [ ] Tüm testler başarılı
- [ ] Sistem production'a hazır

---

## 📊 TEST SONUÇ ÖZETİ

**Test Edilen Özellik Sayısı:** _____ / 200+  
**Başarılı:** _____  
**Başarısız:** _____  
**Atlandı:** _____  

**Kritik Hatalar:** _____  
**Orta Seviye Hatalar:** _____  
**Küçük Hatalar:** _____  

**Notlar:**
```
_______________________________________________
_______________________________________________
_______________________________________________
```

**Sonuç:** ✅ BAŞARILI / ❌ BAŞARISIZ / ⚠️ KOŞULLU BAŞARILI

**Test Eden İmza:** _______________  
**Tarih:** _______________

---

## 🎯 HIZLI TEST SENARYOLARI (Demo İçin)

### Senaryo 1: Öğretmen Akışı (5 dakika)
1. Öğretmen olarak giriş yap
2. Yeni ödev oluştur
3. Yoklama al
4. Öğrenci görüşü yaz
5. Öğrenci dashboard'ını görüntüle

### Senaryo 2: Rehberlik Akışı (5 dakika)
1. Rehberlik olarak giriş yap
2. Yeni sınav oluştur (sınıf bazlı)
3. Sınav sonucu gir
4. Öğrenci görüşü yaz
5. Öğrenci dashboard'ını görüntüle

### Senaryo 3: Veli Akışı (3 dakika)
1. Veli olarak giriş yap (öğrenci TC ile)
2. Ödevleri görüntüle
3. Yoklamaları kontrol et
4. Sınav sonuçlarını gör
5. Öğretmen görüşlerini oku

### Senaryo 4: Full Entegrasyon (10 dakika)
1. Öğretmen: Ödev oluştur + Yoklama al + Görüş yaz
2. Rehberlik: Sınav oluştur + Sonuç gir + Dashboard kontrol
3. Veli: Tüm verileri görüntüle
4. Dashboard'ların hepsinde son verileri kontrol et

---

**🎉 Test'inizi başarıyla tamamladıysanız tebrikler!**  
**Sistem production'a hazır! 🚀**

