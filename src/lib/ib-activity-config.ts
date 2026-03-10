/**
 * Faaliyet Ekleme – Merkezi Konfigürasyon (Source of Truth)
 * Kategoriler, belge türleri, alt türler ve müfredat metinleri.
 */

export const CATEGORIES = ["egitim", "etkinlik", "spor", "yarisma"] as const
export type CategoryId = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  egitim: "Eğitim",
  etkinlik: "Etkinlik",
  spor: "Spor",
  yarisma: "Yarışma",
}

/** Belge türü: PDF çıktısında hangi sayfalar üretilecek */
export const DOCUMENT_IDS = [
  "sertifika",
  "basari_belgesi",
  "katilim_belgesi",
  "sonuc_belgesi",
  "mufredat",
] as const
export type DocumentId = (typeof DOCUMENT_IDS)[number]

export const DOCUMENT_LABELS: Record<DocumentId, string> = {
  sertifika: "Sertifika",
  basari_belgesi: "Başarı Belgesi",
  katilim_belgesi: "Katılım Belgesi",
  sonuc_belgesi: "Sonuç Belgesi",
  mufredat: "Müfredat",
}

/** Kategoriye göre üretilecek belgeler */
export const CATEGORY_DOCUMENTS: Record<CategoryId, DocumentId[]> = {
  egitim: ["sertifika", "basari_belgesi"],
  etkinlik: ["katilim_belgesi"],
  spor: ["katilim_belgesi", "sonuc_belgesi"],
  yarisma: ["katilim_belgesi", "sertifika", "basari_belgesi"],
}

/** Alt tür modu: sabit liste mi, serbest metin mi */
export type SubtypeMode = "preset" | "manual"

export interface SubtypeOption {
  id: string
  label: string
}

/** Eğitim alt türleri (sabit liste) */
export const EGITIM_SUBTYPES: SubtypeOption[] = [
  { id: "spanish", label: "Spanish" },
  { id: "english_a1", label: "English A1" },
  { id: "english_a2", label: "English A2" },
  { id: "english_b1", label: "English B1" },
  { id: "english_b2", label: "English B2" },
  { id: "english_math", label: "English Math" },
  { id: "english_science", label: "English Science" },
  { id: "robotics", label: "Robotics" },
  { id: "ai", label: "AI" },
  { id: "painting", label: "Painting" },
  { id: "music", label: "Music" },
]

/** Spor alt türleri (müfredat içeriği olanlar) */
export const SPOR_SUBTYPES: SubtypeOption[] = [
  { id: "basketbol", label: "Basketbol" },
  { id: "voleybol", label: "Voleybol" },
  { id: "hentbol", label: "Hentbol" },
  { id: "beden_egitimi", label: "Beden Eğitimi" },
]

/** Kategoriye göre alt tür modu ve seçenekler */
export function getSubtypeConfig(category: CategoryId): {
  mode: SubtypeMode
  options: SubtypeOption[]
} {
  switch (category) {
    case "egitim":
      return { mode: "preset", options: EGITIM_SUBTYPES }
    case "spor":
      return { mode: "preset", options: SPOR_SUBTYPES }
    case "etkinlik":
    case "yarisma":
      return { mode: "manual", options: [] }
    default:
      return { mode: "manual", options: [] }
  }
}

/** Eğitim alt türüne göre müfredat metni (readonly alanda gösterilir) */
export const MUFREDAT_TEXTS: Record<string, string> = {
  spanish:
    "Müfredat: İspanyolca dil eğitimi temel seviye. Dinleme, okuma, yazma ve konuşma becerileri. Kelime ve gramer yapıları.",
  english_a1:
    "Müfredat: İngilizce A1 seviyesi. Temel ifadeler, selamlaşma, kendini tanıtma. Basit günlük dil kullanımı.",
  english_a2:
    "Müfredat: İngilizce A2 seviyesi. Günlük konuşmalar, kısa metinler. Geçmiş zaman ve temel bağlaçlar.",
  english_b1:
    "Müfredat: İngilizce B1 seviyesi. Orta düzey okuma ve yazma. Deneyim ve hedefler hakkında konuşma.",
  english_b2:
    "Müfredat: İngilizce B2 seviyesi. Karmaşık metinler, soyut konular. Akıcı ve detaylı iletişim.",
  english_math:
    "Müfredat: İngilizce matematik eğitimi. Matematiksel terimler ve problem çözme. Sayılar, cebir ve geometri dilinde iletişim.",
  english_science:
    "Müfredat: İngilizce fen bilimleri eğitimi. Bilimsel kavramlar, deney açıklamaları ve raporlama dili.",
  robotics:
    "Müfredat: Elektronik ve robotik temelleri. Devre tasarımı, sensörler ve programlama. Uygulamalı projeler.",
  ai: "Müfredat: Yapay zeka temelleri. Makine öğrenmesi kavramları, etik ve uygulama alanları.",
  painting: "Müfredat: Resim ve görsel kültür. Teknikler, sanat tarihi ve ifade biçimleri.",
  music: "Müfredat: Müzik kültürü ve teori. Enstrüman, ritim ve müzik tarihi.",
}

export const DEFAULT_MUFREDAT_TEXT =
  "Eğitim alt türü seçildiğinde ilgili müfredat metni burada görüntülenecektir."

/** Kısa müfredat özeti (Eğitim alt türü için; formda gösterilir) */
export function getMufredatText(subtypeId: string): string {
  return MUFREDAT_TEXTS[subtypeId] ?? DEFAULT_MUFREDAT_TEXT
}

/** Eğitim alt türü → tam müfredat içerik id (ib-mufredat-icerikleri). Aynı tam metni paylaşanlar tek id. */
export const EGITIM_FULL_MUFREDAT_KEY: Record<string, string> = {
  english_a1: "ingilizce",
  english_a2: "ingilizce",
  english_b1: "ingilizce",
  english_b2: "ingilizce",
  english_science: "english_science",
  english_math: "english_math",
  robotics: "robotics",
  ai: "ai",
}

/** Tam müfredat içeriği (Spor vb. yıllık program) ib-mufredat-icerikleri.ts içinden okunur */
export function getMufredatIcerikIdForSubtype(category: CategoryId, subtypeId: string): string | null {
  if (category === "spor" && ["basketbol", "voleybol", "hentbol", "beden_egitimi"].includes(subtypeId))
    return subtypeId
  if (category === "egitim" && EGITIM_FULL_MUFREDAT_KEY[subtypeId]) return EGITIM_FULL_MUFREDAT_KEY[subtypeId]
  return null
}

/**
 * Müdür ataması (sabit kural)
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

/** Başarı puanına göre seviye (sertifika/başarı belgesi) */
export function getAchievementLevel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Pass"
  return "Needs Improvement"
}

/** Başarı belgesi metin şablonu; [Score] ve [Achievement Level] yerine gerçek değer yazılır */
export const ACHIEVEMENT_TEMPLATE =
  "The participant has successfully engaged in the education program and received a score of [Score] out of 100. Based on this result, their achievement level has been determined as [Achievement Level]."

export function formatAchievementText(score: number): string {
  const level = getAchievementLevel(score)
  return ACHIEVEMENT_TEMPLATE.replace("[Score]", String(score)).replace(
    "[Achievement Level]",
    level
  )
}

/** Kategori → Prisma ActivityType (kayıt için) */
export const CATEGORY_TO_ACTIVITY_TYPE: Record<CategoryId, string> = {
  egitim: "SEMINER",
  etkinlik: "ETKINLIK",
  spor: "SPORT",
  yarisma: "YARISMA",
}

/** Eski ActivityType (enum) → yeni category + subtype (migrasyon ve düzenleme formu için) */
export const LEGACY_TYPE_TO_CATEGORY: Record<
  string,
  { category: CategoryId; subtype: string | null }
> = {
  ETKINLIK: { category: "etkinlik", subtype: "etkinlik" },
  GEZI: { category: "etkinlik", subtype: "gezi" },
  PROJE: { category: "etkinlik", subtype: "proje" },
  SINAV: { category: "egitim", subtype: "sinav" },
  YARISMA: { category: "yarisma", subtype: null },
  SEMINER: { category: "egitim", subtype: "seminer" },
  WORKSHOP: { category: "egitim", subtype: "workshop" },
  SPORT: { category: "spor", subtype: "beden_egitimi" },
  SANAT: { category: "etkinlik", subtype: "sanat" },
  SOSYAL: { category: "etkinlik", subtype: "sosyal" },
  DIL: { category: "egitim", subtype: "dil" },
  BILIM: { category: "egitim", subtype: "bilim" },
  DEGER: { category: "etkinlik", subtype: "deger" },
  DIGER: { category: "etkinlik", subtype: "diger" },
}

export function getCategorySubtypeFromLegacyType(
  type: string
): { category: CategoryId; subtype: string | null } {
  const mapped = LEGACY_TYPE_TO_CATEGORY[type]
  if (mapped) return mapped
  return { category: "etkinlik", subtype: "diger" }
}

/**
 * Eğitim alt türü → ib-belge-tanimlari.ts içindeki belge id'leri
 * [müfredat belgesi, katılım/sertifika belgesi]
 */
export const EGITIM_SUBTYPE_BELGE_IDS: Record<string, [string, string]> = {
  english_science: ["ingilizce_fen_bilimi_mufredat", "ingilizce_fen_bilimi_egitim_katilim_belgesi"],
  english_math: ["ingilizce_matematik_mufredat", "ingilizce_matematik_egitim_katilim_belgesi"],
  robotics: ["robotik_mufredati", "robotik_egitimi_katilim_belgesi"],
  ai: ["yapay_zeka_mufredat", "yapay_zeka_egitimi_katilim_belgesi"],
  music: ["muzik_akademik_egitim_belgesi_mufredat", "dil_egitimi_katilim_belgesi"],
  painting: ["gorsel_sanatlar_mufredat", "gorsel_sanatlar_etkinlik_katilim_belgesi"],
  spanish: ["ingilizce_mufredat", "dil_egitimi_katilim_belgesi"],
  english_a1: ["ingilizce_mufredat", "dil_egitimi_katilim_belgesi"],
  english_a2: ["ingilizce_mufredat", "dil_egitimi_katilim_belgesi"],
  english_b1: ["ingilizce_mufredat", "dil_egitimi_katilim_belgesi"],
  english_b2: ["ingilizce_mufredat", "dil_egitimi_katilim_belgesi"],
}
