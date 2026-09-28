import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

async function main() {
  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: {
      selections: {
        include: {
          student: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  const columns = clubs.map((club) => {
    const names = [...club.selections]
      .sort((a, b) => {
        const an = `${a.student.lastName} ${a.student.firstName}`
        const bn = `${b.student.lastName} ${b.student.firstName}`
        return an.localeCompare(bn, "tr")
      })
      .map((s) => `${s.student.firstName} ${s.student.lastName}`.trim())
    return { header: club.name, names }
  })

  const maxLen = Math.max(0, ...columns.map((c) => c.names.length))
  const aoa: string[][] = []
  aoa.push(columns.map((c) => c.header))
  for (let i = 0; i < maxLen; i++) {
    aoa.push(columns.map((c) => c.names[i] || ""))
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws["!cols"] = columns.map((c) => ({
    wch: Math.max(18, Math.min(40, c.header.length + 2)),
  }))
  XLSX.utils.book_append_sheet(wb, ws, "Kulüpler")

  const outDir = path.join(process.cwd(), "exports")
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "kulupler-basvuranlar.xlsx")
  XLSX.writeFile(wb, outPath)

  console.log(
    JSON.stringify({
      outPath,
      clubCount: clubs.length,
      maxApplicants: maxLen,
    })
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
