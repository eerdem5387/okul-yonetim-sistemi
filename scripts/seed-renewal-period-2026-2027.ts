import { PrismaClient } from "@prisma/client"
import { contractYearLabelFromAcademicYear } from "../src/lib/academic-year-ui"

const prisma = new PrismaClient()

async function main() {
  const years = await prisma.academicYear.findMany({
    where: { parentActiveYearId: null },
    orderBy: [{ startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  })
  console.log("Years:")
  for (const y of years) {
    console.log(
      "-",
      y.name,
      "label=",
      contractYearLabelFromAcademicYear(y),
      "active=",
      y.isActive,
      "period=",
      y.isRenewalPeriod
    )
  }
  const target =
    years.find((y) => contractYearLabelFromAcademicYear(y) === "2026-2027") ||
    years.find((y) => /2026\s*[-–/]\s*2027/.test(y.name))
  if (!target) {
    throw new Error("No 2026-2027 academic year found")
  }
  await prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({
      where: { isRenewalPeriod: true },
      data: { isRenewalPeriod: false },
    })
    await tx.academicYear.update({
      where: { id: target.id },
      data: { isRenewalPeriod: true },
    })
  })
  console.log(
    "Set renewal period:",
    target.name,
    contractYearLabelFromAcademicYear(target)
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
