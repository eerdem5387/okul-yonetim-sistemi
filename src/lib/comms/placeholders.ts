/** Şablonlarda alıcı ad soyad için yer tutucu — gönderimde otomatik doldurulur */
export const RECIPIENT_NAME_TOKEN = "{{ALICI_AD_SOYAD}}"

export const NOTICE_PLACEHOLDER_HELP =
  "Gönderimde her alıcının ad soyadı ile değiştirilir. Örn: Sayın {{ALICI_AD_SOYAD}},"

const TOKEN_PATTERN =
  /\{\{\s*ALICI_AD_SOYAD\s*\}\}|\{\{\s*AD_SOYAD\s*\}\}|\[\s*ALICI_AD_SOYAD\s*\]/gi

export function applyNoticePlaceholders(
  text: string,
  vars: { recipientFullName: string }
): string {
  const name = (vars.recipientFullName || "").trim() || "Personelimiz"
  return text.replace(TOKEN_PATTERN, name)
}

/** Textarea imleç konumuna yer tutucu ekler */
export function insertAtCursor(
  value: string,
  token: string,
  selectionStart: number,
  selectionEnd: number
): { value: string; caret: number } {
  const start = Math.max(0, selectionStart)
  const end = Math.max(start, selectionEnd)
  const next = `${value.slice(0, start)}${token}${value.slice(end)}`
  return { value: next, caret: start + token.length }
}
