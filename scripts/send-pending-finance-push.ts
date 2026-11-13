/**
 * Bekleyen talepler için kurucu cihazlarına bir kez push dener.
 * Kullanım: npx tsx scripts/send-pending-finance-push.ts
 */
import { PrismaClient } from "@prisma/client"
import { notifyFoundersPendingExpenseRequest } from "../src/lib/notifications/finance-push"

const prisma = new PrismaClient()

async function main() {
  const devices = await prisma.staffPushDevice.count()
  console.log("kayıtlı cihaz:", devices)
  if (devices === 0) {
    console.log("Cihaz yok. Kurucu hesabıyla uygulamayı açıp bildirim iznini onaylayın.")
    return
  }

  const pending = await prisma.financeExpenseRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { sourceCreatedAt: "desc" },
    take: 5,
  })
  console.log("bekleyen talep:", pending.length)
  for (const row of pending) {
    console.log("push:", row.id, row.title, row.requesterName)
    await notifyFoundersPendingExpenseRequest(row)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
