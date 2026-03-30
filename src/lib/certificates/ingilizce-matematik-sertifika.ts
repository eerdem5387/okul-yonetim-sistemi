/**
 * LEVENT COLLEGE IB PROGRAMME
 * Certificate of English Mathematics Education
 * İngilizce Matematik Eğitimi Sertifikası — HTML Şablonu
 */

export interface MatematikCertParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  score: number
}

export interface MatematikCertData {
  title: string
  educationDescription: string
  startDate: string
  endDate: string
  teacherName: string
  organizerName: string
  createdAt: string
  participants: MatematikCertParticipant[]
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

function getAchievementLevel(score: number): string {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Very Good"
  if (score >= 60) return "Good"
  if (score >= 50) return "Satisfactory"
  return "Needs Improvement"
}

function participantPage(data: MatematikCertData, participant: MatematikCertParticipant): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
  const achievementLevel = getAchievementLevel(participant.score)

  return `
  <div class="cert-page">
    <div class="cert-watermark">∑</div>

    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent Kolej" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT KOLEJİ</div>
        <div class="cert-school-subtitle">IB Programme · Mathematics Department</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">CERTIFICATE OF ENGLISH MATHEMATICS EDUCATION</div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">English Mathematics Education Certificate</h1>
      <p class="cert-subtitle">${data.title}</p>
    </div>

    <div class="cert-body">
      <p class="cert-presented">This certificate is proudly presented to:</p>
      <div class="cert-participant-name">${participant.firstName} ${participant.lastName}</div>
      <p class="cert-id-line">TR ID No: <strong>${participant.tcNumber}</strong></p>

      <div class="cert-info-row">
        <span class="cert-info-label">Programme Name:</span>
        <span class="cert-info-value">LEVENT COLLEGE IB</span>
        <span class="cert-info-sep">·</span>
        <span class="cert-info-label">Programme Duration:</span>
        <span class="cert-info-value">20 weeks</span>
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
          The participant has successfully engaged in the mathematics education program and
          received a score of <strong>${participant.score}</strong> out of
          <strong>100</strong>.
          Based on this result, their achievement level has been determined as
          <strong>${achievementLevel}</strong>.
        </p>
      </div>

      <div class="cert-level-badge-row">
        <div class="cert-level-badge cert-level-${achievementLevel.toLowerCase().replace(" ", "-")}">
          ${achievementLevel}
        </div>
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
      Certificate No: LK-MAT-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildMatematikCertificateHTML(data: MatematikCertData): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of English Mathematics Education</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; font-family: 'Inter', sans-serif; }

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
      overflow: hidden;
    }

    /* Çift çerçeve — mavi/matematik teması */
    .cert-page::before {
      content: '';
      position: absolute;
      top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
      border: 2px solid #1565c0;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
      border: 1px solid #90caf9;
      pointer-events: none;
      z-index: 0;
    }

    /* Sigma su damgası */
    .cert-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-15deg);
      font-size: 220px;
      color: rgba(21, 101, 192, 0.04);
      pointer-events: none;
      z-index: 0;
      user-select: none;
      font-family: 'Playfair Display', serif;
    }

    .cert-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .cert-school-logo { width: 64px; height: 64px; flex-shrink: 0; }
    .logo-img { width: 64px; height: 64px; object-fit: contain; }
    .cert-school-info { flex: 1; }
    .cert-school-name {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #0d47a1;
      letter-spacing: 2px;
    }
    .cert-school-subtitle {
      font-size: 11px;
      color: #42a5f5;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #1565c0 0%, #64b5f6 50%, #1565c0 100%);
      margin: 10px 0;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #1565c0 0%, #64b5f6 50%, #1565c0 100%);
      margin: 14px 0 10px;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }

    .cert-badge-row {
      display: flex;
      justify-content: center;
      margin: 8px 0;
      position: relative;
      z-index: 1;
    }
    .cert-badge {
      background: #0d47a1;
      color: #90caf9;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      padding: 4px 18px;
      border-radius: 20px;
    }

    .cert-title-block {
      text-align: center;
      margin: 12px 0 18px;
      position: relative;
      z-index: 1;
    }
    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: #0d47a1;
      line-height: 1.3;
    }
    .cert-subtitle {
      font-size: 13px;
      color: #42a5f5;
      margin-top: 6px;
      font-style: italic;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

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
      color: #0d47a1;
      margin-bottom: 4px;
      border-bottom: 2px solid #64b5f6;
      display: inline-block;
      width: 100%;
      padding-bottom: 4px;
    }
    .cert-id-line {
      text-align: center;
      font-size: 12px;
      color: #546e7a;
      margin-top: 6px;
      margin-bottom: 10px;
    }

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
      color: #0d47a1;
    }
    .cert-info-sep { font-size: 12px; color: #9e9e9e; flex-shrink: 0; }

    .cert-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      padding: 14px;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 8px;
    }
    .cert-detail-item { display: flex; flex-direction: column; gap: 4px; }
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
      color: #0d47a1;
      line-height: 1.4;
    }

    .cert-achievement-box {
      background: linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%);
      border-left: 4px solid #1565c0;
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
    }
    .cert-achievement-text {
      font-size: 13px;
      line-height: 1.7;
      color: #37474f;
    }

    .cert-level-badge-row {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }
    .cert-level-badge {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 24px;
      border-radius: 24px;
      border: 2px solid currentColor;
    }
    .cert-level-excellent       { color: #1b5e20; background: #e8f5e9; }
    .cert-level-very-good       { color: #1565c0; background: #e3f2fd; }
    .cert-level-good            { color: #e65100; background: #fff3e0; }
    .cert-level-satisfactory    { color: #6a1b9a; background: #f3e5f5; }
    .cert-level-needs-improvement { color: #b71c1c; background: #ffebee; }

    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .cert-sign-col { width: 38%; text-align: center; }
    .cert-sign-line { height: 1px; background: #424242; margin-bottom: 6px; }
    .cert-sign-name { font-size: 13px; font-weight: 600; color: #0d47a1; }
    .cert-sign-title { font-size: 11px; color: #546e7a; margin-top: 2px; }
    .cert-sign-date { font-size: 10px; color: #9e9e9e; margin-top: 4px; }

    .cert-seal-col { display: flex; justify-content: center; align-items: center; }
    .cert-seal-circle {
      width: 72px;
      height: 72px;
      border: 2px dashed #1565c0;
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
      color: #1565c0;
      text-align: center;
      line-height: 1.4;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 9px;
      color: #bdbdbd;
      margin-top: 10px;
      letter-spacing: 1px;
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
