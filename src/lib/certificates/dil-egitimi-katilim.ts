/**
 * Language Education Participation Certificate
 * Dil Eğitimi Katılım Sertifikası — HTML Şablonu
 *
 * Her öğrenci için ayrı sayfa üretilir, hepsi tek PDF'de birleştirilir.
 */

export interface LanguageCertParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  score: number
  languageLevel: string
}

export interface LanguageCertData {
  title: string                    // Eğitim başlığı
  educationDescription: string     // Eğitim açıklaması
  startDate: string                // YYYY-MM-DD
  endDate: string                  // YYYY-MM-DD
  teacherName: string              // Sorumlu öğretmen / Instructor
  organizerName: string            // Organizatör kurum
  createdAt: string                // Oluşturulma tarihi (sertifika tarihi)
  participants: LanguageCertParticipant[]
}

// Sertifikada gösterilecek Programme bilgileri (sabit)
const PROGRAMME_NAME = "LEVENT COLLEGE IB"
const PROGRAMME_DURATION = "40 weeks"

function getPrincipalByGrade(grade: string): string {
  const num = parseInt((grade || "").replace(/\D/g, ""), 10)
  if (isNaN(num)) return "Ferhan Altınkaya Erdem"
  if (num >= 5 && num <= 8) return "Ferhan Altınkaya Erdem"
  if (num >= 9 && num <= 12) return "Ramazan Koçali"
  return "Ferhan Altınkaya Erdem"
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

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function participantPage(data: LanguageCertData, participant: LanguageCertParticipant): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`

  return `
  <div class="cert-page">
    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent College" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT COLLEGE</div>
        <div class="cert-school-subtitle">Language Education Programme</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">CERTIFICATE OF PARTICIPATION</div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">Language Education Participation Certificate</h1>
      <p class="cert-subtitle">${data.title}</p>
    </div>

    <div class="cert-body">
      <p class="cert-presented">This certificate is presented to:</p>
      <div class="cert-participant-name">${participant.firstName} ${participant.lastName}</div>
      <p class="cert-id-line">TR ID No: <strong>${participant.tcNumber}</strong></p>

      <div class="cert-info-row">
        <span class="cert-info-label">Programme Name:</span>
        <span class="cert-info-value">${PROGRAMME_NAME}</span>
        <span class="cert-info-sep">·</span>
        <span class="cert-info-label">Programme Duration:</span>
        <span class="cert-info-value">${PROGRAMME_DURATION}</span>
      </div>
      <div class="cert-info-row" style="margin-bottom: 14px;">
        <span class="cert-info-label">Instructor Name:</span>
        <span class="cert-info-value">${data.teacherName}</span>
      </div>

      <div class="cert-details-grid">
        <div class="cert-detail-item">
          <span class="cert-detail-label">Education Programme</span>
          <span class="cert-detail-value">${data.educationDescription}</span>
        </div>
        <div class="cert-detail-item">
          <span class="cert-detail-label">Education Start and Completion Date</span>
          <span class="cert-detail-value">${periodStr}</span>
        </div>
        <div class="cert-detail-item">
          <span class="cert-detail-label">Organized by</span>
          <span class="cert-detail-value">${data.organizerName}</span>
        </div>
      </div>

      <div class="cert-achievement-box">
        <p class="cert-achievement-text">
          The participant has successfully completed the language education program and
          achieved a score of <strong>${participant.score}</strong> out of
          <strong>100</strong>. Based on this evaluation, their proficiency level has been
          determined as <strong>${participant.languageLevel}</strong>.
        </p>
      </div>
    </div>

    <div class="cert-divider-bottom"></div>

    <div class="cert-footer">
      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${data.teacherName}</div>
        <div class="cert-sign-title">Instructor</div>
        <div class="cert-sign-date">Date: ${certDate}</div>
      </div>

      <div class="cert-seal-col">
        <div class="cert-seal-circle">
          <span class="cert-seal-text">OFFICIAL<br/>SEAL</span>
        </div>
      </div>

      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${principal}</div>
        <div class="cert-sign-title">School Principal</div>
        <div class="cert-sign-date">Date: ${certDate}</div>
      </div>
    </div>

    <div class="cert-cert-no">
      Certificate No: LK-${getOrdinal(participant.grade ? parseInt(participant.grade.replace(/\D/g, "")) || 0 : 0)}-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildLanguageCertificateHTML(data: LanguageCertData): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Language Education Participation Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #f5f5f5;
      font-family: 'Inter', sans-serif;
    }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 16mm 18mm;
      position: relative;
      page-break-after: always;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
    }

    .cert-page::before {
      content: '';
      position: absolute;
      top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
      border: 2px solid #c8a96e;
      pointer-events: none;
      z-index: 0;
    }

    .cert-page::after {
      content: '';
      position: absolute;
      top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
      border: 1px solid #e8d5a3;
      pointer-events: none;
      z-index: 0;
    }

    /* Header */
    .cert-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .cert-school-logo {
      width: 64px;
      height: 64px;
      flex-shrink: 0;
    }

    .logo-img {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }

    .cert-school-info {
      flex: 1;
    }

    .cert-school-name {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #1a237e;
      letter-spacing: 2px;
    }

    .cert-school-subtitle {
      font-size: 11px;
      color: #546e7a;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Dividers */
    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #c8a96e 0%, #1a237e 50%, #c8a96e 100%);
      margin: 10px 0;
      border-radius: 2px;
    }

    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #c8a96e 0%, #1a237e 50%, #c8a96e 100%);
      margin: 14px 0 10px;
      border-radius: 2px;
    }

    /* Badge */
    .cert-badge-row {
      display: flex;
      justify-content: center;
      margin: 8px 0;
    }

    .cert-badge {
      background: #1a237e;
      color: #c8a96e;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      padding: 4px 18px;
      border-radius: 20px;
    }

    /* Title block */
    .cert-title-block {
      text-align: center;
      margin: 12px 0 18px;
    }

    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: #1a237e;
      line-height: 1.3;
    }

    .cert-subtitle {
      font-size: 13px;
      color: #546e7a;
      margin-top: 6px;
      font-style: italic;
    }

    /* Body */
    .cert-body {
      flex: 1;
    }

    .cert-presented {
      text-align: center;
      font-size: 13px;
      color: #546e7a;
      margin-bottom: 6px;
    }

    .cert-participant-name {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #1a237e;
      margin-bottom: 4px;
      border-bottom: 2px solid #c8a96e;
      display: inline-block;
      width: 100%;
      padding-bottom: 4px;
    }

    .cert-id-line {
      text-align: center;
      font-size: 12px;
      color: #546e7a;
      margin-top: 6px;
      margin-bottom: 16px;
    }

    /* Info rows (Programme Name / Instructor) */
    .cert-info-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .cert-info-label {
      font-size: 11px;
      font-weight: 600;
      color: #546e7a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .cert-info-value {
      font-size: 12px;
      font-weight: 500;
      color: #1a237e;
    }

    .cert-info-sep {
      font-size: 12px;
      color: #9e9e9e;
      flex-shrink: 0;
    }

    .cert-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
      padding: 14px;
      background: #f8f9ff;
      border: 1px solid #e8eaf6;
      border-radius: 8px;
    }

    .cert-detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cert-detail-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9e9e9e;
    }

    .cert-detail-value {
      font-size: 12px;
      font-weight: 500;
      color: #1a237e;
      line-height: 1.4;
    }

    /* Achievement */
    .cert-achievement-box {
      background: linear-gradient(135deg, #e8eaf6 0%, #fce4ec 100%);
      border-left: 4px solid #c8a96e;
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
    }

    .cert-achievement-text {
      font-size: 13px;
      line-height: 1.7;
      color: #37474f;
    }

    /* Footer */
    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
    }

    .cert-sign-col {
      width: 38%;
      text-align: center;
    }

    .cert-sign-line {
      height: 1px;
      background: #424242;
      margin-bottom: 6px;
    }

    .cert-sign-name {
      font-size: 13px;
      font-weight: 600;
      color: #1a237e;
    }

    .cert-sign-title {
      font-size: 11px;
      color: #546e7a;
      margin-top: 2px;
    }

    .cert-sign-date {
      font-size: 10px;
      color: #9e9e9e;
      margin-top: 4px;
    }

    .cert-seal-col {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .cert-seal-circle {
      width: 72px;
      height: 72px;
      border: 2px dashed #c8a96e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cert-seal-text {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #c8a96e;
      text-align: center;
      line-height: 1.4;
    }

    /* Cert No */
    .cert-cert-no {
      text-align: center;
      font-size: 9px;
      color: #bdbdbd;
      margin-top: 10px;
      letter-spacing: 1px;
    }

    @media print {
      body { background: white; }
      .cert-page { border: none; margin: 0; }
    }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`
}
