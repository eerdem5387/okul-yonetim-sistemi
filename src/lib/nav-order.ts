/**
 * Kenar menü (sidebar) kişisel sıralaması.
 *
 * Sıra, menü öğelerinin web href'leriyle tutulur (ör. "/finans"). Mobil uygulama da aynı
 * href'leri kullandığı için tek kayıt hem web hem mobilde geçerlidir
 * (mobil kopya: okul-yonetim-mobil `src/navigation/navOrder.ts`).
 */

export const NAV_ORDER_MAX_ITEMS = 100

/** Gelen veriyi temizler: yalnızca "/" ile başlayan, tekrarsız href'ler. */
export function sanitizeNavOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value) {
    if (typeof raw !== "string") continue
    const href = raw.trim()
    if (!href.startsWith("/") || href.length > 200 || seen.has(href)) continue
    seen.add(href)
    out.push(href)
    if (out.length >= NAV_ORDER_MAX_ITEMS) break
  }
  return out
}

/**
 * Menü öğelerini kayıtlı sıraya göre dizer. Kayıtta olmayan (yeni eklenmiş ya da
 * yetkisi sonradan verilmiş) öğeler varsayılan sıralarıyla en sona eklenir.
 */
export function applyNavOrder<T>(items: readonly T[], order: readonly string[] | null | undefined, hrefOf: (item: T) => string): T[] {
  if (!order || order.length === 0) return [...items]
  const rank = new Map(order.map((href, index) => [href, index]))
  const known: T[] = []
  const unknown: T[] = []
  for (const item of items) {
    if (rank.has(hrefOf(item))) known.push(item)
    else unknown.push(item)
  }
  known.sort((a, b) => (rank.get(hrefOf(a)) ?? 0) - (rank.get(hrefOf(b)) ?? 0))
  return [...known, ...unknown]
}
