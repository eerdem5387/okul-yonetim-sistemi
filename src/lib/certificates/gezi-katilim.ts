/**
 * Gezi Katılım Belgesi — Certificate of Educational Visit
 * HTML Şablonu
 *
 * Sertifika alanları (kullanıcı tanımlı):
 *   Participant Name Surname | Trip Description
 *   Participant TR ID No     | Trip Start and Completion Date
 *   Teacher Name Surname     | Principal Name Surname
 *   Teacher Signature        | Principal's Signature/Stamp
 *   Date
 */

export interface GeziCertParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

export interface GeziCertData {
  title: string
  description: string
  startDate: string
  endDate: string
  teacherName: string
  createdAt: string
  participants: GeziCertParticipant[]
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

function participantPage(data: GeziCertData, participant: GeziCertParticipant): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
  const tripDescription = data.description
    ? `${data.title} — ${data.description}`
    : data.title

  return `
  <div class="cert-page">
    <!-- Köşe süslemeleri -->
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent Kolej" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT KOLEJİ</div>
        <div class="cert-school-subtitle">IB Programme · Educational Visit</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">CERTIFICATE OF EDUCATIONAL VISIT</div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">Certificate of Participation</h1>
      <p class="cert-subtitle">Educational Field Trip</p>
    </div>

    <div class="cert-body">
      <p class="cert-presented">This certificate is awarded to:</p>
      <div class="cert-participant-name">${participant.firstName} ${participant.lastName}</div>

      <div class="cert-fields-grid">
        <div class="cert-field">
          <div class="cert-field-label">Participant TR ID No</div>
          <div class="cert-field-value">${participant.tcNumber}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Trip Start and Completion Date</div>
          <div class="cert-field-value">${periodStr}</div>
        </div>
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Trip Description</div>
          <div class="cert-field-value">${tripDescription}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Teacher Name Surname</div>
          <div class="cert-field-value">${data.teacherName}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Principal Name Surname</div>
          <div class="cert-field-value">${principal}</div>
        </div>
      </div>

      <p class="cert-statement">
        The above-named participant has successfully attended and completed the educational
        field trip programme organized by Levent Koleji IB Programme.
      </p>
    </div>

    <div class="cert-divider-bottom"></div>

    <div class="cert-footer">
      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${data.teacherName}</div>
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
        <div class="cert-sign-name">${principal}</div>
        <div class="cert-sign-title">Principal's Signature / Stamp</div>
        <div class="cert-sign-date">Date: ${certDate}</div>
      </div>
    </div>

    <div class="cert-cert-no">
      Certificate No: LK-EV-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildGeziCertificateHTML(data: GeziCertData): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Educational Visit</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: 'Inter', sans-serif; }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 18mm 20mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Dış kenarlık */
    .cert-page::before {
      content: '';
      position: absolute;
      top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
      border: 2px solid #1a3a5c;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
      border: 1px solid #a8c4e0;
      pointer-events: none;
      z-index: 0;
    }

    /* Köşe süsleri */
    .corner {
      position: absolute;
      width: 18mm;
      height: 18mm;
      z-index: 1;
      pointer-events: none;
    }
    .corner::before, .corner::after {
      content: '';
      position: absolute;
      background: #1a3a5c;
    }
    .corner-tl { top: 5.5mm; left: 5.5mm; }
    .corner-tr { top: 5.5mm; right: 5.5mm; transform: scaleX(-1); }
    .corner-bl { bottom: 5.5mm; left: 5.5mm; transform: scaleY(-1); }
    .corner-br { bottom: 5.5mm; right: 5.5mm; transform: scale(-1); }
    .corner::before { top: 0; left: 0; width: 5mm; height: 1.5px; }
    .corner::after  { top: 0; left: 0; width: 1.5px; height: 5mm; }

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
      color: #1a3a5c;
      letter-spacing: 2px;
    }
    .cert-school-subtitle {
      font-size: 11px;
      color: #4a7fa8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #1a3a5c 0%, #4a90d9 50%, #1a3a5c 100%);
      margin: 10px 0;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #1a3a5c 0%, #4a90d9 50%, #1a3a5c 100%);
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
      background: #1a3a5c;
      color: #a8c4e0;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      padding: 4px 20px;
      border-radius: 20px;
    }

    .cert-title-block {
      text-align: center;
      margin: 12px 0 20px;
      position: relative;
      z-index: 1;
    }
    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 700;
      color: #1a3a5c;
      line-height: 1.3;
    }
    .cert-subtitle {
      font-size: 13px;
      color: #4a7fa8;
      margin-top: 4px;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

    .cert-presented {
      text-align: center;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .cert-participant-name {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 30px;
      font-weight: 700;
      color: #1a3a5c;
      margin-bottom: 20px;
      padding-bottom: 6px;
      border-bottom: 2px solid #4a90d9;
    }

    /* İki sütunlu alan ızgarası */
    .cert-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #d0e4f4;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .cert-field {
      padding: 12px 16px;
      border-bottom: 1px solid #e8f1f9;
      border-right: 1px solid #d0e4f4;
    }
    .cert-field:nth-child(even) { border-right: none; }
    .cert-field:last-child,
    .cert-field:nth-last-child(2):not(.cert-field-full) {
      border-bottom: none;
    }
    .cert-field-full {
      grid-column: 1 / -1;
      border-right: none;
    }
    .cert-field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .cert-field-value {
      font-size: 13px;
      font-weight: 500;
      color: #1a3a5c;
      line-height: 1.5;
    }

    .cert-statement {
      font-size: 12.5px;
      line-height: 1.8;
      color: #475569;
      text-align: center;
      font-style: italic;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
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
    .cert-sign-line { height: 1px; background: #334155; margin-bottom: 6px; }
    .cert-sign-name { font-size: 13px; font-weight: 600; color: #1a3a5c; }
    .cert-sign-title { font-size: 11px; color: #64748b; margin-top: 2px; }
    .cert-sign-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }

    .cert-seal-col { display: flex; justify-content: center; align-items: center; }
    .cert-seal-circle {
      width: 72px;
      height: 72px;
      border: 2px dashed #1a3a5c;
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
      color: #1a3a5c;
      text-align: center;
      line-height: 1.4;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 9px;
      color: #cbd5e1;
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
