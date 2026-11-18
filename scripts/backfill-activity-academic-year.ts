/**
 * Faaliyetleri (activity_events) başlangıç tarihlerine göre akademik yıla bağlar.
 * Kural: src/lib/activity-academic-year.ts (yaz tatili / açılış öncesi → yaklaşan yıl).
 *
 * Migration 20261118150000_activity_event_academic_year aynı geri doldurmayı SQL ile zaten yapar;
 * bu betik önizleme ve gerektiğinde yeniden hesaplama içindir.
 *
 *   npx tsx scripts/backfill-activity-academic-year.ts          # yalnız önizleme (yazmaz)
 *   npx tsx scripts/backfill-activity-academic-year.ts --apply  # veritabanına yazar
 *
 * DİKKAT: web/.env canlı veritabanını gösterir; --apply canlıya yazar.
 */
import { PrismaClient } from "@prisma/client"
import { pickAcademicYearIdForDate } from "../src/lib/activity-academic-year"

const prisma = new PrismaClient()
const apply = process.argv.includes("--apply")

async function main() {
  const years = await prisma.academicYear.findMany({
    select: { id: true, name: true, endDate: true, parentActiveYearId: true },
  })
  const nameOf = new Map(years.map((y) => [y.id, y.name]))
  const events = await prisma.activityEvent.findMany({
    select: { id: true, title: true, startDate: true, academicYearId: true },
    orderBy: { startDate: "asc" },
  })

  const perYear = new Map<string, number>()
  const changes: Array<{ id: string; to: string | null; line: string }> = []
  for (const e of events) {
    const to = pickAcademicYearIdForDate(years, e.startDate)
    const label = to ? nameOf.get(to) ?? to : "(yıl yok)"
    perYear.set(label, (perYear.get(label) ?? 0) + 1)
    if (to !== e.academicYearId) {
      const from = e.academicYearId ? nameOf.get(e.academicYearId) ?? e.academicYearId : "—"
      changes.push({
        id: e.id,
        to,
        line: `${e.startDate.toISOString().slice(0, 10)}  ${e.title.slice(0, 50)}  ${from} → ${label}`,
      })
    }
  }

  console.log(`Toplam faaliyet: ${events.length}`)
  for (const [label, n] of perYear) console.log(`  ${label}: ${n}`)
  console.log(`Değişecek kayıt: ${changes.length}`)
  for (const c of changes.slice(0, 100)) console.log(`  ${c.line}`)

  if (!apply) {
    console.log("\nÖnizleme — yazmak için --apply ekleyin.")
    return
  }
  for (const c of changes) {
    await prisma.activityEvent.update({ where: { id: c.id }, data: { academicYearId: c.to } })
  }
  console.log(`\n${changes.length} kayıt güncellendi.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
