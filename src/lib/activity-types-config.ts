/**
 * Faaliyet Yönetimi — Merkezi Konfigürasyon
 * 7 ana kategori, alt türler, sertifika tipleri ve form kuralları
 */

import type { MufredatHafta } from "./mufredatlar/ingilizce"
export type { MufredatHafta }

export const ACTIVITY_MAIN_TYPES = [
  "EGITIM",
  "GEZI",
  "GORSEL_SANATLAR",
  "MUZIK",
  "PROJE",
  "SPOR",
  "TURNUVA",
] as const

export type ActivityMainType = (typeof ACTIVITY_MAIN_TYPES)[number]

export const MAIN_TYPE_LABELS: Record<ActivityMainType, string> = {
  EGITIM: "Eğitim",
  GEZI: "Gezi",
  GORSEL_SANATLAR: "Görsel Sanatlar",
  MUZIK: "Müzik",
  PROJE: "Proje",
  SPOR: "Spor",
  TURNUVA: "Turnuva",
}

export const MAIN_TYPE_COLORS: Record<ActivityMainType, string> = {
  EGITIM: "bg-indigo-500/10 text-indigo-700 border-indigo-200 hover:bg-indigo-500/20",
  GEZI: "bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20",
  GORSEL_SANATLAR: "bg-pink-500/10 text-pink-700 border-pink-200 hover:bg-pink-500/20",
  MUZIK: "bg-purple-500/10 text-purple-700 border-purple-200 hover:bg-purple-500/20",
  PROJE: "bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20",
  SPOR: "bg-orange-500/10 text-orange-700 border-orange-200 hover:bg-orange-500/20",
  TURNUVA: "bg-cyan-500/10 text-cyan-700 border-cyan-200 hover:bg-cyan-500/20",
}

export const MAIN_TYPE_ACTIVE_COLORS: Record<ActivityMainType, string> = {
  EGITIM: "bg-indigo-600 text-white border-indigo-600",
  GEZI: "bg-emerald-600 text-white border-emerald-600",
  GORSEL_SANATLAR: "bg-pink-600 text-white border-pink-600",
  MUZIK: "bg-purple-600 text-white border-purple-600",
  PROJE: "bg-amber-600 text-white border-amber-600",
  SPOR: "bg-orange-600 text-white border-orange-600",
  TURNUVA: "bg-cyan-600 text-white border-cyan-600",
}

// --- Sertifika Tipleri ---
export const CERTIFICATE_TYPES = [
  "DIL_EGITIMI_KATILIM",
  "INGILIZCE_FEN_SERTIFIKA",
  "INGILIZCE_MATEMATIK_SERTIFIKA",
  "ROBOTIK_SERTIFIKA",
  "YAPAY_ZEKA_SERTIFIKA",
  "GEZI_KATILIM",
  "GORSEL_SANATLAR_EGITIM",
  "GORSEL_SANATLAR_ETKINLIK",
  "MUZIK_EGITIM",
  "MUZIK_ESER_ICRA",
  "BASKETBOL_EGITIM",
  "BEDEN_EGITIMI_EGITIM",
  "HENTBOL_EGITIM",
  "VOLEYBOL_EGITIM",
  "TURNUVA_KATILIM",
  "TURNUVA_BASARI",
  "PROJE_KATILIM",
] as const

export type CertificateType = (typeof CERTIFICATE_TYPES)[number]

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  DIL_EGITIMI_KATILIM: "Dil Eğitimi Katılım Sertifikası",
  INGILIZCE_FEN_SERTIFIKA: "Certificate of English Science Education",
  INGILIZCE_MATEMATIK_SERTIFIKA: "Certificate of English Mathematics Education",
  ROBOTIK_SERTIFIKA: "Certificate of Robotics Education",
  YAPAY_ZEKA_SERTIFIKA: "Certificate of Artificial Intelligence Education",
  GEZI_KATILIM: "Gezi Katılım Belgesi",
  GORSEL_SANATLAR_EGITIM: "Görsel Sanatlar Eğitimi Katılım Sertifikası",
  GORSEL_SANATLAR_ETKINLIK: "Certificate of Artwork Creation",
  MUZIK_EGITIM: "LEVENT COLLEGE IB PROGRAMME MUSIC ANNUAL CURRICULUM PROGRAM",
  MUZIK_ESER_ICRA: "LEVENT COLLEGE IB PROGRAMME CERTIFICATE OF ARTWORK CREATION",
  BASKETBOL_EGITIM: "Basketbol Eğitimi Katılım Sertifikası",
  BEDEN_EGITIMI_EGITIM: "Beden Eğitimi Katılım Sertifikası",
  HENTBOL_EGITIM: "Hentbol Eğitimi Katılım Sertifikası",
  VOLEYBOL_EGITIM: "Voleybol Eğitimi Katılım Sertifikası",
  TURNUVA_KATILIM: "LEVENT COLLEGE IB PROGRAMME CERTIFICATE OF TOURNAMENT PARTICIPATION",
  TURNUVA_BASARI: "LEVENT COLLEGE IB PROGRAMME CERTIFICATE OF TOURNAMENT ACHIEVEMENT",
  PROJE_KATILIM: "LEVENT COLLEGE IB PROGRAMME CERTIFICATE OF PROJECT PARTICIPATION",
}

// --- Form Alan Gereksinimleri ---
export type FormVariant = "standard" | "gezi"

export interface SubtypeConfig {
  id: string
  label: string
  certificateType: CertificateType
  requiresScore: boolean
  requiresLanguageLevel: boolean
  requiresTeacher: boolean
  requiresExtraDocument: boolean
  /** Form varyantı — gezi modunda ek alanlar görünür */
  formVariant?: FormVariant
  /** Gezi türü dropdown'u göster (sadece formVariant="gezi") */
  showGeziTuru?: boolean
  /** Gezi programı textarea'sı göster (sadece formVariant="gezi") */
  showGeziProgrami?: boolean
  /** Ulaşım türü dropdown'u göster (sadece formVariant="gezi") */
  showUlasimTuru?: boolean
  /** "Eser Sayısı" alanını göster (Görsel Sanatlar) */
  showNumberOfArtworks?: boolean
  /** "Müdür Yardımcısı" alanını göster (Görsel Sanatlar) */
  showVicePrincipal?: boolean
  /** Katılımcı satırında eser açıklaması (Görsel Sanatlar Etkinlik) */
  requiresArtworkDescription?: boolean
  /** 1. adım başlık alanı etiketi (varsayılan: Eğitim Başlığı / Gezi Başlığı) */
  activityTitleLabel?: string
  /** 1. adım başlık placeholder */
  activityTitlePlaceholder?: string
  /** requiresExtraDocument iken ek belge alanı etiketi (varsayılan: Ek Belge (PDF)) */
  extraDocumentFieldLabel?: string
  /** Ek belge upload tipi (sunucu kuralı için) */
  extraDocumentUploadType?: "extra_doc" | "sports_license_doc"
  /** Ek belge için istemci boyut sınırı */
  extraDocumentMaxBytes?: number
  /** Ek belge alanını göster; zorunlu değil (örn. turnuva derece belgesi) */
  optionalExtraDocument?: boolean
  /** Turnuva: toplam yarışmacı sayısı (başarı belgesi) */
  showTournamentTotalParticipants?: boolean
  /** Turnuva: katılımcı bazlı derece / sıralama metni (textarea) */
  showTournamentPlacement?: boolean
  /** Adım 1 açıklama textarea etiketi */
  descriptionFieldLabel?: string
  descriptionPlaceholder?: string
  /** Formun üstünde gösterilecek müfredat verisi (opsiyonel) */
  mufredat?: MufredatHafta[]
  /** Müfredat başlığı (opsiyonel, varsayılan: "Müfredat Önizlemesi") */
  mufredatBaslik?: string
  /** Proje: pdf/proje-icerik-belgesi.docx ile uyumlu belge önizlemesi */
  projectDocumentPreview?: boolean
  /** Proje: Project Purpose alanı */
  showProjectPurpose?: boolean
  /** Proje: sertifikadaki başarı düzeyi metni (dinamik paragraf) */
  showProjectAchievementLevel?: boolean
  /** Proje: Sonuç / Kazanım zorunlu (Expected Outcomes) */
  requireProjectOutcome?: boolean
  outcomeFieldLabel?: string
  outcomePlaceholder?: string
  /** Proje: katılımcı satırında rol alanı */
  showParticipantProjectRole?: boolean
}

// --- Eğitim Alt Türleri ---
import { INGILIZCE_MUFREDAT } from "./mufredatlar/ingilizce"
import { INGILIZCE_FEN_MUFREDAT } from "./mufredatlar/ingilizce-fen"
import { INGILIZCE_MATEMATIK_MUFREDAT } from "./mufredatlar/ingilizce-matematik"
import { ISPANYOLCA_MUFREDAT } from "./mufredatlar/ispanyolca"
import { ROBOTIK_MUFREDAT } from "./mufredatlar/robotik"
import { YAPAY_ZEKA_MUFREDAT } from "./mufredatlar/yapay-zeka"
import { GORSEL_SANATLAR_MUFREDAT } from "./mufredatlar/gorsel-sanatlar"
import { MUZIK_MUFREDAT } from "./mufredatlar/muzik"
import { BASKETBOL_MUFREDAT } from "./mufredatlar/basketbol"
import { BEDEN_EGITIMI_MUFREDAT } from "./mufredatlar/beden-egitimi"
import { HENTBOL_MUFREDAT } from "./mufredatlar/hentbol"
import { VOLEYBOL_MUFREDAT } from "./mufredatlar/voleybol"

export const EGITIM_SUBTYPES: SubtypeConfig[] = [
  {
    id: "ingilizce",
    label: "İngilizce",
    certificateType: "DIL_EGITIMI_KATILIM",
    requiresScore: true,
    requiresLanguageLevel: true,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: INGILIZCE_MUFREDAT,
    mufredatBaslik: "LEVENT COLLEGE IB PROGRAMME — English Annual Curriculum (40 Weeks)",
  },
  {
    id: "ingilizce_fen",
    label: "İngilizce Fen",
    certificateType: "INGILIZCE_FEN_SERTIFIKA",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: INGILIZCE_FEN_MUFREDAT,
    mufredatBaslik: "LEVENT COLLEGE IB PROGRAMME — English Science Annual Curriculum (40 Weeks)",
  },
  {
    id: "ingilizce_matematik",
    label: "İngilizce Matematik",
    certificateType: "INGILIZCE_MATEMATIK_SERTIFIKA",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: INGILIZCE_MATEMATIK_MUFREDAT,
    mufredatBaslik: "LEVENT COLLEGE IB PROGRAMME — English Mathematics Annual Curriculum (20 Weeks)",
  },
  {
    id: "ispanyolca",
    label: "İspanyolca",
    certificateType: "DIL_EGITIMI_KATILIM",
    requiresScore: true,
    requiresLanguageLevel: true,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: ISPANYOLCA_MUFREDAT,
    mufredatBaslik: "LEVENT COLLEGE IB PROGRAMME — Spanish Annual Curriculum (40 Weeks)",
  },
  {
    id: "robotik",
    label: "Robotik",
    certificateType: "ROBOTIK_SERTIFIKA",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: ROBOTIK_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Electronics & Robotics Club Annual Curriculum (40 Weeks)",
  },
  {
    id: "yapay_zeka",
    label: "Yapay Zeka",
    certificateType: "YAPAY_ZEKA_SERTIFIKA",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: YAPAY_ZEKA_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Artificial Intelligence Annual Curriculum (40 Weeks)",
  },
]

// --- Gezi Alt Türleri (tek giriş = alt tür seçim ekranı atlanır) ---
export const GEZI_SUBTYPES: SubtypeConfig[] = [
  {
    id: "genel",
    label: "Gezi",
    certificateType: "GEZI_KATILIM",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    formVariant: "gezi",
    showGeziTuru: true,
    showGeziProgrami: true,
    showUlasimTuru: true,
  },
]

// --- Görsel Sanatlar Alt Türleri ---
export const GORSEL_SANATLAR_SUBTYPES: SubtypeConfig[] = [
  {
    id: "egitim",
    label: "Eğitim",
    certificateType: "GORSEL_SANATLAR_EGITIM",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    showNumberOfArtworks: true,
    showVicePrincipal: true,
    mufredat: GORSEL_SANATLAR_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Visual Arts Annual Curriculum (40 Weeks)",
  },
  {
    id: "etkinlik",
    label: "Etkinlik",
    certificateType: "GORSEL_SANATLAR_ETKINLIK",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    requiresArtworkDescription: true,
    mufredat: GORSEL_SANATLAR_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Visual Arts Annual Curriculum (40 Weeks)",
  },
]

// --- Müzik Alt Türleri ---
export const MUZIK_SUBTYPES: SubtypeConfig[] = [
  {
    id: "egitim",
    label: "Eğitim",
    certificateType: "MUZIK_EGITIM",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: MUZIK_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Music Annual Curriculum Program (40 Weeks)",
  },
  {
    id: "etkinlik_konser",
    label: "Etkinlik / Konser",
    certificateType: "MUZIK_ESER_ICRA",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    activityTitleLabel: "Etkinlik / Konser Başlığı",
    activityTitlePlaceholder: "örn: Bahar Dönemi Piyano Resitali — 12 Haziran 2025",
  },
  {
    id: "etkinlik_eser_icra",
    label: "Etkinlik / Eser İcra",
    certificateType: "MUZIK_ESER_ICRA",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    requiresArtworkDescription: true,
    activityTitleLabel: "Etkinlik / Eser İcra Başlığı",
    activityTitlePlaceholder: "örn: Piyano Resitali — Solo Performans — 15 Mayıs 2025",
  },
]

// --- Spor Alt Türleri ---
export const SPOR_SUBTYPES: SubtypeConfig[] = [
  {
    id: "basketbol",
    label: "Eğitim — Basketbol",
    certificateType: "BASKETBOL_EGITIM",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: true,
    extraDocumentFieldLabel: "Spor lisansı (PDF)",
    extraDocumentUploadType: "sports_license_doc",
    extraDocumentMaxBytes: 1 * 1024 * 1024,
    mufredat: BASKETBOL_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Basketball Annual Academic Curriculum (40 Weeks)",
  },
  {
    id: "beden_egitimi",
    label: "Eğitim — Beden Eğitimi",
    certificateType: "BEDEN_EGITIMI_EGITIM",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    mufredat: BEDEN_EGITIMI_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Physical Education Annual Curriculum (40 Weeks)",
  },
  {
    id: "hentbol",
    label: "Eğitim — Hentbol",
    certificateType: "HENTBOL_EGITIM",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: true,
    extraDocumentFieldLabel: "Spor lisansı (PDF)",
    extraDocumentUploadType: "sports_license_doc",
    extraDocumentMaxBytes: 1 * 1024 * 1024,
    mufredat: HENTBOL_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Handball Annual Curriculum Program (40 Weeks)",
  },
  {
    id: "voleybol",
    label: "Eğitim — Voleybol",
    certificateType: "VOLEYBOL_EGITIM",
    requiresScore: true,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: true,
    extraDocumentFieldLabel: "Spor lisansı (PDF)",
    extraDocumentUploadType: "sports_license_doc",
    extraDocumentMaxBytes: 1 * 1024 * 1024,
    mufredat: VOLEYBOL_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Volleyball Annual Curriculum Program (40 Weeks)",
  },
]

// --- Proje Alt Türleri ---
export const PROJE_SUBTYPES: SubtypeConfig[] = [
  {
    id: "klavye",
    label: "Klavye ile girilecek",
    certificateType: "PROJE_KATILIM",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    projectDocumentPreview: true,
    showProjectPurpose: true,
    showProjectAchievementLevel: true,
    requireProjectOutcome: true,
    showVicePrincipal: true,
    showParticipantProjectRole: true,
    activityTitleLabel: "Project Title",
    activityTitlePlaceholder: "örn: Sustainable Campus Waste Reduction — IB Group 4 Project",
    descriptionFieldLabel: "Project Description",
    descriptionPlaceholder:
      "Summarize the project scope, main activities, and deliverables (English or Turkish).",
    outcomeFieldLabel: "Expected Outcomes",
    outcomePlaceholder:
      "What learners are expected to achieve; link to IB criteria or project goals if applicable.",
  },
]

// --- Turnuva Alt Türleri ---
export const TURNUVA_SUBTYPES: SubtypeConfig[] = [
  {
    id: "yarismalar",
    label: "Yarışma, Müsabaka, Bilim, Spor",
    certificateType: "TURNUVA_KATILIM",
    requiresScore: false,
    requiresLanguageLevel: false,
    requiresTeacher: true,
    requiresExtraDocument: false,
    optionalExtraDocument: true,
    extraDocumentFieldLabel: "Derece belgesi (PDF, varsa)",
    showTournamentTotalParticipants: true,
    showTournamentPlacement: true,
    activityTitleLabel: "Turnuva / Müsabaka Başlığı",
    activityTitlePlaceholder: "örn: İstanbul Okullar Arası Hentbol Turnuvası — Mart 2025",
    descriptionFieldLabel: "Turnuva açıklaması (Tournament Description)",
    descriptionPlaceholder:
      "Turnuvanın kapsamını, düzenleyen kurumu ve önemli detayları İngilizce veya Türkçe kısaca yazın…",
    mufredat: HENTBOL_MUFREDAT,
    mufredatBaslik:
      "LEVENT COLLEGE IB PROGRAMME — Handball Annual Curriculum Program (40 Weeks)",
  },
]

// --- Diğer kategoriler (sonraki aşamalarda doldurulacak) ---
export const SUBTYPES_BY_MAIN_TYPE: Record<ActivityMainType, SubtypeConfig[]> = {
  EGITIM: EGITIM_SUBTYPES,
  GEZI: GEZI_SUBTYPES,
  GORSEL_SANATLAR: GORSEL_SANATLAR_SUBTYPES,
  MUZIK: MUZIK_SUBTYPES,
  PROJE: PROJE_SUBTYPES,
  SPOR: SPOR_SUBTYPES,
  TURNUVA: TURNUVA_SUBTYPES,
}

export function getSubtypeConfig(
  mainType: ActivityMainType,
  subtypeId: string
): SubtypeConfig | undefined {
  return SUBTYPES_BY_MAIN_TYPE[mainType]?.find((s) => s.id === subtypeId)
}

// --- Müdür Ataması ---
export function getPrincipalByGrade(grade: string): string {
  const num = parseInt(grade.replace(/\D/g, ""), 10)
  if (isNaN(num)) return "Ferhan Altınkaya Erdem"
  if (num >= 5 && num <= 8) return "Ferhan Altınkaya Erdem"
  if (num >= 9 && num <= 12) return "Ramazan Koçali"
  return "Ferhan Altınkaya Erdem"
}

// --- Dil Yeterlilik Seviyeleri ---
export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number]

// --- Başarı Belgesi Metin Şablonu ---
export function formatAchievementText(score: number, level: string): string {
  return `The participant has successfully completed the language education program and achieved a score of ${score} out of 100. Based on this evaluation, their proficiency level has been determined as ${level}.`
}

// --- Süre Dropdown Seçenekleri ---
export const DURATION_OPTIONS = {
  hours: Array.from({ length: 23 }, (_, i) => i + 1),   // 1-23
  days: Array.from({ length: 30 }, (_, i) => i + 1),    // 1-30
  months: Array.from({ length: 12 }, (_, i) => i + 1),  // 1-12
  years: Array.from({ length: 10 }, (_, i) => i + 1),   // 1-10
}
