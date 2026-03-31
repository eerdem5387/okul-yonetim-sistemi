/**
 * LEVENT COLLEGE IB PROGRAMME
 * Certificate of Artificial Intelligence Education
 * Yapay Zeka Eğitimi Sertifikası — HTML Şablonu
 */

export interface YapayZekaCertParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  score: number
}

export interface YapayZekaCertData {
  title: string
  educationDescription: string
  startDate: string
  endDate: string
  teacherName: string
  organizerName: string
  createdAt: string
  participants: YapayZekaCertParticipant[]
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

/** Puan → Proficiency Level (Yapay Zeka) */
function getProficiencyLevel(score: number): string {
  if (score >= 90) return "Expert"
  if (score >= 75) return "Advanced"
  if (score >= 60) return "Proficient"
  if (score >= 50) return "Developing"
  return "Beginner"
}

function proficiencyClass(level: string): string {
  const map: Record<string, string> = {
    Expert: "level-expert",
    Advanced: "level-advanced",
    Proficient: "level-proficient",
    Developing: "level-developing",
    Beginner: "level-beginner",
  }
  return map[level] ?? "level-beginner"
}

function participantPage(data: YapayZekaCertData, participant: YapayZekaCertParticipant): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
  const proficiency = getProficiencyLevel(participant.score)

  return `
  <div class="cert-page">
    <!-- Neural network arka plan deseni -->
    <div class="neural-bg">
      <svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
        <g stroke="rgba(124,58,237,0.06)" stroke-width="1" fill="none">
          <!-- Katman 1 nöronlar -->
          <circle cx="80"  cy="200" r="6" fill="rgba(124,58,237,0.06)"/>
          <circle cx="80"  cy="320" r="6" fill="rgba(124,58,237,0.06)"/>
          <circle cx="80"  cy="440" r="6" fill="rgba(124,58,237,0.06)"/>
          <!-- Katman 2 nöronlar -->
          <circle cx="240" cy="240" r="6" fill="rgba(124,58,237,0.06)"/>
          <circle cx="240" cy="360" r="6" fill="rgba(124,58,237,0.06)"/>
          <circle cx="240" cy="480" r="6" fill="rgba(124,58,237,0.06)"/>
          <!-- Katman 3 nöronlar -->
          <circle cx="400" cy="280" r="6" fill="rgba(124,58,237,0.06)"/>
          <circle cx="400" cy="400" r="6" fill="rgba(124,58,237,0.06)"/>
          <!-- Çıkış -->
          <circle cx="520" cy="340" r="8" fill="rgba(124,58,237,0.08)"/>
          <!-- Bağlantılar 1→2 -->
          <line x1="80" y1="200" x2="240" y2="240"/>
          <line x1="80" y1="200" x2="240" y2="360"/>
          <line x1="80" y1="320" x2="240" y2="240"/>
          <line x1="80" y1="320" x2="240" y2="360"/>
          <line x1="80" y1="320" x2="240" y2="480"/>
          <line x1="80" y1="440" x2="240" y2="360"/>
          <line x1="80" y1="440" x2="240" y2="480"/>
          <!-- Bağlantılar 2→3 -->
          <line x1="240" y1="240" x2="400" y2="280"/>
          <line x1="240" y1="240" x2="400" y2="400"/>
          <line x1="240" y1="360" x2="400" y2="280"/>
          <line x1="240" y1="360" x2="400" y2="400"/>
          <line x1="240" y1="480" x2="400" y2="400"/>
          <!-- Bağlantılar 3→çıkış -->
          <line x1="400" y1="280" x2="520" y2="340"/>
          <line x1="400" y1="400" x2="520" y2="340"/>
        </g>
      </svg>
    </div>

    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent College" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT COLLEGE</div>
        <div class="cert-school-subtitle">IB Programme · Artificial Intelligence</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">CERTIFICATE OF ARTIFICIAL INTELLIGENCE EDUCATION</div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">Artificial Intelligence Education Certificate</h1>
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
        <span class="cert-info-value">40 weeks</span>
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
          <strong>100</strong>.
          Based on this evaluation, their proficiency level has been determined as
          <strong>${proficiency}</strong>.
        </p>
      </div>

      <div class="cert-level-badge-row">
        <div class="cert-level-badge ${proficiencyClass(proficiency)}">
          ${proficiency}
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
      Certificate No: LK-AI-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildYapayZekaCertificateHTML(data: YapayZekaCertData): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Artificial Intelligence Education</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: 'Inter', sans-serif; }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 16mm 18mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Dış çerçeve — mor/AI teması */
    .cert-page::before {
      content: '';
      position: absolute;
      top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
      border: 2px solid #4c1d95;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
      border: 1px solid #c4b5fd;
      pointer-events: none;
      z-index: 0;
    }

    /* Neural network arka plan */
    .neural-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
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
      color: #3b0764;
      letter-spacing: 2px;
    }
    .cert-school-subtitle {
      font-size: 11px;
      color: #7c3aed;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #4c1d95 0%, #7c3aed 50%, #4c1d95 100%);
      margin: 10px 0;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #4c1d95 0%, #7c3aed 50%, #4c1d95 100%);
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
      background: #3b0764;
      color: #c4b5fd;
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 4px 18px;
      border-radius: 20px;
      font-family: 'Fira Code', monospace;
    }

    .cert-title-block {
      text-align: center;
      margin: 12px 0 18px;
      position: relative;
      z-index: 1;
    }
    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 23px;
      font-weight: 700;
      color: #3b0764;
      line-height: 1.3;
    }
    .cert-subtitle {
      font-size: 13px;
      color: #7c3aed;
      margin-top: 6px;
      font-style: italic;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

    .cert-presented {
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .cert-participant-name {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #3b0764;
      margin-bottom: 4px;
      border-bottom: 2px solid #7c3aed;
      display: inline-block;
      width: 100%;
      padding-bottom: 4px;
    }
    .cert-id-line {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      margin-top: 6px;
      margin-bottom: 10px;
      font-family: 'Fira Code', monospace;
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
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .cert-info-value {
      font-size: 12px;
      font-weight: 500;
      color: #3b0764;
    }
    .cert-info-sep { font-size: 12px; color: #9ca3af; flex-shrink: 0; }

    .cert-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      padding: 14px;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 8px;
    }
    .cert-detail-item { display: flex; flex-direction: column; gap: 4px; }
    .cert-detail-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9ca3af;
    }
    .cert-detail-value {
      font-size: 12px;
      font-weight: 500;
      color: #3b0764;
      line-height: 1.4;
    }

    .cert-achievement-box {
      background: linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 100%);
      border-left: 4px solid #4c1d95;
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
    }
    .cert-achievement-text {
      font-size: 13px;
      line-height: 1.7;
      color: #374151;
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
      border-radius: 4px;
      border: 2px solid currentColor;
      font-family: 'Fira Code', monospace;
    }
    .level-expert     { color: #3b0764; background: #f5f3ff; border-color: #4c1d95; }
    .level-advanced   { color: #1e40af; background: #eff6ff; border-color: #1d4ed8; }
    .level-proficient { color: #92400e; background: #fffbeb; border-color: #b45309; }
    .level-developing { color: #065f46; background: #ecfdf5; border-color: #059669; }
    .level-beginner   { color: #9f1239; background: #fff1f2; border-color: #be123c; }

    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .cert-sign-col { width: 38%; text-align: center; }
    .cert-sign-line { height: 1px; background: #374151; margin-bottom: 6px; }
    .cert-sign-name { font-size: 13px; font-weight: 600; color: #3b0764; }
    .cert-sign-title { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .cert-sign-date { font-size: 10px; color: #9ca3af; margin-top: 4px; }

    .cert-seal-col { display: flex; justify-content: center; align-items: center; }
    .cert-seal-circle {
      width: 72px;
      height: 72px;
      border: 2px dashed #4c1d95;
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
      color: #4c1d95;
      text-align: center;
      line-height: 1.4;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 9px;
      color: #d1d5db;
      margin-top: 10px;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
      font-family: 'Fira Code', monospace;
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
