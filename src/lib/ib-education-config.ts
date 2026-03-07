/**
 * IB Eğitim faaliyeti – müfredat metinleri ve müdür atama kuralları
 */

/** Eğitim türüne göre sabit müfredat metni (readonly alanda gösterilir) */
export const EDUCATION_CURRICULUM_TEXTS: Record<string, string> = {
  "Spanish":
    "Müfredat: İspanyolca dil eğitimi temel seviye. Dinleme, okuma, yazma ve konuşma becerileri. Kelime ve gramer yapıları.",
  "English A1":
    "Müfredat: İngilizce A1 seviyesi. Temel ifadeler, selamlaşma, kendini tanıtma. Basit günlük dil kullanımı.",
  "English A2":
    "Müfredat: İngilizce A2 seviyesi. Günlük konuşmalar, kısa metinler. Geçmiş zaman ve temel bağlaçlar.",
  "English B1":
    "Müfredat: İngilizce B1 seviyesi. Orta düzey okuma ve yazma. Deneyim ve hedefler hakkında konuşma.",
  "English B2":
    "Müfredat: İngilizce B2 seviyesi. Karmaşık metinler, soyut konular. Akıcı ve detaylı iletişim.",
  "English Mathematics":
    "Müfredat: İngilizce matematik eğitimi. Matematiksel terimler ve problem çözme. Sayılar, cebir ve geometri dilinde iletişim.",
  "English Science":
    "Müfredat: İngilizce fen bilimleri eğitimi. Bilimsel kavramlar, deney açıklamaları ve raporlama dili.",
  "Electronics - Robotics":
    "Müfredat: Elektronik ve robotik temelleri. Devre tasarımı, sensörler ve programlama. Uygulamalı projeler.",
  "Artificial intelligence":
    "Müfredat: Yapay zeka temelleri. Makine öğrenmesi kavramları, etik ve uygulama alanları.",
  "Painting Culture":
    "Müfredat: Resim ve görsel kültür. Teknikler, sanat tarihi ve ifade biçimleri.",
  "Music Culture":
    "Müfredat: Müzik kültürü ve teori. Enstrüman, ritim ve müzik tarihi.",
}

/** Varsayılan müfredat (eğitim türü seçilmediğinde veya eşleşmeyen tür) */
export const DEFAULT_CURRICULUM_TEXT =
  "Eğitim türü seçildiğinde ilgili müfredat metni burada görüntülenecektir."

/**
 * Öğrenci sınıf seviyesine göre müdür adı (sabit kural).
 * 5–8: Ferhan Altınkaya Erdem
 * 9–12: Ramazan Koçali
 */
export function getPrincipalByGrade(grade: string): string {
  const num = parseInt(grade.replace(/\D/g, ""), 10)
  if (Number.isNaN(num)) return "Ferhan Altınkaya Erdem"
  if (num >= 5 && num <= 8) return "Ferhan Altınkaya Erdem"
  if (num >= 9 && num <= 12) return "Ramazan Koçali"
  return "Ferhan Altınkaya Erdem"
}

/**
 * Başarı puanına göre seviye etiketi (sertifika/başarı belgesi metninde [Achievement Level])
 */
export function getAchievementLevel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Pass"
  return "Needs Improvement"
}

/** Başarı belgesi için dinamik açıklama şablonu; [Score] ve [Achievement Level] yerine gerçek değer yazılır */
export const ACHIEVEMENT_DESCRIPTION_TEMPLATE =
  "The participant has successfully engaged in the education program and received a score of [Score] out of 100. Based on this result, their achievement level has been determined as [Achievement Level]."

export function formatAchievementDescription(score: number): string {
  const level = getAchievementLevel(score)
  return ACHIEVEMENT_DESCRIPTION_TEMPLATE.replace("[Score]", String(score)).replace(
    "[Achievement Level]",
    level
  )
}
