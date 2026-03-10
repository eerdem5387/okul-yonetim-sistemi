# Faaliyet & Belge Modülü – Test ve Durum Raporu

## 1. Yapılan Düzeltmeler ve Eksik Tamamlamalar

### 1.1 Sertifika PDF API yetkisi
- **Sorun:** Sertifika indirme sadece `?token=...` ile çalışıyordu; panel kullanıcıları Bearer ile giriş yapıyor.
- **Çözüm:** `GET /api/ib/pdf/certificate/[activityId]` artık hem query `token` hem de `checkIbAccess(request)` (Authorization Bearer) ile yetki kabul ediyor.

### 1.2 Form validasyonu
- **Eksik:** Başlık ve her iki tarih zorunluydu ama kontrol edilmiyordu.
- **Çözüm:** `FaaliyetEklePage` handleSubmit içinde:
  - Başlık boşsa: "Başlık zorunludur."
  - Başlangıç tarihi yoksa: "Başlangıç tarihi zorunludur."
  - Bitiş tarihi yoksa: "Bitiş tarihi zorunludur."
  - Katılımcı yoksa: "En az bir katılımcı ekleyin."

### 1.3 Sertifika İndir butonu
- **Eksik:** IB Faaliyet listesinde sertifika indirme bağlantısı yoktu.
- **Çözüm:** `ogretmen/ib-yonetimi` faaliyet kartlarına "Sertifika İndir" butonu eklendi. Sadece `certificateData.category` ve `certificateData.subtype` dolu olan faaliyetlerde görünüyor. Tıklanınca `/api/ib/pdf/certificate/[activityId]?lang=tr` Bearer ile çağrılıp PDF yeni sekmede açılıyor.

### 1.4 ib-certificate-data tip hatası
- **Hata:** `valueMap` içinde `date` tanımsız kullanılıyordu (build hatası).
- **Çözüm:** `date` → `date: dateIssued` yapıldı; gereksiz `valueMap.date = dateIssued` satırı kaldırıldı.

### 1.5 ESLint uyarısı
- **Uyarı:** `valid.map((p, i) => ...)` içinde `i` kullanılmıyordu.
- **Çözüm:** Parametre `(p)` olacak şekilde güncellendi.

---

## 2. Mantıksal Akış Özeti

| Adım | Beklenen |
|------|----------|
| 1. Kategori seçimi | Eğitim / Etkinlik / Spor / Yarışma – doğru belge seti (config) |
| 2. Alt tür (Eğitim/Spor) | Preset liste; Etkinlik/Yarışma serbest metin |
| 3. Ortak form | Başlık*, Katılımcı seçimi* (arama + tıklayarak ekleme), Başlangıç/Bitiş tarihi*, Organizatör, Açıklama |
| 4. Kayıt | Her katılımcı için ayrı Activity; certificateData'da category, subtype, teacherName, educationDescription, educationStartEndDateStart/End, successScore |
| 5. Sertifika PDF | Sadece Eğitim + alt tür (EGITIM_SUBTYPE_BELGE_IDS) için belge id var; Etkinlik/Spor/Yarışma için şu an 400 (açıklayıcı mesaj) |

---

## 3. Test Senaryoları (Mantık / UX / Hata)

### 3.1 Faaliyet Ekle – Form
- **Başlık boş + Kaydet:** "Başlık zorunludur." uyarısı çıkmalı.
- **Katılımcı yok + Kaydet:** "En az bir katılımcı ekleyin." uyarısı çıkmalı.
- **Başlangıç tarihi boş + Kaydet:** "Başlangıç tarihi zorunludur." uyarısı çıkmalı.
- **Bitiş tarihi boş + Kaydet:** "Bitiş tarihi zorunludur." uyarısı çıkmalı.
- **Öğrenci arama:** Yazdıkça liste filtelenmeli; tıklanınca katılımcı listesine eklenmeli; aynı öğrenci tekrar listelenmemeli (zaten eklendi).
- **Eğitim/Yarışma:** Öğretmen seçimi ve katılımcı başına başarı puanı (1–100) alanları görünmeli.
- **Tarih:** `type="date"` kullanıldığı için tarayıcı locale’e göre gösterim (TR’de dd.mm.yyyy olabilir); API’ye ISO/YYYY-MM-DD gidiyor.

### 3.2 Faaliyet Ekle – Kayıt
- **Çoklu katılımcı:** N öğrenci seçilince N adet Activity oluşmalı; her birinin certificateData’sı o öğrenciye ait (successScore dahil).
- **activityDate:** Şu an `startDate || endDate` ile tek tarih gönderiliyor; API tek `activityDate` alıyor – tutarlı.
- **certificateContents:** Her eleman educationStartEndDateStart, educationStartEndDateEnd içermeli; sertifika PDF’de formatDateRange ile "dd.mm.yyyy - dd.mm.yyyy" üretiliyor.

### 3.3 Sertifika PDF
- **Eğitim + Spanish (veya ai, robotics vb.):** 200, PDF dönmeli. Sertifika (katılım) + isteğe bağlı başarı sayfası (successScore doluysa).
- **Eğitim + successScore yok:** Tek sayfa (katılım/sertifika).
- **Eğitim + successScore var:** İki sayfa (sertifika + başarı).
- **Principal:** Öğrenci sınıfı 5–8 → Ferhan Altınkaya Erdem; 9–12 → Ramazan Koçali; PDF’de doğru yazılmalı.
- **Etkinlik/Spor/Yarışma:** getCertificateBelgeIdForActivity null döndüğü için 400 + "Bu faaliyet türü için sertifika tanımı bulunamadı." beklenir (bilinçli kısıt).
- **Yetkisiz:** Token yok ve Bearer yok → 401.

### 3.4 IB Panel – Sertifika İndir
- **certificateData.category + subtype var:** "Sertifika İndir" görünmeli; tıklanınca PDF indirilmeli (Bearer ile).
- **certificateData yok veya category/subtype yok:** Buton görünmemeli.
- **Eski form ile eklenen faaliyetler:** certificateData farklı yapıda olabilir; buton görünmeyebilir – beklenen.

### 3.5 Müfredat PDF (Faaliyet raporu)
- **Müfredatı olan faaliyet (örn. AI):** `/api/ib/pdf/activity/[id]?token=...` ilk sayfada müfredat şablonu (logo, program tablosu, aylık tablolar) içermeli.
- **Müfredatı olmayan faaliyet:** Sadece faaliyet detay sayfası.

---

## 4. Kullanıcı Deneyimi Notları

- **Ortak form:** Tüm türlerde aynı alan seti (Başlık, Katılımcı seçimi, Tarihler, Organizatör, Açıklama) – kullanıcı beklentisiyle uyumlu.
- **Katılımcı seçimi:** Tek arama kutusu + tıklayarak ekleme; "Ekle" ile boş satır açma kaldırıldı – daha sade.
- **Zorunlu alanlar:** Başlık ve tarihlerde * ve submit’te validasyon var; anında geri bildirim veriliyor.
- **Sertifika butonu:** Sadece sertifika üretilebilecek kayıtlarda gösteriliyor; yanlış beklenti azaltılıyor.
- **Tarih formatı:** Label’da "(dd.mm.yyyy)" geçiyor; input tarayıcıya bırakıldı.

---

## 5. Bilinen Kısıtlar / İleride Yapılabilecekler

1. **Etkinlik / Spor / Yarışma sertifika PDF:** Şu an yalnızca Eğitim alt türleri için belge id eşlemesi var. Etkinlik (konser, gezi vb.), spor veya yarışma için ayrı belge id’leri eklenirse aynı şablonla PDF üretilebilir.
2. **Spor – Sonuç belgesi yükleme:** "Sonuç Belgesi (eğer varsa upload edilecek)" için form state’te `resultDocumentUrl` var; API’ye gönderilip Activity.evidence veya ayrı alanda saklanmıyor. İleride file upload + evidence kaydı eklenebilir.
3. **Sertifika PDF dili:** Şu an `lang=tr` sabit (panel butonu); dil parametresi kolayca genişletilebilir.
4. **Çoklu sertifika tek ZIP:** Birden fazla öğrenci için tek tıkla tüm sertifikaları ZIP olarak indirme şu an yok; her faaliyet için ayrı indirme.

---

## 6. Derleme ve Statik Kontrol

- `npm run build` başarıyla tamamlandı (Next.js 15, Turbopack).
- TypeScript ve ESLint hatası kalmadı.
- Faaliyet ekleme, sertifika API ve IB panel değişiklikleri derlemeye dahil.

---

## 7. Manuel Test Checklist (Giriş Yapıldıktan Sonra)

- [ ] Giriş yap (personel), `/faaliyet-ekle` veya `/ogretmen/ib-yonetimi/faaliyet-ekle` açılsın.
- [ ] Eğitim → Spanish (veya AI) → Katılımcı ekle (arama ile), başlık, tarihler, organizatör, açıklama doldur; bir öğrenciye başarı puanı gir.
- [ ] Kaydet; "X faaliyet kaydedildi" mesajı gelsin.
- [ ] IB Faaliyet Yönetimi listesinde ilgili faaliyetler görünsün; "Sertifika İndir" görünsün.
- [ ] Sertifika İndir’e tıkla; PDF açılsın (logo, başlık, katılımcı bilgileri, müdür, puan/seviye paragrafı).
- [ ] Başlık boş bırakıp Kaydet; "Başlık zorunludur." uyarısı çıksın.
- [ ] Başlangıç veya bitiş tarihini silip Kaydet; ilgili tarih uyarısı çıksın.
- [ ] Müfredatı olan bir faaliyet için IB faaliyet PDF’ini (token ile) aç; ilk sayfada müfredat şablonu olsun.

---

*Rapor tarihi: Modül güncellemeleri ve test analizi tamamlandı.*
