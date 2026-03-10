/**
 * Mevcut faaliyetlerde isVerified=true olanları verificationStatus=ONAYLANDI yapar.
 * Bir kez çalıştırılır (db push sonrası).
 */
import { prisma } from "../src/lib/prisma"

async function main() {
  const result = await prisma.activity.updateMany({
    where: { isVerified: true },
    data: { verificationStatus: "ONAYLANDI" },
  })
  console.log(`Güncellenen kayıt (önceden doğrulanmış → ONAYLANDI): ${result.count}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
