import type { Prisma, PrismaClient } from "@prisma/client"

/** TC kimlik numarasından rakam dışı karakterleri atar. */
export function normalizeTcInput(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "")
}

/**
 * Doğum tarihi girdisini çözer. Kabul edilen biçimler:
 *  - YYYY-MM-DD (tarih seçici, mobil, ISO zaman damgası)
 *  - GG.AA.YYYY veya GG/AA/YYYY (Yeni Kayıt formu)
 * Geçersiz tarih → null. (Eskiden geçersiz tarihte "bugün" yazılıyor, GG.AA.YYYY'de gün/ay yer değiştiriyordu.)
 */
export function parseBirthDateInput(raw: unknown): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  const value = String(raw ?? "").trim()
  if (!value) return null

  let year: number
  let month: number
  let day: number

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value)
  const tr = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(value)
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (tr) {
    day = Number(tr[1])
    month = Number(tr[2])
    year = Number(tr[3])
  } else {
    return null
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  // 31.02 gibi taşan tarihleri reddet
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  return date
}

type ParentSourceStudent = {
  id: string
  tcNumber: string
  motherName: string
  motherTc: string
  motherPhone: string
  fatherName: string
  fatherTc: string
  fatherPhone: string
}

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Öğrenci için veli hesabını (öğrenci TC'si ile giriş) ve anne/baba bağlantılarını oluşturur veya günceller.
 * Yalnızca ekler/günceller; hiçbir kaydı silmez.
 */
export async function ensureParentAccountForStudent(db: DbClient, student: ParentSourceStudent): Promise<void> {
  const parentAccount = await db.parent.upsert({
    where: { studentTcNumber: student.tcNumber },
    update: { isActive: true },
    create: { studentTcNumber: student.tcNumber, isActive: true },
  })

  const relations: Array<{ relation: "ANNE" | "BABA"; name: string; tc: string; phone: string }> = [
    { relation: "ANNE", name: student.motherName, tc: student.motherTc, phone: student.motherPhone },
    { relation: "BABA", name: student.fatherName, tc: student.fatherTc, phone: student.fatherPhone },
  ]

  for (const r of relations) {
    if (!r.name || !r.tc) continue
    await db.parentStudent.upsert({
      where: {
        parentId_studentId_relation: {
          parentId: parentAccount.id,
          studentId: student.id,
          relation: r.relation,
        },
      },
      update: {
        parentName: r.name,
        parentTcNumber: r.tc,
        parentPhone: r.phone || undefined,
      },
      create: {
        parentId: parentAccount.id,
        studentId: student.id,
        relation: r.relation,
        parentName: r.name,
        parentTcNumber: r.tc,
        parentPhone: r.phone || undefined,
      },
    })
  }
}
