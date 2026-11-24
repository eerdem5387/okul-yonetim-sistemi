import type { Prisma, PrismaClient } from "@prisma/client"

/**
 * Aktif bursluluk sınavı dönemi. "Bursluluk Başvuruları" sayfası yalnızca bu dönemi,
 * "Bursluluk Arşivi" sayfası geçmiş dönemleri listeler.
 * Yeni dönem açılırken başvuru sistemindeki BURSLULUK_DONEM ile birlikte güncellenmelidir.
 */
export const AKTIF_BURSLULUK_DONEM = "2027-2028"

/** Dönem bilgisi taşımayan (eski) başvurular bu döneme aittir. */
export const ESKI_BURSLULUK_DONEM = "2026-2027"

export const donemEtiketi = (donem: string) => donem.replace("-", " - ")

/** Gelen webhook/sync verisindeki dönemi güvenli biçimde okur. */
export function payloadDonem(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{4}$/.test(value.trim()) ? value.trim() : ESKI_BURSLULUK_DONEM
}

export type BasvuruGecmisi = { basvuruSayisi: number; donemler: string[] }

/**
 * Verilen TC'lerin hangi dönemlerde başvurduğunu döner (en yeni dönem önce).
 */
export async function basvuruGecmisleri(
  prisma: PrismaClient,
  tcler: string[]
): Promise<Map<string, BasvuruGecmisi>> {
  const map = new Map<string, BasvuruGecmisi>()
  const unique = Array.from(new Set(tcler.filter(Boolean)))
  if (unique.length === 0) return map

  const rows = await prisma.basvuru.groupBy({
    by: ["ogrenciTc", "donem"],
    where: { ogrenciTc: { in: unique } },
  })
  for (const r of rows) {
    const g = map.get(r.ogrenciTc) ?? { basvuruSayisi: 0, donemler: [] }
    if (!g.donemler.includes(r.donem)) g.donemler.push(r.donem)
    map.set(r.ogrenciTc, g)
  }
  for (const g of map.values()) {
    g.donemler.sort((a, b) => b.localeCompare(a))
    g.basvuruSayisi = g.donemler.length
  }
  return map
}

/** Birden fazla dönemde başvurusu olan TC'ler. */
export async function tekrarBasvuranTcler(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ ogrenciTc: string }>>`
    SELECT "ogrenciTc" FROM "basvurular"
    GROUP BY "ogrenciTc"
    HAVING COUNT(DISTINCT "donem") > 1
  `
  return rows.map((r) => r.ogrenciTc)
}

/**
 * Liste, istatistik ve Excel uçlarında ortak kullanılan dönem / tekrar filtresi.
 * - donem: belirtilmezse aktif dönem
 * - tekrar=1: yalnızca birden fazla dönemde başvurmuş öğrenciler
 */
export async function donemKosullari(
  prisma: PrismaClient,
  searchParams: URLSearchParams
): Promise<Prisma.BasvuruWhereInput[]> {
  const donem = searchParams.get("donem")?.trim() || AKTIF_BURSLULUK_DONEM
  const kosullar: Prisma.BasvuruWhereInput[] = [{ donem }]
  if (searchParams.get("tekrar") === "1") {
    kosullar.push({ ogrenciTc: { in: await tekrarBasvuranTcler(prisma) } })
  }
  return kosullar
}
