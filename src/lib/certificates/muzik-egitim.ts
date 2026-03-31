/**
 * LEVENT COLLEGE IB PROGRAMME — MUSIC ANNUAL CURRICULUM PROGRAM
 * Music education participation certificate
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export interface MuzikEgitimParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

export interface MuzikEgitimCertData {
  title: string
  startDate: string
  endDate: string
  teacherName: string
  organizerName: string
  createdAt: string
  participants: MuzikEgitimParticipant[]
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

function participantPage(data: MuzikEgitimCertData, participant: MuzikEgitimParticipant): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`

  return `
  <div class="cert-page">
    <div class="cert-ornament cert-ornament-tl">♪</div>
    <div class="cert-ornament cert-ornament-tr">♫</div>

    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent College" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT COLLEGE</div>
        <div class="cert-school-subtitle">IB Programme · Music Education</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-programme-title">
      <div class="cert-programme-line">LEVENT COLLEGE IB PROGRAMME</div>
      <div class="cert-programme-line cert-programme-accent">MUSIC ANNUAL CURRICULUM PROGRAM</div>
    </div>

    <div class="cert-body">
      <div class="cert-fields-grid">
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Participant Name &amp; Surname</div>
          <div class="cert-field-value">${escapeHtml(`${participant.firstName} ${participant.lastName}`)}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Participant TR ID No</div>
          <div class="cert-field-value">${escapeHtml(participant.tcNumber)}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Instructor Name</div>
          <div class="cert-field-value">${escapeHtml(data.teacherName)}</div>
        </div>
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Programme / Activity Title</div>
          <div class="cert-field-value">${escapeHtml(data.title)}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Programme Duration</div>
          <div class="cert-field-value">40 weeks</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Education Period</div>
          <div class="cert-field-value">${periodStr}</div>
        </div>
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Organized by</div>
          <div class="cert-field-value">${escapeHtml(data.organizerName)}</div>
        </div>
      </div>
    </div>

    <div class="cert-divider-bottom"></div>

    <div class="cert-footer">
      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${escapeHtml(data.teacherName)}</div>
        <div class="cert-sign-title">Teacher Signature</div>
        <div class="cert-sign-date">Date: ${certDate}</div>
      </div>

      <div class="cert-seal-col">
        <div class="cert-seal-circle">
          <span class="cert-seal-text">OFFICIAL<br/>SEAL</span>
        </div>
      </div>

      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${escapeHtml(principal)}</div>
        <div class="cert-sign-title">Principal</div>
        <div class="cert-sign-sublabel">Principal's Signature / Stamp</div>
        <div class="cert-sign-date">Date: ${certDate}</div>
      </div>
    </div>

    <div class="cert-cert-no">
      Certificate No: LK-MU-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildMuzikEgitimCertificateHTML(data: MuzikEgitimCertData): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Music Annual Curriculum Program — Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: 'Inter', sans-serif; }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: linear-gradient(180deg, #fffef8 0%, #fff 35%, #faf8f3 100%);
      margin: 0 auto;
      padding: 16mm 18mm;
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
      border: 2px solid #78350f;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 9mm; left: 9mm; right: 9mm; bottom: 9mm;
      border: 1px solid #d4af37;
      pointer-events: none;
      z-index: 0;
    }

    .cert-ornament {
      position: absolute;
      font-size: 28px;
      color: rgba(180, 83, 9, 0.12);
      z-index: 1;
      font-family: serif;
    }
    .cert-ornament-tl { top: 14mm; left: 14mm; }
    .cert-ornament-tr { top: 14mm; right: 14mm; }

    .cert-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .cert-school-logo { width: 60px; height: 60px; flex-shrink: 0; }
    .logo-img { width: 60px; height: 60px; object-fit: contain; }
    .cert-school-info { flex: 1; }
    .cert-school-name {
      font-family: 'Playfair Display', serif;
      font-size: 21px;
      font-weight: 700;
      color: #422006;
      letter-spacing: 1.5px;
    }
    .cert-school-subtitle {
      font-size: 10px;
      color: #a16207;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #78350f 0%, #d4af37 40%, #ca8a04 60%, #78350f 100%);
      margin: 10px 0;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #78350f 0%, #d4af37 50%, #78350f 100%);
      margin: 14px 0 10px;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }

    .cert-programme-title {
      text-align: center;
      margin: 12px 0 20px;
      position: relative;
      z-index: 1;
    }
    .cert-programme-line {
      font-family: 'Playfair Display', serif;
      font-size: 13px;
      font-weight: 600;
      color: #422006;
      letter-spacing: 2px;
      text-transform: uppercase;
      line-height: 1.5;
    }
    .cert-programme-accent {
      font-size: 15px;
      font-weight: 700;
      color: #92400e;
      margin-top: 4px;
      letter-spacing: 1.5px;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

    .cert-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #e7d5a8;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.6);
    }
    .cert-field {
      padding: 10px 14px;
      border-bottom: 1px solid #f5e6c8;
      border-right: 1px solid #e7d5a8;
    }
    .cert-field:nth-child(even):not(.cert-field-full) { border-right: none; }
    .cert-field-full { grid-column: 1 / -1; border-right: none; }
    .cert-field-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #a16207;
      margin-bottom: 4px;
    }
    .cert-field-value {
      font-size: 12.5px;
      font-weight: 500;
      color: #422006;
      line-height: 1.45;
    }
    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .cert-sign-col { width: 38%; text-align: center; }
    .cert-sign-line { height: 1px; background: #422006; margin-bottom: 6px; }
    .cert-sign-name { font-size: 12px; font-weight: 600; color: #422006; }
    .cert-sign-title { font-size: 10px; color: #78716c; margin-top: 2px; }
    .cert-sign-sublabel { font-size: 9px; color: #a8a29e; margin-top: 2px; }
    .cert-sign-date { font-size: 9px; color: #a8a29e; margin-top: 4px; }

    .cert-seal-col { display: flex; justify-content: center; align-items: center; }
    .cert-seal-circle {
      width: 68px;
      height: 68px;
      border: 2px dashed #a16207;
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
      color: #92400e;
      text-align: center;
      line-height: 1.35;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 8px;
      color: #d6d3d1;
      margin-top: 10px;
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
