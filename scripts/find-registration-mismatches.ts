/**
 * Yeni kayıt / yenileme "Toplam Kayıt" ile mevcut (kayıtlı) öğrenci arasındaki
 * uyuşmayan kayıtları listeler. Salt okuma.
 *
 * Çalıştır: npx tsx scripts/find-registration-mismatches.ts
 */
import { PrismaClient } from "@prisma/client"
import { getRenewalTargetContext } from "../src/lib/student-registration-meta"
import { buildEnrollmentRegistrationGradeBreakdown } from "../src/lib/enrolled-grade-counts"
import { k12GradeWhereClause, parseStudentGradeLevel } from "../src/lib/student-grade-level"

const prisma = new PrismaClient()

function tcOf(
  studentTc: string | null | undefined,
  contractData: unknown
): string {
  if (studentTc && studentTc.trim()) return studentTc.trim()
  const cd = contractData as Record<string, unknown>
  const t = cd?.tcNumber
  return typeof t === "string" && t.trim() ? t.trim() : ""
}

async function main() {
  const ctx = await getRenewalTargetContext(prisma)
  const {
    target,
    renewedStudentIds,
    newRegistrationStudentIds,
    newRegistrationActiveYearStudentIds,
    futureYearOnlyNewRegistrationStudentIds,
  } = ctx

  const students = await prisma.student.findMany({
    where: k12GradeWhereClause(),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tcNumber: true,
      grade: true,
      registrationStatusOverride: true,
      registrationStatusPeriodLabel: true,
    },
    orderBy: [{ grade: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  })

  const [allNewRegs, allRenewals] = await Promise.all([
    prisma.newRegistration.findMany({
      include: { student: { select: { id: true, tcNumber: true, firstName: true, lastName: true, grade: true } } },
    }),
    prisma.renewal.findMany({
      include: { student: { select: { id: true, tcNumber: true, firstName: true, lastName: true, grade: true } } },
    }),
  ])

  const uniqueNewTc = new Set<string>()
  const uniqueRenewalTc = new Set<string>()
  for (const r of allNewRegs) {
    if (!r.student) continue
    const tc = tcOf(r.student.tcNumber, r.contractData)
    if (tc) uniqueNewTc.add(tc)
  }
  for (const r of allRenewals) {
    if (!r.student) continue
    const tc = tcOf(r.student.tcNumber, r.contractData)
    if (tc) uniqueRenewalTc.add(tc)
  }

  const breakdown = buildEnrollmentRegistrationGradeBreakdown({
    students,
    renewedStudentIds,
    newRegistrationStudentIds,
    newRegistrationActiveYearStudentIds,
    futureYearOnlyNewRegistrationStudentIds,
  })

  let mevcut = 0
  let newReg = 0
  let renewed = 0
  let notRenewed = 0
  for (const row of Object.values(breakdown)) {
    mevcut += row.mevcut
    newReg += row.newRegistration
    renewed += row.renewed
    notRenewed += row.notRenewed
  }

  type Row = {
    id: string
    name: string
    tc: string
    grade: string
    reason: string
  }

  const classified = {
    newRegistration: [] as Row[],
    renewed: [] as Row[],
    notRenewed: [] as Row[],
    futureOnly: [] as Row[],
    bothNewAndRenewed: [] as Row[],
    noPeriodContractButInRoster: [] as Row[],
  }

  const studentById = new Map(students.map((s) => [s.id, s]))
  const k12Ids = new Set(students.map((s) => s.id))

  for (const s of students) {
    if (futureYearOnlyNewRegistrationStudentIds.has(s.id)) {
      classified.futureOnly.push({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        tc: s.tcNumber,
        grade: s.grade,
        reason: "Yalnızca gelecek yıl yeni kayıt (ön kayıt) — mevcuda dahil değil",
      })
      continue
    }
    const level = parseStudentGradeLevel(s.grade)
    if (level == null) continue

    const isNew =
      newRegistrationActiveYearStudentIds.has(s.id) ||
      (newRegistrationStudentIds.has(s.id) && !renewedStudentIds.has(s.id))
    const isRenewed =
      renewedStudentIds.has(s.id) && !newRegistrationStudentIds.has(s.id)
    const inBoth =
      renewedStudentIds.has(s.id) && newRegistrationStudentIds.has(s.id)

    const brief = {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      tc: s.tcNumber,
      grade: s.grade,
      reason: "",
    }

    if (inBoth && !isNew) {
      // buildEnrollment: new takes priority if active year new OR (in new set and not renewed)
      // if in both sets, newRegistrationStudentIds.has && renewed → isNew is false if not active year new
      // Actually: isNew = activeYear OR (newSet && !renewedSet) — if in both, second part false
      // so only active year new counts as new; else if renewed && !new → renewed; else not renewed
    }

    if (isNew) {
      classified.newRegistration.push({ ...brief, reason: "Dönem: Yeni Kayıt (mevcut)" })
    } else if (isRenewed) {
      classified.renewed.push({ ...brief, reason: "Dönem: Kayıt Yenileyen (mevcut)" })
    } else {
      classified.notRenewed.push({
        ...brief,
        reason: "Dönem: Kayıt yenilemeyen (mevcutta yok, kadroda var)",
      })
    }

    if (renewedStudentIds.has(s.id) && newRegistrationStudentIds.has(s.id)) {
      classified.bothNewAndRenewed.push({
        ...brief,
        reason:
          "Hem dönem yeni kayıt hem yenileme kümesinde — kartlarda yeni kayıt önceliği (aktif yıl) veya yenilemeyen/yenileyen ayrımı",
      })
    }
  }

  // All-time unique TC in contracts but student not in current k12 mevcut
  const allTimeNewNotInMevcut: Row[] = []
  const allTimeRenewalNotInMevcut: Row[] = []

  const mevcutIds = new Set<string>()
  for (const s of students) {
    if (futureYearOnlyNewRegistrationStudentIds.has(s.id)) continue
    if (parseStudentGradeLevel(s.grade) == null) continue
    const isNew =
      newRegistrationActiveYearStudentIds.has(s.id) ||
      (newRegistrationStudentIds.has(s.id) && !renewedStudentIds.has(s.id))
    const isRenewed =
      renewedStudentIds.has(s.id) && !newRegistrationStudentIds.has(s.id)
    if (isNew || isRenewed) mevcutIds.add(s.id)
  }

  const seenNewTc = new Set<string>()
  for (const r of allNewRegs) {
    if (!r.student) continue
    const tc = tcOf(r.student.tcNumber, r.contractData)
    if (!tc || seenNewTc.has(tc)) continue
    seenNewTc.add(tc)
    if (!mevcutIds.has(r.student.id)) {
      allTimeNewNotInMevcut.push({
        id: r.student.id,
        name: `${r.student.firstName} ${r.student.lastName}`,
        tc,
        grade: r.student.grade,
        reason: "Tüm zamanlar yeni kayıt TC toplamında var, mevcut (kayıtlı) içinde yok",
      })
    }
  }

  const seenRenTc = new Set<string>()
  for (const r of allRenewals) {
    if (!r.student) continue
    const tc = tcOf(r.student.tcNumber, r.contractData)
    if (!tc || seenRenTc.has(tc)) continue
    seenRenTc.add(tc)
    if (!mevcutIds.has(r.student.id)) {
      allTimeRenewalNotInMevcut.push({
        id: r.student.id,
        name: `${r.student.firstName} ${r.student.lastName}`,
        tc,
        grade: r.student.grade,
        reason: "Tüm zamanlar yenileme TC toplamında var, mevcut (kayıtlı) içinde yok",
      })
    }
  }

  // Mevcut students whose TC is not in the all-time unique for their class type
  const mevcutNewWithoutAllTimeNewTc: Row[] = []
  const mevcutRenewedWithoutAllTimeRenewalTc: Row[] = []
  for (const s of students) {
    if (!mevcutIds.has(s.id)) continue
    const isNew =
      newRegistrationActiveYearStudentIds.has(s.id) ||
      (newRegistrationStudentIds.has(s.id) && !renewedStudentIds.has(s.id))
    const isRenewed =
      renewedStudentIds.has(s.id) && !newRegistrationStudentIds.has(s.id)
    const tc = (s.tcNumber || "").trim()
    if (isNew && tc && !uniqueNewTc.has(tc)) {
      mevcutNewWithoutAllTimeNewTc.push({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        tc,
        grade: s.grade,
        reason:
          "Mevcutta Yeni Kayıt sayılıyor ama tüm zamanlar yeni kayıt TC listesinde yok (manuel override / TC boş sözleşme)",
      })
    }
    if (isRenewed && tc && !uniqueRenewalTc.has(tc)) {
      mevcutRenewedWithoutAllTimeRenewalTc.push({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        tc,
        grade: s.grade,
        reason:
          "Mevcutta Yenileyen sayılıyor ama tüm zamanlar yenileme TC listesinde yok (manuel override / TC boş)",
      })
    }
  }

  // Contracts without student / empty TC
  const orphanNew = allNewRegs.filter((r) => !r.student)
  const orphanRenewal = allRenewals.filter((r) => !r.student)
  const emptyTcNew = allNewRegs.filter((r) => r.student && !tcOf(r.student.tcNumber, r.contractData))
  const emptyTcRenewal = allRenewals.filter(
    (r) => r.student && !tcOf(r.student.tcNumber, r.contractData)
  )

  // Period new/renewed not in k12 (shouldn't happen often)
  const periodNewOutsideK12: Row[] = []
  for (const id of newRegistrationStudentIds) {
    if (!k12Ids.has(id)) {
      const s = await prisma.student.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, tcNumber: true, grade: true },
      })
      if (s) {
        periodNewOutsideK12.push({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          tc: s.tcNumber,
          grade: s.grade,
          reason: "Dönem yeni kayıt kümesinde ama 5–12 k12 filtresinde değil",
        })
      }
    }
  }

  const printList = (title: string, rows: Row[], limit = 80) => {
    console.log(`\n=== ${title} (${rows.length}) ===`)
    if (rows.length === 0) {
      console.log("(yok)")
      return
    }
    for (const r of rows.slice(0, limit)) {
      console.log(`- ${r.grade} | ${r.tc} | ${r.name} | ${r.reason}`)
    }
    if (rows.length > limit) console.log(`… +${rows.length - limit} daha`)
  }

  console.log("=== ÖZET ===")
  console.log(`Yenileme hedef yılı: ${target?.label ?? "(yok)"}`)
  console.log(`Toplam Kayıt (yeni, tüm zamanlar TC): ${uniqueNewTc.size}`)
  console.log(`Toplam Kayıt (yenileme, tüm zamanlar TC): ${uniqueRenewalTc.size}`)
  console.log(`Toplam Kayıt toplamı: ${uniqueNewTc.size + uniqueRenewalTc.size}`)
  console.log(`Mevcut (yeni+yenileyen): ${mevcut}  [yeni ${newReg} + yenileyen ${renewed}]`)
  console.log(`Yenilemeyen: ${notRenewed}`)
  console.log(`Kadro (mevcut+yenilemeyen): ${mevcut + notRenewed}`)
  console.log(
    `Fark (sözleşme TC toplamı − mevcut): ${uniqueNewTc.size + uniqueRenewalTc.size - mevcut}`
  )

  printList("1) Kayıt yenilemeyenler (mevcutta yok)", classified.notRenewed)
  printList(
    "2) Tüm zamanlar YENİ KAYIT TC’si var, mevcutta yok",
    allTimeNewNotInMevcut
  )
  printList(
    "3) Tüm zamanlar YENİLEME TC’si var, mevcutta yok",
    allTimeRenewalNotInMevcut
  )
  printList(
    "4) Mevcutta yeni kayıt ama tüm zamanlar yeni TC listesinde yok",
    mevcutNewWithoutAllTimeNewTc
  )
  printList(
    "5) Mevcutta yenileyen ama tüm zamanlar yenileme TC listesinde yok",
    mevcutRenewedWithoutAllTimeRenewalTc
  )
  printList("6) Hem yeni kayıt hem yenileme döneminde işaretli", classified.bothNewAndRenewed)
  printList("7) Ön kayıt (gelecek yıl only) — mevcuda dahil değil", classified.futureOnly)
  printList("8) Dönem yeni kayıt ama k12 dışında", periodNewOutsideK12)

  console.log(`\n=== Sözleşme veri sorunları ===`)
  console.log(`Öğrencisiz yeni kayıt: ${orphanNew.length}`)
  console.log(`Öğrencisiz yenileme: ${orphanRenewal.length}`)
  console.log(`TC’siz yeni kayıt (öğrencili): ${emptyTcNew.length}`)
  console.log(`TC’siz yenileme (öğrencili): ${emptyTcRenewal.length}`)
  if (emptyTcNew.length) {
    for (const r of emptyTcNew.slice(0, 30)) {
      console.log(
        `  NEW empty TC: ${r.student?.firstName} ${r.student?.lastName} (${r.student?.grade}) id=${r.studentId}`
      )
    }
  }
  if (emptyTcRenewal.length) {
    for (const r of emptyTcRenewal.slice(0, 30)) {
      console.log(
        `  REN empty TC: ${r.student?.firstName} ${r.student?.lastName} (${r.student?.grade}) id=${r.studentId}`
      )
    }
  }

  // Suppress unused
  void studentById
  void classified.noPeriodContractButInRoster
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
