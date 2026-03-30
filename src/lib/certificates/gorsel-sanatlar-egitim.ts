/**
 * LEVENT COLLEGE IB PROGRAMME
 * Görsel Sanatlar Eğitimi Katılım Sertifikası
 * Certificate of Visual Arts Education Participation — HTML Şablonu
 *
 * Sertifika alanları (kullanıcı tanımlı):
 *   Participant Name & Surname  | Participant TR ID No
 *   Event Name                  | Date of Implementation
 *   Number of Participants      | Number of Artworks
 *   Instructor Name             | (auto)
 *   Principal Name Surname      | Vice Principal Name Surname
 *   Principal's Signature/Stamp | Vice Principal's Signature/Stamp
 *   Approval Date
 */

export interface GorselSanatlarEgitimParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

export interface GorselSanatlarEgitimCertData {
  title: string
  description: string
  startDate: string
  endDate: string
  teacherName: string
  organizerName: string
  createdAt: string
  numberOfArtworks: number
  vicePrincipalName: string
  participants: GorselSanatlarEgitimParticipant[]
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

function participantPage(
  data: GorselSanatlarEgitimCertData,
  participant: GorselSanatlarEgitimParticipant
): string {
  const principal = getPrincipalByGrade(participant.grade)
  const approvalDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`

  return `
  <div class="cert-page">
    <!-- Renk çizgisi üst kenar -->
    <div class="cert-art-stripe">
      <div class="stripe-red"></div>
      <div class="stripe-orange"></div>
      <div class="stripe-yellow"></div>
      <div class="stripe-teal"></div>
      <div class="stripe-blue"></div>
      <div class="stripe-purple"></div>
    </div>

    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent Kolej" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT KOLEJİ</div>
        <div class="cert-school-subtitle">IB Programme · Visual Arts</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">CERTIFICATE OF VISUAL ARTS EDUCATION PARTICIPATION</div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">Visual Arts Education Certificate</h1>
      <p class="cert-subtitle">${data.title}</p>
    </div>

    <div class="cert-body">
      <p class="cert-presented">This certificate is presented to:</p>
      <div class="cert-participant-name">${participant.firstName} ${participant.lastName}</div>

      <div class="cert-fields-grid">
        <div class="cert-field">
          <div class="cert-field-label">Participant TR ID No</div>
          <div class="cert-field-value">${participant.tcNumber}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Instructor Name</div>
          <div class="cert-field-value">${data.teacherName}</div>
        </div>
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Event Name</div>
          <div class="cert-field-value">${data.title}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Date of Implementation</div>
          <div class="cert-field-value">${periodStr}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Number of Participants</div>
          <div class="cert-field-value cert-field-number">${data.participants.length}</div>
        </div>
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Number of Artworks</div>
          <div class="cert-field-value cert-field-number">${data.numberOfArtworks}</div>
        </div>
      </div>
    </div>

    <div class="cert-divider-bottom"></div>

    <div class="cert-footer">
      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${principal}</div>
        <div class="cert-sign-title">Principal</div>
        <div class="cert-sign-sublabel">Principal's Signature / Stamp</div>
      </div>

      <div class="cert-seal-col">
        <div class="cert-approval-date">
          <div class="cert-approval-label">Approval Date</div>
          <div class="cert-approval-value">${approvalDate}</div>
        </div>
      </div>

      <div class="cert-sign-col">
        <div class="cert-sign-line"></div>
        <div class="cert-sign-name">${data.vicePrincipalName || "___________________"}</div>
        <div class="cert-sign-title">Vice Principal</div>
        <div class="cert-sign-sublabel">Vice Principal's Signature / Stamp</div>
      </div>
    </div>

    <div class="cert-cert-no">
      Certificate No: LK-VA-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildGorselSanatlarEgitimCertificateHTML(
  data: GorselSanatlarEgitimCertData
): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Visual Arts Education Participation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: 'Inter', sans-serif; }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 16mm 18mm 14mm;
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
      top: 7mm; left: 7mm; right: 7mm; bottom: 7mm;
      border: 2px solid #7c3aed;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 9mm; left: 9mm; right: 9mm; bottom: 9mm;
      border: 1px solid #ddd6fe;
      pointer-events: none;
      z-index: 0;
    }

    /* Sanatsal renk şeridi — üst kenar */
    .cert-art-stripe {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 5mm;
      display: flex;
      z-index: 2;
    }
    .cert-art-stripe > div { flex: 1; }
    .stripe-red    { background: #ef4444; }
    .stripe-orange { background: #f97316; }
    .stripe-yellow { background: #eab308; }
    .stripe-teal   { background: #14b8a6; }
    .stripe-blue   { background: #3b82f6; }
    .stripe-purple { background: #8b5cf6; }

    .cert-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
      margin-top: 4mm;
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
      color: #4c1d95;
      letter-spacing: 2px;
    }
    .cert-school-subtitle {
      font-size: 11px;
      color: #7c3aed;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 3px;
      background: linear-gradient(90deg, #7c3aed 0%, #ec4899 35%, #f97316 65%, #7c3aed 100%);
      margin: 10px 0;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 2px;
      background: linear-gradient(90deg, #7c3aed 0%, #ec4899 35%, #f97316 65%, #7c3aed 100%);
      margin: 12px 0 10px;
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
      background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
      color: #ede9fe;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 5px 20px;
      border-radius: 20px;
    }

    .cert-title-block {
      text-align: center;
      margin: 10px 0 16px;
      position: relative;
      z-index: 1;
    }
    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 25px;
      font-weight: 700;
      color: #4c1d95;
      line-height: 1.3;
    }
    .cert-subtitle {
      font-size: 13px;
      color: #7c3aed;
      margin-top: 4px;
      font-style: italic;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

    .cert-presented {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .cert-participant-name {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #4c1d95;
      margin-bottom: 18px;
      padding-bottom: 6px;
      border-bottom: 2px solid #a78bfa;
    }

    /* Alanlar ızgarası */
    .cert-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #ddd6fe;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .cert-field {
      padding: 11px 14px;
      border-bottom: 1px solid #ede9fe;
      border-right: 1px solid #ddd6fe;
    }
    .cert-field:nth-child(even):not(.cert-field-full) { border-right: none; }
    .cert-field:nth-last-child(1) { border-bottom: none; }
    .cert-field:nth-last-child(2):not(.cert-field-full) { border-bottom: none; }
    .cert-field-full {
      grid-column: 1 / -1;
      border-right: none;
    }
    .cert-field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #a78bfa;
      margin-bottom: 4px;
    }
    .cert-field-value {
      font-size: 13px;
      font-weight: 500;
      color: #1e1b4b;
      line-height: 1.5;
    }
    .cert-field-number {
      font-size: 20px;
      font-weight: 700;
      color: #7c3aed;
    }

    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .cert-sign-col { width: 36%; text-align: center; }
    .cert-sign-line { height: 1px; background: #4c1d95; margin-bottom: 6px; }
    .cert-sign-name { font-size: 13px; font-weight: 600; color: #4c1d95; }
    .cert-sign-title { font-size: 11px; font-weight: 600; color: #7c3aed; margin-top: 1px; }
    .cert-sign-sublabel { font-size: 10px; color: #94a3b8; margin-top: 3px; }

    .cert-seal-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .cert-approval-date {
      text-align: center;
      padding: 8px 14px;
      border: 1px dashed #a78bfa;
      border-radius: 8px;
    }
    .cert-approval-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #a78bfa;
      margin-bottom: 4px;
    }
    .cert-approval-value {
      font-size: 12px;
      font-weight: 600;
      color: #4c1d95;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 9px;
      color: #c4b5fd;
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
