/**
 * Eski IB faaliyetlerini yeni yapıya uyarlar.
 * - type (enum) → category + subtype eşlemesi yapılır.
 * - Sadece category veya subtype boş olan kayıtlar güncellenir.
 *
 * Çalıştırma:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/migrate-activities-to-new-structure.ts
 * veya .env yüklüyse:
 *   npx tsx scripts/migrate-activities-to-new-structure.ts
 */

import { prisma } from "../src/lib/prisma"

type CategoryId = "egitim" | "etkinlik" | "spor" | "yarisma"

const OLD_TYPE_TO_CATEGORY: Record<string, { category: CategoryId; subtype: string | null }> = {
  ETKINLIK: { category: "etkinlik", subtype: "etkinlik" },
  GEZI: { category: "etkinlik", subtype: "gezi" },
  PROJE: { category: "etkinlik", subtype: "proje" },
  SINAV: { category: "egitim", subtype: "sinav" },
  YARISMA: { category: "yarisma", subtype: null },
  SEMINER: { category: "egitim", subtype: "seminer" },
  WORKSHOP: { category: "egitim", subtype: "workshop" },
  SPORT: { category: "spor", subtype: "beden_egitimi" },
  SANAT: { category: "etkinlik", subtype: "sanat" },
  SOSYAL: { category: "etkinlik", subtype: "sosyal" },
  DIL: { category: "egitim", subtype: "dil" },
  BILIM: { category: "egitim", subtype: "bilim" },
  DEGER: { category: "etkinlik", subtype: "deger" },
  DIGER: { category: "etkinlik", subtype: "diger" },
}

const BATCH_SIZE = 50

const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  if (DRY_RUN) console.log("--- DRY RUN (veritabanına yazılmayacak) ---\n")
  console.log("Eski faaliyetler yeni yapıya uyarlanıyor...\n")

  const toUpdate = await prisma.activity.findMany({
    where: {
      OR: [{ category: null }, { subtype: null }],
    },
    select: { id: true, type: true, category: true, subtype: true, title: true },
    orderBy: { createdAt: "asc" },
  })

  const total = toUpdate.length
  if (total === 0) {
    console.log("Güncellenecek faaliyet yok (tüm kayıtların category/subtype alanı dolu).")
    return
  }

  console.log(`Toplam ${total} faaliyet güncellenecek.\n`)

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE)
    for (const act of batch) {
      const mapping = OLD_TYPE_TO_CATEGORY[act.type]
      if (!mapping) {
        errors.push(`${act.id}: Bilinmeyen type "${act.type}"`)
        skipped++
        continue
      }
      const category = act.category ?? mapping.category
      const subtype = act.subtype ?? mapping.subtype
      try {
        if (!DRY_RUN) {
          await prisma.activity.update({
            where: { id: act.id },
            data: { category, subtype },
          })
        }
        updated++
        if (updated <= 5 || updated % 50 === 0) {
          console.log(`  [${updated}/${total}] ${act.id} → category=${category}, subtype=${subtype ?? "(null)"}`)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${act.id}: ${msg}`)
      }
    }
  }

  console.log("\n--- Özet ---")
  console.log(DRY_RUN ? `Önizleme (güncellenecek): ${updated}` : `Güncellenen: ${updated}`)
  if (skipped) console.log(`Atlanan (bilinmeyen type): ${skipped}`)
  if (errors.length > 0) {
    console.log(`Hata: ${errors.length}`)
    errors.slice(0, 10).forEach((e) => console.log("  ", e))
    if (errors.length > 10) console.log(`  ... ve ${errors.length - 10} hata daha`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
