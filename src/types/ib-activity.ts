/**
 * IB Faaliyet Ekle modülü - Veri modelleri
 * Diyagrama göre: Eğitim, Etkinlik, Spor, Yarışma
 */

export type IbActivityType = "education" | "event" | "sport" | "competition"

/** Ortak alanlar - tüm faaliyet türlerinde */
export interface IbActivityCommon {
  /** Katılımcı öğrenci ID listesi */
  participantIds: string[]
  /** Başlangıç tarihi (ISO) */
  startDate: string
  /** Bitiş tarihi (ISO) */
  endDate: string
  /** Organizatör / Eğitmen adı */
  organizer: string
  /** Açıklama, sonuç ve kazanım */
  description: string
  /** Faaliyet başlığı (liste ve raporlarda) */
  title: string
}

/** Eğitim - özel alanlar */
export interface IbEducationSpecific {
  /** Eğitim türü (seçim) */
  educationType: string
  /** Eğitim süresi (gün/saat/dakika) */
  durationDays: string
  durationHours: string
  durationMinutes: string
  /** Müfredat PDF şablon verisi */
  curriculumPdfContent: Record<string, unknown>
  /** Sertifika belgesi PDF şablon verisi (katılımcı bazlı) */
  certificatePdfContent: Record<string, unknown>
  /** Başarı belgesi PDF şablon verisi */
  achievementPdfContent: Record<string, unknown>
}

/** Etkinlik - özel alanlar */
export interface IbEventSpecific {
  /** Etkinlik türü (seçim) */
  eventType: string
  /** Etkinlik süresi */
  duration: string
  /** Etkinlik tanımı */
  eventDefinition: string
  /** Katılım belgesi PDF içeriği */
  participationPdfContent: Record<string, unknown>
}

/** Spor - özel alanlar */
export interface IbSportSpecific {
  /** Spor türü (seçim) */
  sportType: string
  /** Öğrenci lisans dosyası URL (upload) */
  studentLicenseUrl: string
  /** Katılım belgesi PDF içeriği */
  participationPdfContent: Record<string, unknown>
  /** Sonuç belgesi PDF içeriği (opsiyonel) */
  resultPdfContent: Record<string, unknown>
}

/** Yarışma - özel alanlar */
export interface IbCompetitionSpecific {
  /** Yarışma / Proje tanımı */
  competitionDefinition: string
  /** Katılım belgesi PDF içeriği */
  participationPdfContent: Record<string, unknown>
  /** Sertifika PDF içeriği */
  certificatePdfContent: Record<string, unknown>
  /** Başarı belgesi PDF içeriği */
  achievementPdfContent: Record<string, unknown>
}

/** Tür bazlı birleşik form verisi */
export type IbActivityFormData =
  | { type: "education"; common: IbActivityCommon; specific: IbEducationSpecific }
  | { type: "event"; common: IbActivityCommon; specific: IbEventSpecific }
  | { type: "sport"; common: IbActivityCommon; specific: IbSportSpecific }
  | { type: "competition"; common: IbActivityCommon; specific: IbCompetitionSpecific }

/** Boş ortak alan varsayılanları */
export function emptyCommon(): IbActivityCommon {
  return {
    participantIds: [],
    startDate: "",
    endDate: "",
    organizer: "",
    description: "",
    title: "",
  }
}

export function emptyEducationSpecific(): IbEducationSpecific {
  return {
    educationType: "",
    durationDays: "",
    durationHours: "",
    durationMinutes: "",
    curriculumPdfContent: {},
    certificatePdfContent: {},
    achievementPdfContent: {},
  }
}

export function emptyEventSpecific(): IbEventSpecific {
  return {
    eventType: "",
    duration: "",
    eventDefinition: "",
    participationPdfContent: {},
  }
}

export function emptySportSpecific(): IbSportSpecific {
  return {
    sportType: "",
    studentLicenseUrl: "",
    participationPdfContent: {},
    resultPdfContent: {},
  }
}

export function emptyCompetitionSpecific(): IbCompetitionSpecific {
  return {
    competitionDefinition: "",
    participationPdfContent: {},
    certificatePdfContent: {},
    achievementPdfContent: {},
  }
}

/** Tür etiketleri (UI) */
export const IB_ACTIVITY_TYPE_LABELS: Record<IbActivityType, string> = {
  education: "Eğitim",
  event: "Etkinlik",
  sport: "Spor",
  competition: "Yarışma",
}

/** API'ye gönderilecek payload (mevcut Activity modeli ile uyumlu) */
export interface IbActivitySubmitPayload {
  studentIds: string[]
  type: string
  title: string
  description: string
  activityDate: string
  location?: string
  organizer: string
  duration?: number | null
  participants?: number | null
  outcome?: string
  evidence?: string
  activityFormData: Record<string, unknown>
}
