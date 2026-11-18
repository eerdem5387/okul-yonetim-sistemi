import { prisma } from "@/lib/prisma"
import type { Prisma, Subject } from "@prisma/client"
import { upsertBranchByName } from "@/lib/branches"

import { normalizeSubjectName } from "@/lib/neredeyiz/names"

export { normalizeSubjectName, subjectNamesMatch } from "@/lib/neredeyiz/names"

export type ClassLike = {
  id: string
  academicYearId: string
  grade: number
  section: string
}

type Tx = Prisma.TransactionClient | typeof prisma

async function resolveBranchId(name: string): Promise<string | null> {
  const branch = await upsertBranchByName(name.trim())
  return branch?.id ?? null
}

/**
 * Sınıf + ders adı için Subject bul veya oluştur.
 * grade/section Class'tan türetilir; classId zorunlu.
 */
export async function ensureSubjectForClass(
  classData: ClassLike,
  subjectName: string,
  tx: Tx = prisma
): Promise<Subject> {
  const name = subjectName.trim()
  if (!name) {
    throw new Error("Ders adı zorunludur")
  }

  // Türkçe karakterler (İ/ı) için veritabanının "insensitive" karşılaştırması güvenilir değil → JS'te normalize et
  const wanted = normalizeSubjectName(name)
  const classSubjects = await tx.subject.findMany({ where: { classId: classData.id } })
  const existing = classSubjects.find((s) => normalizeSubjectName(s.name) === wanted) ?? null
  if (existing) {
    // grade/section drift düzelt
    if (
      existing.grade !== classData.grade ||
      existing.section !== classData.section ||
      existing.academicYearId !== classData.academicYearId
    ) {
      return tx.subject.update({
        where: { id: existing.id },
        data: {
          grade: classData.grade,
          section: classData.section,
          academicYearId: classData.academicYearId,
        },
      })
    }
    return existing
  }

  const branchId = await resolveBranchId(name)

  try {
    return await tx.subject.create({
      data: {
        academicYearId: classData.academicYearId,
        name,
        grade: classData.grade,
        section: classData.section,
        classId: classData.id,
        branchId,
      },
    })
  } catch (err) {
    // unique yarışı
    const again = (await tx.subject.findMany({ where: { classId: classData.id } })).find(
      (s) => normalizeSubjectName(s.name) === wanted,
    )
    if (again) return again
    throw err
  }
}

/** Ders programı öğretmenini neredeyiz SubjectAssignment ile hizala */
export async function ensureSubjectAssignment(
  subjectId: string,
  staffId: string,
  tx: Tx = prisma
): Promise<void> {
  await tx.subjectAssignment.upsert({
    where: {
      subjectId_staffId: { subjectId, staffId },
    },
    create: { subjectId, staffId },
    update: {},
  })
}

export type SyncScheduleResult = {
  subjectId: string
  subject: Subject
}

/**
 * Schedule satırı için Subject + Assignment senkronu.
 * Schedule otoritesidir: subjectName + teacherId → Subject / SubjectAssignment.
 */
export async function syncScheduleToNeredeyiz(params: {
  classId: string
  subjectName: string
  teacherId: string
  scheduleId?: string
  tx?: Tx
}): Promise<SyncScheduleResult> {
  const tx = params.tx ?? prisma
  const classData = await tx.class.findUnique({
    where: { id: params.classId },
    select: { id: true, academicYearId: true, grade: true, section: true },
  })
  if (!classData) {
    throw new Error("Sınıf bulunamadı")
  }

  const subject = await ensureSubjectForClass(classData, params.subjectName, tx)
  await ensureSubjectAssignment(subject.id, params.teacherId, tx)

  if (params.scheduleId) {
    await tx.schedule.update({
      where: { id: params.scheduleId },
      data: {
        subjectId: subject.id,
        subjectName: params.subjectName.trim(),
      },
    })
  }

  return { subjectId: subject.id, subject }
}

/** Class grade/section değişince bağlı Subject alanlarını güncelle */
export async function syncSubjectsFromClassUpdate(
  classId: string,
  data: { grade?: number; section?: string; academicYearId?: string },
  tx: Tx = prisma
): Promise<number> {
  const patch: Prisma.SubjectUncheckedUpdateManyInput = {}
  if (data.grade !== undefined) patch.grade = data.grade
  if (data.section !== undefined) patch.section = data.section
  if (data.academicYearId !== undefined) patch.academicYearId = data.academicYearId
  if (Object.keys(patch).length === 0) return 0

  const result = await tx.subject.updateMany({
    where: { classId },
    data: patch,
  })
  return result.count
}

/**
 * Kaynak sınıfın müfredatını (ünite/konu) hedef sınıfa kopyalar; öğretmen ataması ve ilerleme taşınmaz.
 * Hedef derste ilerleme kaydı varsa o ders ATLANIR (ilerleme asla silinmez); yoksa üniteleri değiştirilir.
 * Tarihler yalnız iki sınıf aynı akademik yıldaysa kopyalanır.
 */
export async function copyClassCurriculum(params: {
  sourceClassId: string
  targetClassId: string
  subjectIds?: string[]
  includeDates: boolean
}): Promise<{ copiedSubjectIds: string[]; skipped: Array<{ name: string; reason: string }> }> {
  if (params.sourceClassId === params.targetClassId) {
    throw new Error("Kaynak ve hedef sınıf aynı olamaz")
  }

  const [sourceClass, targetClass] = await Promise.all([
    prisma.class.findUnique({ where: { id: params.sourceClassId }, select: { academicYearId: true } }),
    prisma.class.findUnique({
      where: { id: params.targetClassId },
      select: { id: true, academicYearId: true, grade: true, section: true },
    }),
  ])
  if (!sourceClass) throw new Error("Kaynak sınıf bulunamadı")
  if (!targetClass) throw new Error("Hedef sınıf bulunamadı")
  const copyDates = params.includeDates && sourceClass.academicYearId === targetClass.academicYearId

  const sourceSubjects = await prisma.subject.findMany({
    where: {
      classId: params.sourceClassId,
      ...(params.subjectIds?.length ? { id: { in: params.subjectIds } } : {}),
    },
    include: {
      units: { orderBy: { order: "asc" }, include: { topics: { orderBy: { order: "asc" } } } },
    },
  })
  if (sourceSubjects.length === 0) {
    throw new Error("Kopyalanacak ders bulunamadı")
  }

  const copiedSubjectIds: string[] = []
  const skipped: Array<{ name: string; reason: string }> = []

  await prisma.$transaction(
    async (tx) => {
      for (const src of sourceSubjects) {
        const target = await ensureSubjectForClass(targetClass, src.name, tx)
        const progressCount = await tx.progress.count({ where: { topic: { unit: { subjectId: target.id } } } })
        if (progressCount > 0) {
          skipped.push({ name: src.name, reason: `hedefte ${progressCount} ilerleme kaydı var` })
          continue
        }
        await tx.unit.deleteMany({ where: { subjectId: target.id } })
        for (const unit of src.units) {
          await tx.unit.create({
            data: {
              subjectId: target.id,
              name: unit.name,
              order: unit.order,
              description: unit.description,
              topics: {
                create: unit.topics.map((topic) => ({
                  name: topic.name,
                  order: topic.order,
                  description: topic.description,
                  plannedStartDate: copyDates ? topic.plannedStartDate : null,
                  plannedEndDate: copyDates ? topic.plannedEndDate : null,
                })),
              },
            },
          })
        }
        copiedSubjectIds.push(target.id)
      }
    },
    { timeout: 30_000 },
  )

  return { copiedSubjectIds, skipped }
}
