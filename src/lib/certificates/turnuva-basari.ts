/**
 * LEVENT COLLEGE IB PROGRAMME — CERTIFICATE OF TOURNAMENT ACHIEVEMENT
 */

import { getPrincipalByGrade } from "@/lib/activity-types-config"

export interface TurnuvaBasariParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  placement: string
}

export interface TurnuvaBasariCertData {
  tournamentDescription: string
  totalParticipants: number
  startDate: string
  endDate: string
  teacherName: string
  createdAt: string
  participants: TurnuvaBasariParticipant[]
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

function achievementParagraph(placement: string, total: number): string {
  const p = esc(placement.trim())
  const t = String(total)
  return `The participant successfully achieved a <strong>${p}</strong> place in the tournament, which was conducted with a total of <strong>${t}</strong> participants. Throughout the competition, they demonstrated strong effort, skill, and determination. The evidence of their performance and results is provided in the attached file.`
}

function page(data: TurnuvaBasariCertData, p: TurnuvaBasariParticipant, idx: number): string {
  const principal = getPrincipalByGrade(p.grade)
  const certDate = formatDate(data.createdAt)
  const period = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
  const suffix = `${idx.toString(36).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-5)}`

  return `
  <div class="cert-page">
    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT KOLEJİ</div>
        <div class="cert-doc-title">LEVENT COLLEGE IB PROGRAMME</div>
        <div class="cert-doc-subtitle">CERTIFICATE OF TOURNAMENT ACHIEVEMENT</div>
      </div>
    </div>

    <div class="cert-divider"></div>

    <div class="cert-body">
      <div class="cert-achievement-box">
        <p class="cert-achievement-text">${achievementParagraph(p.placement, data.totalParticipants)}</p>
      </div>

      <table class="cert-fields">
        <tr>
          <td class="lbl">Participant Name &amp; Surname</td>
          <td class="val">${esc(`${p.firstName} ${p.lastName}`)}</td>
        </tr>
        <tr>
          <td class="lbl">Tournament Description</td>
          <td class="val">${esc(data.tournamentDescription)}</td>
        </tr>
        <tr>
          <td class="lbl">Participant TR ID No</td>
          <td class="val">${esc(p.tcNumber)}</td>
        </tr>
        <tr>
          <td class="lbl">Tournament Start and Completion Date</td>
          <td class="val">${esc(period)}</td>
        </tr>
        <tr>
          <td class="lbl">Teacher Name &amp; Surname</td>
          <td class="val">${esc(data.teacherName)}</td>
        </tr>
        <tr>
          <td class="lbl">Principal Name &amp; Surname</td>
          <td class="val">${esc(principal)}</td>
        </tr>
      </table>

      <div class="cert-signatures">
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-cap">Teacher Signature</div>
        </div>
        <div class="sig-col">
          <div class="sig-seal">STAMP</div>
          <div class="sig-cap">Principal's Signature / Stamp</div>
        </div>
      </div>

      <p class="cert-date-line"><strong>Date:</strong> ${esc(certDate)}</p>
    </div>

    <div class="cert-foot">Certificate Ref: LK-TA-${suffix}</div>
  </div>`
}

export function buildTurnuvaBasariCertificateHTML(data: TurnuvaBasariCertData): string {
  if (!data.participants.length) {
    return ""
  }
  const pages = data.participants.map((p, i) => page(data, p, i)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate of Tournament Achievement</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #e5e7eb; font-family: 'Source Sans 3', sans-serif; }
    .cert-page {
      width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 20mm;
      background: #fff; position: relative; page-break-after: always;
      border: 3px double #0369a1;
    }
    .cert-header { display: flex; gap: 14px; align-items: center; margin-bottom: 10px; }
    .cert-school-logo { width: 52px; height: 52px; flex-shrink: 0; }
    .logo-img { width: 52px; height: 52px; object-fit: contain; }
    .cert-school-name {
      font-family: 'Crimson Pro', serif; font-size: 20px; font-weight: 700;
      color: #075985; letter-spacing: 2px;
    }
    .cert-doc-title { font-size: 11px; font-weight: 700; color: #0c4a6e; letter-spacing: 1.2px; margin-top: 4px; }
    .cert-doc-subtitle { font-size: 10px; font-weight: 600; color: #0284c7; margin-top: 2px; letter-spacing: 0.8px; }
    .cert-divider { height: 2px; background: linear-gradient(90deg, #075985, #38bdf8, #075985); margin: 12px 0 18px; }
    .cert-body { color: #1e293b; }
    .cert-achievement-box {
      padding: 14px 16px; background: #f0f9ff; border-left: 4px solid #0284c7;
      border-radius: 0 8px 8px 0; margin-bottom: 22px;
    }
    .cert-achievement-text { font-size: 12.5px; line-height: 1.7; text-align: justify; }
    .cert-fields { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 28px; }
    .cert-fields tr { border-bottom: 1px solid #e2e8f0; }
    .cert-fields td { padding: 10px 8px; vertical-align: top; }
    .cert-fields .lbl { width: 38%; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
    .cert-fields .val { color: #0f172a; font-weight: 500; }
    .cert-signatures { display: flex; justify-content: space-between; gap: 24px; margin-top: 36px; margin-bottom: 16px; }
    .sig-col { flex: 1; text-align: center; }
    .sig-line { height: 1px; background: #334155; margin: 40px 8px 8px; }
    .sig-seal {
      height: 64px; margin: 8px auto 8px; max-width: 64px; border: 2px dashed #0284c7; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: #075985;
    }
    .sig-cap { font-size: 10px; color: #64748b; }
    .cert-date-line { font-size: 11px; text-align: center; margin-top: 8px; color: #475569; }
    .cert-foot { text-align: center; font-size: 8px; color: #cbd5e1; margin-top: 14px; letter-spacing: 0.5px; }
    @media print { body { background: #fff; } .cert-page { border: none; } }
  </style>
</head>
<body>${pages}</body>
</html>`
}
