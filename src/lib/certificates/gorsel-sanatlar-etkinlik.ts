/**
 * LEVENT COLLEGE IB PROGRAMME
 * Certificate of Artwork Creation
 * Görsel Sanatlar Etkinlik — HTML Şablonu
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export interface GorselSanatlarEtkinlikParticipant {
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  artworkDescription: string
  participationPhotoUrl: string
}

export interface GorselSanatlarEtkinlikCertData {
  title: string
  startDate: string
  endDate: string
  teacherName: string
  createdAt: string
  participants: GorselSanatlarEtkinlikParticipant[]
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
  data: GorselSanatlarEtkinlikCertData,
  participant: GorselSanatlarEtkinlikParticipant
): string {
  const principal = getPrincipalByGrade(participant.grade)
  const certDate = formatDate(data.createdAt)
  const periodStr = `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
  const desc = escapeHtml(participant.artworkDescription || "—")
  const photoUrl = participant.participationPhotoUrl || ""

  return `
  <div class="cert-page">
    <div class="cert-header">
      <div class="cert-school-logo">
        <img src="/logo.png" alt="Levent College" class="logo-img" onerror="this.style.display='none'" />
      </div>
      <div class="cert-school-info">
        <div class="cert-school-name">LEVENT COLLEGE</div>
        <div class="cert-school-subtitle">IB Programme · Visual Arts</div>
      </div>
    </div>

    <div class="cert-divider-top"></div>

    <div class="cert-badge-row">
      <div class="cert-badge">
        <span class="cert-badge-line">LEVENT COLLEGE IB PROGRAMME</span>
        <span class="cert-badge-line">CERTIFICATE OF ARTWORK CREATION</span>
      </div>
    </div>

    <div class="cert-title-block">
      <h1 class="cert-main-title">Certificate of Artwork Creation</h1>
    </div>

    <div class="cert-body">
      <p class="cert-statement">
        This document certifies that the artwork, whose visual is included in the attached file,
        was created by the student and reflects their own effort, creativity, and production process.
      </p>

      <div class="cert-artwork-box">
        ${
          photoUrl
            ? `<img src="${escapeHtml(photoUrl)}" alt="Artwork" class="cert-artwork-img" />`
            : `<div class="cert-artwork-placeholder">Artwork visual</div>`
        }
      </div>

      <div class="cert-fields-grid">
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Participant Name &amp; Surname</div>
          <div class="cert-field-value">${escapeHtml(`${participant.firstName} ${participant.lastName}`)}</div>
        </div>
        <div class="cert-field cert-field-full">
          <div class="cert-field-label">Artwork Description</div>
          <div class="cert-field-value cert-field-multiline">${desc}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Participant TR ID No</div>
          <div class="cert-field-value">${escapeHtml(participant.tcNumber)}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Artwork Start and Completion Date</div>
          <div class="cert-field-value">${periodStr}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Teacher Name Surname</div>
          <div class="cert-field-value">${escapeHtml(data.teacherName)}</div>
        </div>
        <div class="cert-field">
          <div class="cert-field-label">Principal Name Surname</div>
          <div class="cert-field-value">${escapeHtml(principal)}</div>
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
        <div class="cert-sign-title">Principal's Signature / Stamp</div>
        <div class="cert-sign-date">Date: ${certDate}</div>
      </div>
    </div>

    <div class="cert-cert-no">
      Certificate No: LK-AC-${Date.now().toString(36).toUpperCase().slice(-6)}
    </div>
  </div>`
}

export function buildGorselSanatlarEtkinlikCertificateHTML(
  data: GorselSanatlarEtkinlikCertData
): string {
  const pages = data.participants.map((p) => participantPage(data, p)).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Artwork Creation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: 'Inter', sans-serif; }

    .cert-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 14mm 16mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .cert-page::before {
      content: '';
      position: absolute;
      top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
      border: 2px solid #0f172a;
      pointer-events: none;
      z-index: 0;
    }
    .cert-page::after {
      content: '';
      position: absolute;
      top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
      border: 1px solid #cbd5e1;
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
    .cert-school-logo { width: 56px; height: 56px; flex-shrink: 0; }
    .logo-img { width: 56px; height: 56px; object-fit: contain; }
    .cert-school-info { flex: 1; }
    .cert-school-name {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 1.5px;
    }
    .cert-school-subtitle {
      font-size: 10px;
      color: #64748b;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cert-divider-top {
      height: 2px;
      background: linear-gradient(90deg, #0f172a 0%, #475569 50%, #0f172a 100%);
      margin: 8px 0;
      position: relative;
      z-index: 1;
    }
    .cert-divider-bottom {
      height: 1px;
      background: #cbd5e1;
      margin: 10px 0 8px;
      position: relative;
      z-index: 1;
    }

    .cert-badge-row { display: flex; justify-content: center; margin: 6px 0; position: relative; z-index: 1; }
    .cert-badge {
      background: #0f172a;
      color: #e2e8f0;
      font-size: 7.5px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 3px;
      text-align: center;
      line-height: 1.45;
    }
    .cert-badge-line { display: block; }

    .cert-title-block { text-align: center; margin: 8px 0 12px; position: relative; z-index: 1; }
    .cert-main-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
    }

    .cert-body { flex: 1; position: relative; z-index: 1; }

    .cert-statement {
      font-size: 12px;
      line-height: 1.65;
      color: #334155;
      text-align: center;
      margin-bottom: 12px;
      padding: 0 8px;
    }

    .cert-artwork-box {
      margin: 0 auto 14px;
      max-width: 220px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #f8fafc;
    }
    .cert-artwork-img {
      display: block;
      width: 100%;
      max-height: 200px;
      object-fit: contain;
    }
    .cert-artwork-placeholder {
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 11px;
    }

    .cert-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .cert-field {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      border-right: 1px solid #e2e8f0;
    }
    .cert-field:nth-child(even):not(.cert-field-full) { border-right: none; }
    .cert-field-full { grid-column: 1 / -1; border-right: none; }
    .cert-field-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #94a3b8;
      margin-bottom: 3px;
    }
    .cert-field-value {
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
      line-height: 1.4;
    }
    .cert-field-multiline { white-space: pre-wrap; }

    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .cert-sign-col { width: 38%; text-align: center; }
    .cert-sign-line { height: 1px; background: #334155; margin-bottom: 5px; }
    .cert-sign-name { font-size: 12px; font-weight: 600; color: #0f172a; }
    .cert-sign-title { font-size: 10px; color: #64748b; margin-top: 2px; }
    .cert-sign-date { font-size: 9px; color: #94a3b8; margin-top: 3px; }

    .cert-seal-col { display: flex; justify-content: center; align-items: center; }
    .cert-seal-circle {
      width: 64px;
      height: 64px;
      border: 2px dashed #475569;
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
      color: #475569;
      text-align: center;
      line-height: 1.3;
    }

    .cert-cert-no {
      text-align: center;
      font-size: 8px;
      color: #cbd5e1;
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
