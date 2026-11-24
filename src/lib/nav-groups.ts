/**
 * Ana kenar menünün grupları ve her ekranın tek cümlelik açıklaması.
 * Menü (gruplu görünüm), Ctrl+K arama penceresi ve sayfa üstü ipuçları bu listeyi kullanır.
 * Yalnızca görünümü etkiler; hangi kullanıcının hangi sayfayı gördüğü `sidebar.tsx` içindeki kurallarla belirlenir.
 */

export type NavGroupId = "genel" | "ogrenci" | "akademik" | "rehberlik" | "etkinlik" | "personel" | "yonetim" | "diger"

export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: "genel", label: "" },
  { id: "ogrenci", label: "Öğrenci ve Kayıt" },
  { id: "akademik", label: "Akademik" },
  { id: "rehberlik", label: "Rehberlik ve Görüşmeler" },
  { id: "etkinlik", label: "Etkinlikler" },
  { id: "personel", label: "Personel ve Finans" },
  { id: "yonetim", label: "Yönetim" },
  { id: "diger", label: "Diğer" },
]

const GROUP_BY_HREF: Record<string, NavGroupId> = {
  "/": "genel",
  "/mesajlar": "genel",
  "/students": "ogrenci",
  "/ogrenci-dashboard": "ogrenci",
  "/new-registration": "ogrenci",
  "/renewal": "ogrenci",
  "/basvurular": "ogrenci",
  "/basvurular/arsiv": "ogrenci",
  "/yaz-okulu-basvurular": "ogrenci",
  "/aday-ogrenci-tespiti": "ogrenci",
  "/teklif-gorusmeleri": "ogrenci",
  "/sinif-yonetimi": "akademik",
  "/ders-programi": "akademik",
  "/neredeyiz": "akademik",
  "/rehberlik/sinavlar": "akademik",
  "/rehberlik/yoklama": "akademik",
  "/devamsizlik": "akademik",
  "/yonetim/akademik-takvim": "akademik",
  "/yonetim/parent-meetings": "rehberlik",
  "/rehberlik/gorusler": "rehberlik",
  "/faaliyet-yonetimi": "etkinlik",
  "/clubs": "etkinlik",
  "/gezi": "etkinlik",
  "/personel": "personel",
  "/ik-basvurular": "personel",
  "/finans": "personel",
  "/onay-paneli": "yonetim",
  "/yonetim/yetkilendirme": "yonetim",
  "/ayarlar": "yonetim",
}

export function navGroupOf(href: string): NavGroupId {
  return GROUP_BY_HREF[href] ?? "diger"
}

/** Ekran açıklamaları (menü ipucu, arama penceresi, sayfa üstü ilk-ziyaret ipucu). */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "Okulun genel özeti, hızlı erişim kısayolları ve onayınızı bekleyen işler.",
  "/mesajlar": "Personel arası mesajlaşma, sınıf duyuruları ve resmi bildirimler.",
  "/students": "Öğrenci kayıtlarını arayın, düzenleyin, filtreleyin ve Excel'e aktarın.",
  "/ogrenci-dashboard": "Bir öğrencinin devamsızlık, sınav, ödev ve görüşlerini tek ekranda görün.",
  "/new-registration": "Yeni öğrenci kaydı ve sözleşmelerini hazırlayın.",
  "/renewal": "Mevcut öğrencilerin bir sonraki yıl kayıt yenilemesini yapın.",
  "/basvurular": "Bursluluk sınavı başvurularını görüntüleyin ve takip edin.",
  "/basvurular/arsiv": "Geçmiş dönemlerin bursluluk sınavı başvurularını inceleyin.",
  "/yaz-okulu-basvurular": "Yaz okulu başvurularını görüntüleyin ve takip edin.",
  "/aday-ogrenci-tespiti": "Aday öğrencileri kaydedin ve iletişim geçmişini tutun.",
  "/teklif-gorusmeleri": "Velilerle yapılan ücret teklifi görüşmelerini takip edin.",
  "/sinif-yonetimi": "Şubeleri oluşturun, öğrencileri sınıflara yerleştirin, rehber öğretmen atayın.",
  "/ders-programi": "Sınıf ve öğretmenlerin haftalık ders programını hazırlayın.",
  "/neredeyiz": "Derslerin müfredatta hangi konuda olduğunu haftalık takip edin.",
  "/rehberlik/sinavlar": "Deneme sınavlarını oluşturun, optik sonuçları yükleyin ve analiz edin.",
  "/rehberlik/yoklama": "Sınıf yoklaması alın.",
  "/devamsizlik": "Öğrenci devamsızlıklarını sınıf ve tarih bazında izleyin.",
  "/yonetim/akademik-takvim": "Tatiller, sınav haftaları ve önemli tarihlerin takvimi.",
  "/yonetim/parent-meetings": "Veli görüşmelerini kaydedin ve geçmişini izleyin.",
  "/rehberlik/gorusler": "Öğretmen ve rehberlik görüşlerini öğrenci bazında kaydedin.",
  "/faaliyet-yonetimi": "Faaliyet ve etkinlikleri kaydedin, katılımcıları ve belgeleri yönetin.",
  "/clubs": "Kulüpleri, kulüp üyeliklerini ve kulüp tercihlerini yönetin.",
  "/gezi": "Okul gezilerini planlayın ve başvuruları takip edin.",
  "/personel": "Personel bilgileri, izinler, nöbetler ve görüşmeler.",
  "/ik-basvurular": "İş başvurularını ve mülakat süreçlerini takip edin.",
  "/finans": "Harcama talepleri, gelir-gider ve finans özetleri.",
  "/onay-paneli": "Onay bekleyen ders programlarını inceleyip onaylayın.",
  "/yonetim/yetkilendirme": "Personelin hangi modülleri görüp düzenleyebileceğini belirleyin.",
  "/ayarlar": "Menü düzeni gibi kişisel tercihler ve okul ayarları.",
  "/ogretmen/neredeyiz": "Derslerinizin müfredatta nerede olduğunu haftalık işaretleyin.",
  "/ogretmen/ders-programim": "Haftalık ders programınız.",
  "/ogretmen/odevler": "Sınıflarınıza ödev verin ve teslimleri izleyin.",
  "/ogretmen/yoklama": "Derslerinizin yoklamasını alın.",
  "/ogretmen/gorusler": "Öğrencileriniz hakkında görüş yazın.",
  "/ogretmen/ogrenci-dashboard": "Öğrencinizin özet bilgilerini tek ekranda görün.",
}
