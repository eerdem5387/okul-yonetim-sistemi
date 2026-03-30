/**
 * Hentbol Eğitimi Katılım Sertifikası
 * Certificate of Handball Education Participation — English PDF
 */

export interface HentbolEgitimParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  score: number
}

export interface HentbolEgitimCertData {
  title: string
  educationDescription: string
  startDate: string
  endDate: string
  teacherName: string
  organizerName: string
  createdAt: string
  participants: HentbolEgitimParticipant[]
}

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

function getPerformanceLevel(score: number): string {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Very Good"
  if (score >= 60) return "Good"
  if (score >= 50) return "Satisfactory"
  return "Needs Improvement"
}

function levelClass(level: string): string {
  const map: Record<string, string> = {
    Excellent: "lvl-excellent",
    "Very Good": "lvl-very-good",
    Good: "lvl-good",
    Satisfactory: "lvl-satisfactory",
    "Needs Improvement": "lvl-needs-improvement",
  }
  return map[level] ?? "lvl-needs-improvement"
}

function participantPage(
  data: HentbolEgitimCertData,
  participant: HentbolEgitimParticipant,
  pageIndex: number
): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
  const level = getPerformanceLevel(participant.score)
  const certSuffix = `${pageIndex.toString(36).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-5)}`

  return `
  <div class="cert-page">
    <div class="cert-accent-line"></div>

    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent Kolej" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT KOLEJİ</div>
        <div class="cert-school-subtitle">IB Programme · Handball</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">CERTIFICATE OF HANDBALL EDUCATION PARTICIPATION</div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">Handball Training Participation</h1>
      <p class="cert-subtitle">${data.title}</p>
    </div>

    <div class="cert-body">
      <p class="cert-presented">This certificate is presented to:</p>
      <div class="cert-participant-name">${participant.firstName} ${participant.lastName}</div>
      <p class="cert-id-line">TR ID No: <strong>${participant.tcNumber}</strong></p>

      <div class="cert-info-row">
        <span class="cert-info-label">Programme Name:</span>
        <span class="cert-info-value">LEVENT COLLEGE IB</span>
        <span class="cert-info-sep">·</span>
        <span class="cert-info-label">Programme Duration:</span>
        <span class="cert-info-value">40 weeks</span>
      </div>
      <div class="cert-info-row" style="margin-bottom: 12px;">
        <span class="cert-info-label">Instructor Name:</span>
        <span class="cert-info-value">${data.teacherName}</span>
      </div>

      <div class="cert-details-grid">
        <div class="cert-detail-item">
          <span class="cert-detail-label">Education Programme</span>
          <span class="cert-detail-value">${data.educationDescription}</span>
        </div>
        <div class="cert-detail-item">
          <span class="cert-detail-label">Training Period</span>
          <span class="cert-detail-value">${periodStr}</span>
        </div>
        <div class="cert-detail-item">
          <span class="cert-detail-label">Organized by</span>
          <span class="cert-detail-value">${data.organizerName}</span>
        </div>
      </div>

      <div class="cert-achievement-box">
        <p class="cert-achievement-text">
          The participant has successfully completed the Levent College IB handball annual training
          programme and achieved a score of <strong>${participant.score}</strong> out of
          <strong>100</strong>.
          Based on technical, tactical, and physical criteria assessed throughout the programme,
          their performance level has been determined as <strong>${level}</strong>.
        </p>
      </div>

      <div class="cert-level-badge-row">
        <div class="cert-level-badge ${levelClass(level)}">${level}</div>
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
      Certificate No: LK-HB-${certSuffix}
    </div>
  </div>`
}

export function buildHentbolEgitimCertificateHTML(data: HentbolEgitimCertData): string {
  const pages = data.participants.map((p, i) => participantPage(data, p, i)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Handball Education Participation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: 'Inter', sans-serif; }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 15mm 17mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .cert-page::before {
      content: '';
      position: absolute;
      top: 7mm; left: 7mm; right: 7mm; bottom: 7mm;
      border: 2px solid #991b1b;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 9mm; left: 9mm; right: 9mm; bottom: 9mm;
      border: 1px solid #fca5a5;
      pointer-events: none;
      z-index: 0;
    }

    .cert-accent-line {
      position: absolute;
      top: 50%;
      left: 10mm;
      right: 10mm;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(185, 28, 28, 0.07), transparent);
      pointer-events: none;
      z-index: 0;
    }

    .cert-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 6px;
      position: relative;
      z-index: 1;
    }
    .cert-school-logo { width: 58px; height: 58px; flex-shrink: 0; }
    .logo-img { width: 58px; height: 58px; object-fit: contain; }
    .cert-school-info { flex: 1; }
    .cert-school-name {
      font-family: 'Playfair Display', serif;
      font-size: 21px;
      font-weight: 700;
      color: #7f1d1d;
      letter-spacing: 1.5px;
    }
    .cert-school-subtitle {
      font-size: 10px;
      color: #b91c1c;
      letter-spacing: 1.3px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #7f1d1d 100%);
      margin: 8px 0;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #7f1d1d 0%, #f87171 50%, #7f1d1d 100%);
      margin: 12px 0 8px;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }

    .cert-badge-row { display: flex; justify-content: center; margin: 6px 0; position: relative; z-index: 1; }
    .cert-badge {
      background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);
      color: #fee2e2;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      padding: 5px 18px;
      border-radius: 20px;
    }

    .cert-title-block { text-align: center; margin: 8px 0 14px; position: relative; z-index: 1; }
    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: #7f1d1d;
      line-height: 1.25;
    }
    .cert-subtitle {
      font-size: 13px;
      color: #b91c1c;
      margin-top: 4px;
      font-style: italic;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

    .cert-presented {
      text-align: center;
      font-size: 12px;
      color: #78716c;
      margin-bottom: 4px;
    }
    .cert-participant-name {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 27px;
      font-weight: 700;
      color: #7f1d1d;
      padding-bottom: 6px;
      border-bottom: 2px solid #f87171;
    }
    .cert-id-line {
      text-align: center;
      font-size: 11px;
      color: #78716c;
      margin: 8px 0 10px;
    }

    .cert-info-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 3px;
    }
    .cert-info-label {
      font-size: 10px;
      font-weight: 600;
      color: #78716c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cert-info-value { font-size: 12px; font-weight: 500; color: #450a0a; }
    .cert-info-sep { color: #d6d3d1; }

    .cert-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
      padding: 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
    }
    .cert-detail-item { display: flex; flex-direction: column; gap: 3px; }
    .cert-detail-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #a8a29e;
    }
    .cert-detail-value {
      font-size: 11px;
      font-weight: 500;
      color: #450a0a;
      line-height: 1.4;
    }

    .cert-achievement-box {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-left: 4px solid #dc2626;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
    }
    .cert-achievement-text {
      font-size: 12.5px;
      line-height: 1.65;
      color: #44403c;
    }

    .cert-level-badge-row { display: flex; justify-content: center; margin-bottom: 6px; }
    .cert-level-badge {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      padding: 5px 20px;
      border-radius: 4px;
      border: 2px solid currentColor;
    }
    .lvl-excellent     { color: #7f1d1d; background: #fef2f2; border-color: #991b1b; }
    .lvl-very-good     { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
    .lvl-good          { color: #991b1b; background: #fef2f2; border-color: #dc2626; }
    .lvl-satisfactory  { color: #a16207; background: #fefce8; border-color: #ca8a04; }
    .lvl-needs-improvement { color: #b91c1c; background: #fef2f2; border-color: #dc2626; }

    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .cert-sign-col { width: 38%; text-align: center; }
    .cert-sign-line { height: 1px; background: #44403c; margin-bottom: 5px; }
    .cert-sign-name { font-size: 12px; font-weight: 600; color: #7f1d1d; }
    .cert-sign-title { font-size: 10px; color: #78716c; margin-top: 2px; }
    .cert-sign-date { font-size: 9px; color: #a8a29e; margin-top: 3px; }

    .cert-seal-col { display: flex; justify-content: center; align-items: center; }
    .cert-seal-circle {
      width: 66px;
      height: 66px;
      border: 2px dashed #dc2626;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cert-seal-text {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #991b1b;
      text-align: center;
      line-height: 1.3;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 8px;
      color: #d6d3d1;
      margin-top: 8px;
      letter-spacing: 0.8px;
      position: relative;
      z-index: 1;
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
