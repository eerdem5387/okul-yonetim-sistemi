import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import type { OfficialNoticeType } from "@prisma/client"

const PRINCIPAL_NAME = "Ramazan Koçali"
const PRINCIPAL_TITLE = "Müdür"

function escapeHtml(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatTr(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export type OfficialNoticePdfInput = {
  type: OfficialNoticeType
  subject: string
  body: string
  createdAt: Date | string
  seenAt?: Date | string | null
  senderName: string
  recipientName: string
}

/** Resmi ihtar / talimat / duyuru PDF HTML — sağ altta müdür imza/kaşe alanı */
export function buildOfficialNoticePdfHtml(notice: OfficialNoticePdfInput): string {
  const typeLabel = NOTICE_TYPE_LABEL[notice.type] || notice.type
  const subject = escapeHtml(notice.subject)
  const body = escapeHtml(notice.body).replace(/\n/g, "<br/>")
  const sender = escapeHtml(notice.senderName)
  const recipient = escapeHtml(notice.recipientName)
  const createdAt = escapeHtml(formatTr(notice.createdAt))
  const seenAt = notice.seenAt ? escapeHtml(formatTr(notice.seenAt)) : null
  const principalName = escapeHtml(PRINCIPAL_NAME)
  const principalTitle = escapeHtml(PRINCIPAL_TITLE)

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>${typeLabel} - ${subject}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      margin: 0;
      padding: 28px 36px 24px;
      font-size: 15px;
      line-height: 1.55;
    }
    .school {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .doc-type {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 18px 0 8px;
      letter-spacing: 0.06em;
    }
    .meta {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 20px;
      font-size: 14px;
    }
    .meta td {
      padding: 6px 0;
      vertical-align: top;
    }
    .meta .label {
      width: 140px;
      font-weight: 700;
      color: #333;
    }
    .subject {
      font-size: 17px;
      font-weight: 700;
      margin: 8px 0 16px;
    }
    .body {
      min-height: 280px;
      font-size: 15px;
      line-height: 1.7;
      white-space: normal;
      border: 1px solid #d4d4d4;
      padding: 18px 20px;
      border-radius: 4px;
      background: #fafafa;
    }
    .footer {
      margin-top: 56px;
      display: flex;
      justify-content: flex-end;
      page-break-inside: avoid;
    }
    .sign-block {
      width: 240px;
      text-align: center;
      min-height: 140px;
    }
    .sign-space {
      height: 72px;
      margin-bottom: 8px;
    }
    .sign-name {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
    }
    .sign-title {
      font-size: 14px;
      margin: 4px 0 0;
    }
    .hint {
      margin-top: 28px;
      font-size: 11px;
      color: #666;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="school">RİZE LEVENT KOLEJİ</div>
  <div class="doc-type">${escapeHtml(typeLabel)}</div>

  <table class="meta">
    <tr>
      <td class="label">Konu</td>
      <td class="subject" style="padding:0">${subject}</td>
    </tr>
    <tr>
      <td class="label">Gönderen</td>
      <td>${sender}</td>
    </tr>
    <tr>
      <td class="label">Alıcı</td>
      <td>${recipient}</td>
    </tr>
    <tr>
      <td class="label">Tarih</td>
      <td>${createdAt}</td>
    </tr>
    ${
      seenAt
        ? `<tr><td class="label">Görüldü</td><td>${seenAt}</td></tr>`
        : `<tr><td class="label">Görüldü</td><td>Henüz görülmedi</td></tr>`
    }
  </table>

  <div class="body">${body}</div>

  <div class="footer">
    <div class="sign-block">
      <div class="sign-space"></div>
      <p class="sign-name">${principalName}</p>
      <p class="sign-title">${principalTitle}</p>
    </div>
  </div>
</body>
</html>`
}
