/**
 * One-off: create 3 part-time OGRETMEN staff with placeholder TCs + StaffBranch links.
 * Usage: ./node_modules/.bin/tsx scripts/_tmp_create_parttime_teachers.ts
 */
import { existsSync, readFileSync } from "fs"
import { PrismaClient } from "@prisma/client"

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

const prisma = new PrismaClient()

const TEACHERS = [
  { firstName: "Hilal", lastName: "Göğebakan", subject: "Fizik" },
  { firstName: "Hatice", lastName: "Doğan", subject: "Biyoloji" },
  { firstName: "Sakine", lastName: "Tüysüz", subject: "Coğrafya" },
] as const

const NOTES = "Part-time öğretmen — gerçek TC yok, geçici kod"

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR")
}

function nameKey(firstName: string, lastName: string) {
  return `${norm(firstName)}|${norm(lastName)}`
}

async function nextPlaceholderTc(count: number): Promise<string[]> {
  const used = await prisma.staff.findMany({
    where: {
      OR: [
        { tcNumber: { startsWith: "900" } },
        { tcNumber: { startsWith: "000" } },
        { tcNumber: { startsWith: "999" } },
      ],
    },
    select: { tcNumber: true },
  })
  const usedSet = new Set(used.map((u) => u.tcNumber))
  console.log(
    `Existing placeholder-like TCs (900/000/999*): ${[...usedSet].sort().join(", ") || "(none)"}`
  )

  const assigned: string[] = []
  let n = 1
  while (assigned.length < count && n <= 99999) {
    const tc = `900${String(n).padStart(8, "0")}`
    if (!usedSet.has(tc)) {
      assigned.push(tc)
      usedSet.add(tc)
    }
    n++
  }
  if (assigned.length < count) {
    throw new Error("Could not allocate enough unique placeholder TCs")
  }
  return assigned
}

async function main() {
  // Load branches helpers after env is set (they use @/lib/prisma singleton)
  const { syncStaffBranches, upsertBranchByName } = await import(
    "../src/lib/branches"
  )

  const existing = await prisma.staff.findMany({
    where: { department: "OGRETMEN" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tcNumber: true,
      subject: true,
      department: true,
      branchLinks: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
  })
  const byName = new Map(
    existing.map((s) => [nameKey(s.firstName, s.lastName), s])
  )

  const needCreate = TEACHERS.filter(
    (t) => !byName.has(nameKey(t.firstName, t.lastName))
  )
  const tcs = await nextPlaceholderTc(needCreate.length)
  let tcIdx = 0

  const results: Array<Record<string, unknown>> = []

  for (const t of TEACHERS) {
    const key = nameKey(t.firstName, t.lastName)
    const found = byName.get(key)
    if (found) {
      results.push({
        status: "skipped",
        id: found.id,
        firstName: found.firstName,
        lastName: found.lastName,
        tcNumber: found.tcNumber,
        subject: found.subject,
        branchLinked: found.branchLinks.map((b) => b.branch.name),
      })
      continue
    }

    const branch = await upsertBranchByName(t.subject)
    if (!branch) throw new Error(`Branch upsert failed for ${t.subject}`)

    const tcNumber = tcs[tcIdx++]
    const staff = await prisma.staff.create({
      data: {
        firstName: t.firstName,
        lastName: t.lastName,
        tcNumber,
        department: "OGRETMEN",
        position: "Öğretmen",
        subject: t.subject,
        notes: NOTES,
        isActive: true,
        password: null,
        isFirstLogin: true,
        mustChangePassword: false,
      },
    })

    await syncStaffBranches(staff.id, [branch.id])

    const refreshed = await prisma.staff.findUnique({
      where: { id: staff.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        subject: true,
        branchLinks: { include: { branch: { select: { name: true } } } },
      },
    })

    results.push({
      status: "created",
      id: refreshed!.id,
      firstName: refreshed!.firstName,
      lastName: refreshed!.lastName,
      tcNumber: refreshed!.tcNumber,
      subject: refreshed!.subject,
      branchLinked: refreshed!.branchLinks.map((b) => b.branch.name),
    })
  }

  console.log("\n=== RESULT ===")
  for (const r of results) {
    console.log(JSON.stringify(r))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
