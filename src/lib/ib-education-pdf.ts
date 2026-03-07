/**
 * IB Eğitim faaliyeti PDF üretimi
 * - Faaliyet özeti + Müfredat (A4 dikey, sayfa sayfa)
 * - Sertifika ve Başarı Belgesi (A4 yatay, süslü şablon, katılımcı bazlı)
 */

import { PDFDocument } from "pdf-lib"
import { generatePDF } from "@/lib/pdf-generator"
import {
  EDUCATION_CURRICULUM_TEXTS,
  DEFAULT_CURRICULUM_TEXT,
  getPrincipalByGrade,
  formatAchievementDescription,
} from "@/lib/ib-education-config"

function escapeForHtml(s: string | null | undefined): string {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export interface EducationParticipant {
  id: string
  name: string
  tcNumber: string
  grade: string
}

export interface EducationActivityPayload {
  common: {
    title: string
    startDate: string
    endDate: string
    organizer: string
    description: string
    participantIds: string[]
  }
  specific: {
    educationType: string
    educationDescription: string
    teacherName: string
    successScore: number | ""
  }
  participants: EducationParticipant[]
}

const PAGE_STYLE = `
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1a1a1a; font-size: 12px; }
    .page-break { page-break-after: always; }
    .summary-title { font-size: 18px; font-weight: bold; margin-bottom: 16px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
    .summary-row { margin-bottom: 10px; }
    .summary-label { font-weight: bold; min-width: 180px; display: inline-block; }
    .curriculum-box { border: 1px solid #ddd; padding: 16px; background: #fafafa; white-space: pre-wrap; min-height: 800px; }
  </style>
`

function generateSummaryHTML(payload: EducationActivityPayload): string {
  const { common, specific } = payload
  const participantNames = payload.participants.map((p) => p.name).join(", ")
  const scoreText =
    specific.successScore !== "" && specific.successScore !== undefined
      ? `${specific.successScore} / 100`
      : "—"

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>${PAGE_STYLE}</head><body>
    <div class="summary-title">Faaliyet Özeti</div>
    <div class="summary-row"><span class="summary-label">Başlık:</span> ${escapeForHtml(common.title)}</div>
    <div class="summary-row"><span class="summary-label">Katılımcılar:</span> ${escapeForHtml(participantNames)}</div>
    <div class="summary-row"><span class="summary-label">Başlangıç Tarihi:</span> ${escapeForHtml(common.startDate)}</div>
    <div class="summary-row"><span class="summary-label">Bitiş Tarihi:</span> ${escapeForHtml(common.endDate)}</div>
    <div class="summary-row"><span class="summary-label">Organizatör / Eğitmen:</span> ${escapeForHtml(common.organizer)}</div>
    <div class="summary-row"><span class="summary-label">Eğitim Türü:</span> ${escapeForHtml(specific.educationType)}</div>
    <div class="summary-row"><span class="summary-label">Eğitim Açıklaması:</span> ${escapeForHtml(specific.educationDescription)}</div>
    <div class="summary-row"><span class="summary-label">Başarı Puanı:</span> ${scoreText}</div>
    <div class="summary-row"><span class="summary-label">Açıklama / Sonuç ve Kazanım:</span> ${escapeForHtml(common.description)}</div>
  </body></html>`
}

function generateCurriculumHTML(payload: EducationActivityPayload): string {
  const text =
    payload.specific.educationType &&
    EDUCATION_CURRICULUM_TEXTS[payload.specific.educationType]
      ? EDUCATION_CURRICULUM_TEXTS[payload.specific.educationType]
      : DEFAULT_CURRICULUM_TEXT

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>${PAGE_STYLE}</head><body>
    <div class="summary-title">Müfredat</div>
    <div class="curriculum-box">${escapeForHtml(text)}</div>
  </body></html>`
}

const CERTIFICATE_STYLE = `
  <style>
    body { margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; }
    .cert { width: 297mm; min-height: 210mm; padding: 20mm; position: relative; }
    .cert-border { position: absolute; inset: 12mm; border: 2px solid #b91c1c; border-radius: 8px; pointer-events: none; }
    .deco-top { position: absolute; top: 0; left: 0; right: 0; height: 45px; background: linear-gradient(135deg, #1e3a5f 0%, #1e3a5f 50%, transparent 50%), linear-gradient(225deg, #b8860b 0%, #b8860b 50%, transparent 50%); background-size: 60px 45px; background-repeat: repeat-x; opacity: 0.9; }
    .deco-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(45deg, #b8860b 0%, transparent 50%); background-size: 80px 40px; background-repeat: repeat-x; opacity: 0.7; }
    .logo-area { text-align: center; margin-bottom: 8px; }
    .logo-text { font-size: 14px; font-weight: bold; color: #1e3a5f; letter-spacing: 0.05em; }
    .program { font-size: 11px; color: #374151; margin-top: 2px; }
    .cert-title { font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase; color: #1e3a5f; margin: 12px 0 20px; letter-spacing: 0.02em; }
    .two-cols { display: flex; gap: 24px; margin-bottom: 16px; }
    .col { flex: 1; }
    .field-label { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
    .field-value { font-size: 11px; min-height: 18px; border-bottom: 1px solid #9ca3af; padding: 2px 0; }
    .achievement-p { text-align: center; font-size: 11px; line-height: 1.6; margin: 16px 0; max-width: 90%; margin-left: auto; margin-right: auto; }
    .sign-section { display: flex; justify-content: space-between; margin-top: 24px; gap: 40px; }
    .sign-box { flex: 1; }
    .sign-name { font-size: 10px; margin-bottom: 4px; }
    .sign-line { border-bottom: 1px solid #1a1a1a; height: 36px; margin-bottom: 4px; }
    .sign-label { font-size: 9px; color: #6b7280; }
    .date-row { text-align: center; margin-top: 16px; font-size: 10px; }
    .medal { text-align: center; margin-top: 16px; font-size: 24px; color: #b8860b; }
  </style>
`

function generateCertificateHTML(
  participant: EducationParticipant,
  payload: EducationActivityPayload
): string {
  const { common, specific } = payload
  const principalName = getPrincipalByGrade(participant.grade)
  const educationTypeLabel = specific.educationType
    ? specific.educationType.toUpperCase().replace(/\s+/g, " ")
    : "EDUCATION"
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>${CERTIFICATE_STYLE}</head><body>
  <div class="cert">
    <div class="cert-border"></div>
    <div class="deco-top"></div>
    <div class="deco-bottom"></div>
    <div class="logo-area">
      <div class="logo-text">LEVENT COLLEGE</div>
      <div class="program">LEVENT COLLEGE IB PROGRAMME</div>
    </div>
    <div class="cert-title">Certificate of ${escapeForHtml(educationTypeLabel)} Education</div>
    <div class="two-cols">
      <div class="col">
        <div class="field-label">Participant Name Surname:</div>
        <div class="field-value">${escapeForHtml(participant.name)}</div>
        <div class="field-label" style="margin-top:10px">Participant TR ID No:</div>
        <div class="field-value">${escapeForHtml(participant.tcNumber)}</div>
      </div>
      <div class="col">
        <div class="field-label">Education Description:</div>
        <div class="field-value">${escapeForHtml(specific.educationDescription)}</div>
        <div class="field-label" style="margin-top:10px">Education Start and Completion Date:</div>
        <div class="field-value">${escapeForHtml(common.startDate)} – ${escapeForHtml(common.endDate)}</div>
      </div>
    </div>
    <div class="achievement-p">
      The participant has successfully engaged in the education program. Evidence of their performance is provided in the attached file.
    </div>
    <div class="sign-section">
      <div class="sign-box">
        <div class="sign-name">Teacher Name Surname: ${escapeForHtml(specific.teacherName)}</div>
        <div class="sign-line"></div>
        <div class="sign-label">Teacher Signature:</div>
      </div>
      <div class="sign-box">
        <div class="sign-name">Principal Name Surname: ${escapeForHtml(principalName)}</div>
        <div class="sign-line"></div>
        <div class="sign-label">Principal's Signature/Stamp:</div>
      </div>
    </div>
    <div class="date-row"><strong>Date:</strong> ${escapeForHtml(dateStr)}</div>
    <div class="medal">🏅</div>
  </div>
  </body></html>`
}

function generateAchievementHTML(
  participant: EducationParticipant,
  payload: EducationActivityPayload
): string {
  const { common, specific } = payload
  const principalName = getPrincipalByGrade(participant.grade)
  const score =
    specific.successScore !== "" && specific.successScore !== undefined
      ? Number(specific.successScore)
      : 0
  const achievementText = score > 0 ? formatAchievementDescription(score) : "—"
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>${CERTIFICATE_STYLE}</head><body>
  <div class="cert">
    <div class="cert-border"></div>
    <div class="deco-top"></div>
    <div class="deco-bottom"></div>
    <div class="logo-area">
      <div class="logo-text">LEVENT COLLEGE</div>
      <div class="program">LEVENT COLLEGE IB PROGRAMME</div>
    </div>
    <div class="cert-title">Achievement Certificate</div>
    <div class="two-cols">
      <div class="col">
        <div class="field-label">Participant Name Surname:</div>
        <div class="field-value">${escapeForHtml(participant.name)}</div>
        <div class="field-label" style="margin-top:10px">Participant TR ID No:</div>
        <div class="field-value">${escapeForHtml(participant.tcNumber)}</div>
      </div>
      <div class="col">
        <div class="field-label">Education Description:</div>
        <div class="field-value">${escapeForHtml(specific.educationDescription)}</div>
        <div class="field-label" style="margin-top:10px">Education Start and Completion Date:</div>
        <div class="field-value">${escapeForHtml(common.startDate)} – ${escapeForHtml(common.endDate)}</div>
      </div>
    </div>
    <div class="achievement-p">${escapeForHtml(achievementText)}</div>
    <div class="sign-section">
      <div class="sign-box">
        <div class="sign-name">Teacher Name Surname: ${escapeForHtml(specific.teacherName)}</div>
        <div class="sign-line"></div>
        <div class="sign-label">Teacher Signature:</div>
      </div>
      <div class="sign-box">
        <div class="sign-name">Principal Name Surname: ${escapeForHtml(principalName)}</div>
        <div class="sign-line"></div>
        <div class="sign-label">Principal's Signature/Stamp:</div>
      </div>
    </div>
    <div class="date-row"><strong>Date:</strong> ${escapeForHtml(dateStr)}</div>
    <div class="medal">🏅</div>
  </div>
  </body></html>`
}

/**
 * Tüm sayfaları üretir ve tek PDF'de birleştirir:
 * 1. Faaliyet Özeti (A4 dikey)
 * 2. Müfredat (A4 dikey)
 * 3. Her katılımcı: Sertifika (A4 yatay) + Başarı Belgesi (A4 yatay)
 */
export async function generateEducationActivityPDF(
  payload: EducationActivityPayload
): Promise<Uint8Array> {
  const pdfBuffers: Buffer[] = []

  const summaryHtml = generateSummaryHTML(payload)
  const summaryPdf = await generatePDF(summaryHtml, { format: "A4", landscape: false })
  pdfBuffers.push(Buffer.from(summaryPdf))

  const curriculumHtml = generateCurriculumHTML(payload)
  const curriculumPdf = await generatePDF(curriculumHtml, { format: "A4", landscape: false })
  pdfBuffers.push(Buffer.from(curriculumPdf))

  for (const participant of payload.participants) {
    const certHtml = generateCertificateHTML(participant, payload)
    const certPdf = await generatePDF(certHtml, {
      format: "A4",
      landscape: true,
      margin: { top: "8mm", right: "10mm", bottom: "8mm", left: "10mm" },
    })
    pdfBuffers.push(Buffer.from(certPdf))

    const achieveHtml = generateAchievementHTML(participant, payload)
    const achievePdf = await generatePDF(achieveHtml, {
      format: "A4",
      landscape: true,
      margin: { top: "8mm", right: "10mm", bottom: "8mm", left: "10mm" },
    })
    pdfBuffers.push(Buffer.from(achievePdf))
  }

  const mergedPdf = await PDFDocument.create()
  for (const buf of pdfBuffers) {
    const doc = await PDFDocument.load(buf)
    const pages = await mergedPdf.copyPages(doc, doc.getPageIndices())
    pages.forEach((p) => mergedPdf.addPage(p))
  }
  return await mergedPdf.save()
}
