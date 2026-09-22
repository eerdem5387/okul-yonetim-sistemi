/**
 * StaffList Excel'e göre yalnızca OGRETMEN kayıtlarını senkronize eder.
 * - Listede olup sistemde yoksa: oluştur (OGRETMEN)
 * - Listede olup sistemde OGRETMEN ise: güncelle (ad, soyad, branş, telefon, isActive=true)
 * - Sistemde OGRETMEN olup listede yoksa: isActive=false (okuldan ayrılmış)
 * - REHBERLIK / MUDUR / KURUCU / diğer departmanlara dokunmaz
 *
 * Kullanım:
 *   npx tsx scripts/sync-teachers-from-staff-list.ts --dry-run
 *   npx tsx scripts/sync-teachers-from-staff-list.ts --apply
 */
import * as XLSX from "xlsx"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const LIST_PATH = "/Users/emreerdem/Downloads/StaffList_21.09.2026_16.19.xlsx"
const APPLY = process.argv.includes("--apply")

type ListRow = {
  Id?: number | string
  Adı?: string
  Soyadı?: string
  "Tc Kimlik No"?: string | number
  Branş?: string
  "Cep Tel"?: string | number
}

function normalizeTc(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "")
}

function normalizePhone(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "")
  if (!digits) return null
  if (digits.length === 10) return `0${digits}`
  if (digits.length === 11 && digits.startsWith("0")) return digits
  return digits
}

function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, " ")
}

async function main() {
  const wb = XLSX.readFile(LIST_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<ListRow>(sheet, { defval: "" })

  const listTeachers = rows
    .map((r) => ({
      firstName: normalizeName(String(r.Adı ?? "")),
      lastName: normalizeName(String(r.Soyadı ?? "")),
      tcNumber: normalizeTc(r["Tc Kimlik No"]),
      subject: normalizeName(String(r.Branş ?? "")) || null,
      phone: normalizePhone(r["Cep Tel"]),
    }))
    .filter((t) => t.tcNumber.length === 11 && t.firstName && t.lastName)

  const listByTc = new Map(listTeachers.map((t) => [t.tcNumber, t]))
  console.log(`Liste: ${listTeachers.length} öğretmen (geçerli TC)`)
  console.log(`Mod: ${APPLY ? "APPLY (yazılacak)" : "DRY-RUN (sadece rapor)"}`)

  const allStaff = await prisma.staff.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tcNumber: true,
      department: true,
      subject: true,
      phone: true,
      isActive: true,
    },
  })

  const teachers = allStaff.filter((s) => s.department === "OGRETMEN")
  const protectedStaff = allStaff.filter((s) => s.department !== "OGRETMEN")

  // Listede TC'si olan ama sistemde öğretmen olmayan (başka rol veya yok)
  const create: typeof listTeachers = []
  const update: Array<{
    id: string
    before: (typeof teachers)[0]
    after: (typeof listTeachers)[0]
  }> = []
  const reactivate: typeof update = []
  const leave: typeof teachers = []
  const skipProtectedInList: Array<{
    tc: string
    name: string
    department: string
  }> = []

  for (const item of listTeachers) {
    const existing = allStaff.find((s) => s.tcNumber === item.tcNumber)
    if (!existing) {
      create.push(item)
      continue
    }
    if (existing.department !== "OGRETMEN") {
      skipProtectedInList.push({
        tc: item.tcNumber,
        name: `${item.firstName} ${item.lastName}`,
        department: existing.department,
      })
      continue
    }
    const changed =
      existing.firstName !== item.firstName ||
      existing.lastName !== item.lastName ||
      (existing.subject || null) !== item.subject ||
      (existing.phone || null) !== item.phone ||
      !existing.isActive
    if (changed) {
      const entry = { id: existing.id, before: existing, after: item }
      if (!existing.isActive) reactivate.push(entry)
      else update.push(entry)
    }
  }

  for (const t of teachers) {
    if (!listByTc.has(t.tcNumber)) {
      if (t.isActive) leave.push(t)
    }
  }

  console.log("\n--- ÖZET ---")
  console.log(`Yeni oluşturulacak: ${create.length}`)
  console.log(`Güncellenecek (aktif): ${update.length}`)
  console.log(`Yeniden aktifleştirilecek: ${reactivate.length}`)
  console.log(`Ayrılmış (pasif yapılacak): ${leave.length}`)
  console.log(
    `Listede var ama korumalı rol (dokunulmadı): ${skipProtectedInList.length}`
  )
  console.log(`Korumalı personel toplam: ${protectedStaff.length}`)

  if (create.length) {
    console.log("\n+++ YENİ +++")
    for (const c of create) {
      console.log(`  + ${c.firstName} ${c.lastName} TC:${c.tcNumber} · ${c.subject}`)
    }
  }
  if (update.length || reactivate.length) {
    console.log("\n~~~ GÜNCELLE / AKTİFLEŞTİR ~~~")
    for (const u of [...update, ...reactivate]) {
      console.log(
        `  ~ ${u.before.firstName} ${u.before.lastName} → ${u.after.firstName} ${u.after.lastName}` +
          ` | branş: ${u.before.subject ?? "-"} → ${u.after.subject ?? "-"}` +
          ` | aktif: ${u.before.isActive} → true`
      )
    }
  }
  if (leave.length) {
    console.log("\n--- AYRILAN (pasif) ---")
    for (const l of leave) {
      console.log(`  - ${l.firstName} ${l.lastName} TC:${l.tcNumber} · ${l.subject ?? "-"}`)
    }
  }
  if (skipProtectedInList.length) {
    console.log("\n!!! LİSTEDE AMA KORUMALI ROL (atlanır) !!!")
    for (const s of skipProtectedInList) {
      console.log(`  ! ${s.name} TC:${s.tc} · ${s.department}`)
    }
  }

  if (!APPLY) {
    console.log("\nDry-run bitti. Uygulamak için: npx tsx scripts/sync-teachers-from-staff-list.ts --apply")
    return
  }

  let created = 0
  let updated = 0
  let deactivated = 0

  for (const c of create) {
    await prisma.staff.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        tcNumber: c.tcNumber,
        phone: c.phone,
        subject: c.subject,
        department: "OGRETMEN",
        position: "Öğretmen",
        isActive: true,
        password: null,
        isFirstLogin: true,
        mustChangePassword: false,
      },
    })
    created++
  }

  for (const u of [...update, ...reactivate]) {
    await prisma.staff.update({
      where: { id: u.id },
      data: {
        firstName: u.after.firstName,
        lastName: u.after.lastName,
        phone: u.after.phone,
        subject: u.after.subject,
        isActive: true,
        department: "OGRETMEN",
      },
    })
    updated++
  }

  for (const l of leave) {
    await prisma.staff.update({
      where: { id: l.id },
      data: { isActive: false },
    })
    deactivated++
  }

  console.log("\n✅ Uygulandı:")
  console.log(`  oluşturuldu: ${created}`)
  console.log(`  güncellendi: ${updated}`)
  console.log(`  pasif yapıldı: ${deactivated}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
