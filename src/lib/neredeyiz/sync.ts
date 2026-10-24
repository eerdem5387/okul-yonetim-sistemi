import { prisma } from "@/lib/prisma"
import type { Prisma, Subject } from "@prisma/client"
import { upsertBranchByName } from "@/lib/branches"

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

  const existing = await tx.subject.findFirst({
    where: {
      classId: classData.id,
      name: { equals: name, mode: "insensitive" },
    },
  })
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

  // Eski grade/section kayıtlarını classId ile bağla
  const legacy = await tx.subject.findFirst({
    where: {
      academicYearId: classData.academicYearId,
      grade: classData.grade,
      OR: [
        { section: classData.section },
        { section: null },
      ],
      name: { equals: name, mode: "insensitive" },
    },
  })
  if (legacy) {
    return tx.subject.update({
      where: { id: legacy.id },
      data: {
        classId: classData.id,
        grade: classData.grade,
        section: classData.section,
      },
    })
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
    const again = await tx.subject.findFirst({
      where: {
        classId: classData.id,
        name: { equals: name, mode: "insensitive" },
      },
    })
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

/**
 * Yeni sınıf oluşturulunca aktif ScheduleCourse katalogundan şablon Subject'ler.
 * Birimler/konular eklenmez — yalnızca ders kabuğu.
 */
export async function seedSubjectsForNewClass(
  classData: ClassLike,
  tx: Tx = prisma
): Promise<Subject[]> {
  const courses = await tx.scheduleCourse.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  const created: Subject[] = []
  for (const course of courses) {
    const subject = await ensureSubjectForClass(classData, course.name, tx)
    created.push(subject)
  }
  return created
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
 * Öğretmenin konu için SubjectAssignment'ı var mı?
 * Admin/müdür akışları reportedBy olmadan işaretleyebilir — o durumda true.
 */
export async function assertTeacherAssignedToTopic(
  topicId: string,
  staffId: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!staffId) {
    return { ok: true }
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: {
      unit: {
        select: {
          subject: {
            select: {
              id: true,
              classId: true,
              assignments: {
                where: { staffId },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  })

  if (!topic) {
    return { ok: false, error: "Konu bulunamadı" }
  }

  const subject = topic.unit.subject
  if (!subject.classId) {
    return { ok: false, error: "Ders bir sınıfa bağlı değil" }
  }

  if (subject.assignments.length === 0) {
    return {
      ok: false,
      error: "Bu derse atanmamışsınız; ilerleme kaydı oluşturamazsınız",
    }
  }

  return { ok: true }
}

/**
 * Kaynak sınıfın müfredatını (ünite/konu/alt konu) hedef sınıfa kopyalar.
 * Progress ve öğretmen ataması taşınmaz. Hedefte aynı adlı dersin üniteleri silinip yazılır.
 */
export async function copyClassCurriculum(params: {
  sourceClassId: string
  targetClassId: string
  subjectIds?: string[]
  includeDates: boolean
}): Promise<{ copiedSubjectIds: string[] }> {
  if (params.sourceClassId === params.targetClassId) {
    throw new Error("Kaynak ve hedef sınıf aynı olamaz")
  }

  const targetClass = await prisma.class.findUnique({
    where: { id: params.targetClassId },
    select: { id: true, academicYearId: true, grade: true, section: true },
  })
  if (!targetClass) throw new Error("Hedef sınıf bulunamadı")

  const sourceSubjects = await prisma.subject.findMany({
    where: {
      classId: params.sourceClassId,
      ...(params.subjectIds?.length ? { id: { in: params.subjectIds } } : {}),
    },
    include: {
      units: {
        orderBy: { order: "asc" },
        include: {
          topics: {
            orderBy: { order: "asc" },
            include: { subTopics: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  })

  if (sourceSubjects.length === 0) {
    throw new Error("Kopyalanacak ders bulunamadı")
  }

  const copiedSubjectIds: string[] = []

  await prisma.$transaction(async (tx) => {
    for (const src of sourceSubjects) {
      const target = await ensureSubjectForClass(targetClass, src.name, tx)
      await tx.unit.deleteMany({ where: { subjectId: target.id } })

      for (const unit of src.units) {
        const createdUnit = await tx.unit.create({
          data: {
            subjectId: target.id,
            name: unit.name,
            order: unit.order,
            description: unit.description,
          },
        })
        for (const topic of unit.topics) {
          const createdTopic = await tx.topic.create({
            data: {
              unitId: createdUnit.id,
              name: topic.name,
              order: topic.order,
              description: topic.description,
              estimatedDuration: topic.estimatedDuration,
              plannedStartWeek: params.includeDates ? topic.plannedStartWeek : null,
              plannedEndWeek: params.includeDates ? topic.plannedEndWeek : null,
              plannedStartDate: params.includeDates ? topic.plannedStartDate : null,
              plannedEndDate: params.includeDates ? topic.plannedEndDate : null,
            },
          })
          if (topic.subTopics.length > 0) {
            await tx.subTopic.createMany({
              data: topic.subTopics.map((st) => ({
                topicId: createdTopic.id,
                name: st.name,
                order: st.order,
              })),
            })
          }
        }
      }
      copiedSubjectIds.push(target.id)
    }
  })

  return { copiedSubjectIds }
}
