/**
 * Ders programı satırlarını Neredeyiz dersleriyle bağlar:
 * (sınıf, ders adı) → Neredeyiz dersi, öğretmen → ders ataması, Schedule.subjectId.
 * Ders programı satırlarının yalnızca subjectId alanı yazılır; saat/gün/öğretmen değişmez.
 *
 *   npx tsx scripts/link-schedules-to-neredeyiz.ts          # önizleme (yazmaz)
 *   npx tsx scripts/link-schedules-to-neredeyiz.ts --apply  # veritabanına yazar
 *
 * DİKKAT: .env canlı veritabanını gösterir; --apply canlıya yazar.
 */
import { prisma } from "../src/lib/prisma"
import { linkSchedulesToNeredeyiz } from "../src/lib/neredeyiz/sync"

const apply = process.argv.includes("--apply")

linkSchedulesToNeredeyiz({ dryRun: !apply })
  .then((r) => {
    console.log(apply ? "Uygulandı:" : "Önizleme (yazılmadı):")
    console.log(`  Bağlanmamış aktif program satırı: ${r.schedules}`)
    console.log(`  Oluşacak/oluşan Neredeyiz dersi:   ${r.subjectsCreated}`)
    console.log(`  Eklenecek/eklenen öğretmen ataması: ${r.assignmentsCreated}`)
    console.log(`  Bağlanacak/bağlanan program satırı: ${r.schedulesLinked}`)
    if (!apply) console.log("\nYazmak için --apply ekleyin.")
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
