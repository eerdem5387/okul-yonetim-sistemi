/**
 * IB Sertifika / Katılım / Başarı belgesi – alan değerlerini faaliyet ve öğrenciden doldurur.
 * Principal: 5-8 Ferhan Altınkaya Erdem, 9-12 Ramazan Koçali.
 */

import { getBelgeTanimi, fillOutcomeTemplate } from "@/lib/ib-belge-tanimlari"
import {
  getPrincipalByGrade,
  EGITIM_SUBTYPE_BELGE_IDS,
  CATEGORY_DOCUMENTS,
  type CategoryId,
} from "@/lib/ib-activity-config"

/** Etkinlik/spor/yarışma için kullanılan genel belge id'leri */
const ETKINLIK_KATILIM_BELGE_ID = "proje_katilim_belgesi"
const SPOR_YARISMA_KATILIM_BELGE_ID = "turnuva_katilim_belgesi"
const SPOR_YARISMA_BASARI_BELGE_ID = "turnuva_basari_belgesi"

/**
 * Faaliyet kategorisi ve alt türüne göre sertifika/katılım sayfası için belge id.
 * Eğitim: EGITIM_SUBTYPE_BELGE_IDS[subtype][1]. Etkinlik/spor/yarışma: genel katılım/başarı belgeleri.
 */
export function getCertificateBelgeIdForActivity(
  category: CategoryId,
  subtype: string
): string | null {
  if (category === "egitim" && subtype && EGITIM_SUBTYPE_BELGE_IDS[subtype]) {
    return EGITIM_SUBTYPE_BELGE_IDS[subtype][1]
  }
  if (category === "etkinlik") return ETKINLIK_KATILIM_BELGE_ID
  if (category === "spor" || category === "yarisma") return SPOR_YARISMA_KATILIM_BELGE_ID
  return null
}

/**
 * Bu faaliyet için üretilecek belge sayfaları: sertifika (veya katılım) + isteğe bağlı başarı/sonuç belgesi.
 * Eğitim: aynı belge ile katılım + başarı (outcome). Spor/yarışma: katılım + turnuva_basari_belgesi (outcome).
 */
export function getCertificatePagesForActivity(
  category: CategoryId,
  subtype: string,
  hasSuccessScore: boolean
): { belgeId: string; withOutcome: boolean }[] {
  const belgeId = getCertificateBelgeIdForActivity(category, subtype)
  if (!belgeId) return []

  const docs = CATEGORY_DOCUMENTS[category] || []
  const pages: { belgeId: string; withOutcome: boolean }[] = []

  if (docs.includes("sertifika") || docs.includes("katilim_belgesi")) {
    pages.push({ belgeId, withOutcome: false })
  }
  if (docs.includes("basari_belgesi") || docs.includes("sonuc_belgesi")) {
    if (hasSuccessScore) {
      const basariBelgeId =
        category === "spor" || category === "yarisma"
          ? SPOR_YARISMA_BASARI_BELGE_ID
          : belgeId
      pages.push({ belgeId: basariBelgeId, withOutcome: true })
    }
  }

  if (pages.length === 0) {
    pages.push({ belgeId, withOutcome: false })
  }
  return pages
}

export interface CertificateDataInput {
  /** Öğrenci ad, soyad, tcNumber, grade */
  student: { firstName: string; lastName: string; tcNumber?: string | null; grade: string }
  /** Faaliyet: title, organizer, activityDate; certificateData içinde ek alanlar */
  activity: {
    title: string
    organizer: string | null
    activityDate: Date
  }
  /** certificateData (category, subtype, teacherName, educationDescription, educationStartEndDate, successScore vb.) */
  certificateData: Record<string, unknown> | null
  /** Dil */
  language: "tr" | "en"
  /** Başarı belgesi için puan (1-100); yoksa outcome paragrafı boş/sadece katılım */
  successScore?: number | null
}

/** Tarih formatı */
function formatDateRange(startStr: string | undefined, endStr: string | undefined, lang: "tr" | "en"): string {
  if (!startStr && !endStr) return ""
  const fmt = (s: string) => {
    const d = new Date(s)
    if (lang === "tr") return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }
  if (startStr && endStr) return `${fmt(startStr)} - ${fmt(endStr)}`
  return startStr ? fmt(startStr) : endStr ? fmt(endStr) : ""
}

/**
 * Belge id ve giriş verilerine göre doldurulmuş alan değerleri (key → value).
 * getBelgeTanimi(belgeId).fields içindeki her key için değer üretir.
 */
export function buildCertificateFieldValues(
  belgeId: string,
  input: CertificateDataInput
): Record<string, string> {
  const belge = getBelgeTanimi(belgeId)
  if (!belge) return {}

  const { student, activity, certificateData, language } = input
  const cert = (certificateData || {}) as Record<string, unknown>
  const participantName = `${student.firstName} ${student.lastName}`.trim()
  const participantTrId = student.tcNumber ?? ""
  const principalName = getPrincipalByGrade(student.grade)
  const teacherName = (cert.teacherName as string) ?? activity.organizer ?? ""
  const educationDescription = (cert.educationDescription as string) ?? activity.title ?? ""
  const startDate = cert.educationStartEndDateStart as string | undefined
  const endDate = cert.educationStartEndDateEnd as string | undefined
  const educationStartEndDate =
    (cert.educationStartEndDate as string) || formatDateRange(startDate, endDate, language)
  const dateIssued = activity.activityDate
    ? activity.activityDate.toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : ""

  const valueMap: Record<string, string> = {
    participantName,
    participantTrId,
    principalName,
    teacherName,
    educationDescription,
    educationStartEndDate,
    date: dateIssued,
    dateOfImplementation: educationStartEndDate || dateIssued,
    approvalDate: dateIssued,
    teacherSignature: "",
    principalSignature: "",
    vicePrincipalName: "",
    vicePrincipalSignature: "",
    eventName: activity.title,
    numberOfParticipants: String(cert.numberOfParticipants ?? ""),
    numberOfArtworks: String(cert.numberOfArtworks ?? ""),
    instructorName: teacherName,
    tripDescription: educationDescription,
    tripStartEndDate: educationStartEndDate,
    artworkDescription: educationDescription,
    artworkStartEndDate: educationStartEndDate,
    tournamentDescription: educationDescription,
    tournamentStartEndDate: educationStartEndDate,
    requestDate: dateIssued,
    requestedBy: teacherName,
    processStartDate: educationStartEndDate,
    contactInfo: "",
    parentName: "",
    parentSurname: "",
    parentSignature: "",
  }

  const out: Record<string, string> = {}
  for (const f of belge.fields) {
    out[f.key] = valueMap[f.key] ?? ""
  }
  return out
}

/**
 * Belge için outcome paragrafı (puan/seviye). Başarı belgesi için successScore verilirse doldurulur.
 */
export function buildCertificateOutcomeParagraph(
  belgeId: string,
  input: CertificateDataInput,
  successScore: number | null | undefined
): string {
  const belge = getBelgeTanimi(belgeId)
  if (!belge?.outcomeTemplateEN) return ""

  const isTR = input.language === "tr"
  const template = isTR ? belge.outcomeTemplateTR : belge.outcomeTemplateEN
  if (!template) return ""

  if (successScore != null && !Number.isNaN(Number(successScore))) {
    const score = Math.min(100, Math.max(0, Number(successScore)))
    const levelEN = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Pass" : "Needs Improvement"
    const levelTR = score >= 85 ? "Mükemmel" : score >= 70 ? "İyi" : score >= 50 ? "Geçer" : "Geliştirme Gerekiyor"
    return fillOutcomeTemplate(template, {
      Score: score,
      AchievementLevel: isTR ? levelTR : levelEN,
    })
  }
  return ""
}
