import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { nameSimilarity, normalizeTc } from "./validation"
import type { ScanBatchItemInput, ScanBatchSubmitInput } from "./types"
import { gradeLevelWhereClause, parseStudentGradeLevel } from "@/lib/student-grade-level"
import { alternateVariants, normalizeBookletVariant } from "./scoring"
import {
  SCAN_TX_OPTIONS,
  loadScoringContext,
  recomputeRankings,
  writeExamResults,
} from "./results"

const LOW_CONFIDENCE = 0.75

/** Okutma dosyası kabul edilen sınav durumları (incelemedeyken ek dosya da eklenebilir). */
export const SCAN_ACCEPTING_STATUSES = ["READY_FOR_SCAN", "SCANNING", "IN_REVIEW"] as const

export function isScanAccepting(status: string): boolean {
  return (SCAN_ACCEPTING_STATUSES as readonly string[]).includes(status)
}

function studentInExamScope(
  studentGrade: string,
  examGrade: number | null,
  examClassId: string | null,
  studentClassIds: string[]
): boolean {
  if (examClassId) return studentClassIds.includes(examClassId)
  if (examGrade != null) return parseStudentGradeLevel(studentGrade) === examGrade
  return true
}

export type MatchedItem = {
  item: ScanBatchItemInput
  studentId: string | null
  studentName: string | null
  errorCodes: string[]
  matchStatus: "MATCHED" | "UNMATCHED" | "MANUAL" | "LOW_CONFIDENCE"
}

export type MatchSummary = {
  total: number
  matched: number
  unmatched: number
  lowConfidence: number
  duplicateTc: number
  outOfScope: number
  nameMatched: number
  bookletMissing: number
  rescanned: number
}

/**
 * Kağıtları öğrencilerle eşleştirir (veritabanına yazmaz — önizleme ve kayıt aynı mantığı kullanır).
 * Sıra: TC → (TC yoksa) ad-soyad tek aday. Kapsam dışı öğrenci (başka şube/düzey) uyarıdır, engel değil.
 */
export async function matchScanItems(
  examId: string,
  items: ScanBatchItemInput[],
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      grade: true,
      classId: true,
      questions: { select: { questionNo: true, correctAnswer: true, bookletVariant: true } },
      results: { select: { studentId: true } },
    },
  })
  if (!exam) throw new Error("Sınav bulunamadı")

  const hasAltBooklets = alternateVariants(exam.questions).length > 0
  const alreadyScored = new Set(exam.results.map((r) => r.studentId))

  // TC'ler tek sorguda
  const tcs = [...new Set(items.map((i) => normalizeTc(i.tcNumber)).filter((t): t is string => Boolean(t)))]
  const byTc = new Map(
    (
      await db.student.findMany({
        where: { tcNumber: { in: tcs } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          tcNumber: true,
          classAssignments: { select: { classId: true } },
        },
      })
    ).map((s) => [s.tcNumber, s])
  )

  // Ad-soyad yedek eşleştirme adayları
  const scopeCandidates = await db.student.findMany({
    where: exam.grade != null ? gradeLevelWhereClause(exam.grade) : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      classAssignments: { select: { classId: true } },
    },
  })

  const seenTc = new Set<string>()
  const seenStudentIds = new Set<string>()
  const summary: MatchSummary = {
    total: items.length,
    matched: 0,
    unmatched: 0,
    lowConfidence: 0,
    duplicateTc: 0,
    outOfScope: 0,
    nameMatched: 0,
    bookletMissing: 0,
    rescanned: 0,
  }
  const matched: MatchedItem[] = []

  for (const item of items) {
    const errorCodes = [...(item.errorCodes ?? [])].filter((c) => c !== "TC_MISSING")
    const tc = normalizeTc(item.tcNumber)
    if (!tc) errorCodes.push("TC_MISSING")
    else if (seenTc.has(tc)) {
      errorCodes.push("DUPLICATE_TC")
      summary.duplicateTc++
    } else seenTc.add(tc)

    let studentId = item.studentId ?? null
    let studentName: string | null = null
    let matchStatus: MatchedItem["matchStatus"] = item.matchStatus
    let matchedViaName = false

    if (tc && !studentId) {
      const student = byTc.get(tc)
      if (!student) {
        errorCodes.push("STUDENT_NOT_FOUND")
        matchStatus = "UNMATCHED"
      } else {
        studentId = student.id
        studentName = `${student.firstName} ${student.lastName}`
        if (!studentInExamScope(student.grade, exam.grade, exam.classId, student.classAssignments.map((c) => c.classId))) {
          errorCodes.push("OUT_OF_SCOPE")
          summary.outOfScope++
        }
        if (item.studentNameRaw && nameSimilarity(item.studentNameRaw, studentName) < 0.6) {
          errorCodes.push("NAME_MISMATCH")
        }
      }
    }

    if (!studentId && item.studentNameRaw) {
      const scored = scopeCandidates
        .map((s) => ({
          student: s,
          score: nameSimilarity(item.studentNameRaw!, `${s.firstName} ${s.lastName}`),
          inScope: studentInExamScope(s.grade, exam.grade, exam.classId, s.classAssignments.map((c) => c.classId)),
        }))
        .filter((x) => x.inScope && x.score >= 0.85)
        .sort((a, b) => b.score - a.score)

      if (scored.length === 1) {
        studentId = scored[0].student.id
        studentName = `${scored[0].student.firstName} ${scored[0].student.lastName}`
        matchedViaName = true
        errorCodes.push("NAME_FALLBACK")
        summary.nameMatched++
        matchStatus = "MATCHED"
      } else if (scored.length > 1) {
        errorCodes.push("NAME_AMBIGUOUS")
        matchStatus = "UNMATCHED"
      } else if (!tc) {
        errorCodes.push("STUDENT_NOT_FOUND")
        matchStatus = "UNMATCHED"
      }
    }

    if (studentId && seenStudentIds.has(studentId)) {
      errorCodes.push("DUPLICATE_STUDENT")
      matchStatus = "UNMATCHED"
      studentId = null
      studentName = null
    } else if (studentId) {
      seenStudentIds.add(studentId)
    }

    if (studentId && alreadyScored.has(studentId)) {
      errorCodes.push("RESCANNED")
      summary.rescanned++
    }

    if (hasAltBooklets && !normalizeBookletVariant(item.bookletVariant)) {
      errorCodes.push("BOOKLET_MISSING")
      summary.bookletMissing++
    }

    const conf = item.confidenceScore ?? 1
    if (conf < LOW_CONFIDENCE) {
      errorCodes.push("LOW_CONFIDENCE")
      matchStatus = "LOW_CONFIDENCE"
      summary.lowConfidence++
    }

    const canImport =
      Boolean(studentId) &&
      matchStatus !== "UNMATCHED" &&
      !errorCodes.includes("DUPLICATE_TC") &&
      !errorCodes.includes("DUPLICATE_STUDENT") &&
      (Boolean(tc) || matchedViaName || Boolean(item.studentId))

    if (canImport) summary.matched++
    else summary.unmatched++

    matched.push({
      item,
      studentId: canImport ? studentId : null,
      studentName: canImport ? studentName : null,
      errorCodes,
      matchStatus: canImport ? (matchStatus === "LOW_CONFIDENCE" ? "LOW_CONFIDENCE" : "MATCHED") : "UNMATCHED",
    })
  }

  return { matched, summary }
}

export async function processScanBatch(examId: string, operatorId: string, input: ScanBatchSubmitInput) {
  const existing = await prisma.examScanBatch.findUnique({
    where: { externalBatchId: input.batchId },
    include: { items: true },
  })
  if (existing) return { duplicate: true as const, batch: existing }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, status: true, definitionVersion: true },
  })
  if (!exam) throw new Error("Sınav bulunamadı")
  if (exam.definitionVersion !== input.definitionVersion) {
    throw new Error("Sınav tanım sürümü uyuşmuyor")
  }
  if (!isScanAccepting(exam.status)) {
    throw new Error("Sınav okutmaya açık değil. Önce 'Okutmaya aç' deyin.")
  }

  const { matched, summary } = await matchScanItems(examId, input.items)

  const batch = await prisma.$transaction(async (tx) => {
    const ctx = await loadScoringContext(tx, examId)
    if (!ctx) throw new Error("Sınav bulunamadı")

    const importable = matched.filter((m) => m.studentId)
    const resultIds = await writeExamResults(
      tx,
      ctx,
      importable.map((m) => ({
        studentId: m.studentId!,
        bookletVariant: normalizeBookletVariant(m.item.bookletVariant),
        answers: m.item.answers,
      })),
      operatorId
    )

    const created = await tx.examScanBatch.create({
      data: {
        externalBatchId: input.batchId,
        examId,
        definitionVersion: input.definitionVersion,
        templateId: input.templateId,
        status: "PROCESSED",
        operatorId,
        operatorNote: input.operatorNote ?? null,
        summaryJson: summary as unknown as Prisma.InputJsonValue,
      },
    })

    await tx.examScanBatchItem.createMany({
      data: matched.map((m) => ({
        batchId: created.id,
        itemIndex: m.item.itemIndex,
        tcNumber: normalizeTc(m.item.tcNumber),
        studentNameRaw: m.item.studentNameRaw ?? null,
        studentId: m.studentId,
        bookletVariant: normalizeBookletVariant(m.item.bookletVariant),
        matchStatus: m.matchStatus,
        confidenceScore: m.item.confidenceScore ?? null,
        errorCodes: m.errorCodes,
        answersJson: m.item.answers as unknown as Prisma.InputJsonValue,
        examResultId: m.studentId ? (resultIds.get(m.studentId) ?? null) : null,
      })),
    })

    await tx.exam.update({ where: { id: examId }, data: { status: "IN_REVIEW" } })
    await recomputeRankings(tx, examId)
    return created
  }, SCAN_TX_OPTIONS)

  return { duplicate: false as const, batch, summary }
}

/** Eşleşmeyen (ya da yanlış eşleşen) bir kağıdı elle bir öğrenciye bağlar ve puanlar. */
export async function assignScanItem(examId: string, itemId: string, studentId: string, operatorId: string) {
  const item = await prisma.examScanBatchItem.findFirst({
    where: { id: itemId, batch: { examId } },
    select: { id: true, bookletVariant: true, answersJson: true, errorCodes: true, examResultId: true },
  })
  if (!item) throw new Error("Kağıt bulunamadı")
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { status: true } })
  if (!exam || !isScanAccepting(exam.status)) throw new Error("Bu durumdaki sınavda eşleştirme yapılamaz")
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } })
  if (!student) throw new Error("Öğrenci bulunamadı")

  await prisma.$transaction(async (tx) => {
    const ctx = await loadScoringContext(tx, examId)
    if (!ctx) throw new Error("Sınav bulunamadı")
    // Kağıt önce başka öğrenciye bağlıysa o sonucu kaldır
    if (item.examResultId) {
      await tx.examScanBatchItem.update({ where: { id: item.id }, data: { examResultId: null } })
      await tx.examResult.delete({ where: { id: item.examResultId } }).catch(() => undefined)
    }
    const ids = await writeExamResults(
      tx,
      ctx,
      [{ studentId, bookletVariant: item.bookletVariant, answers: item.answersJson as unknown as ScanBatchItemInput["answers"] }],
      operatorId
    )
    await tx.examScanBatchItem.update({
      where: { id: item.id },
      data: {
        studentId,
        matchStatus: "MANUAL",
        examResultId: ids.get(studentId) ?? null,
        errorCodes: item.errorCodes.filter((c) => !["STUDENT_NOT_FOUND", "NAME_AMBIGUOUS", "DUPLICATE_STUDENT"].includes(c)),
      },
    })
    await recomputeRankings(tx, examId)
  }, SCAN_TX_OPTIONS)
}

/** Bir okutmayı (batch) ve ondan gelen sonuçları geri alır. Okutma kalmazsa sınav okutmaya hazır durumuna döner. */
export async function deleteScanBatch(examId: string, externalBatchId: string) {
  const batch = await prisma.examScanBatch.findFirst({
    where: { examId, externalBatchId },
    select: { id: true, items: { select: { examResultId: true } } },
  })
  if (!batch) throw new Error("Okutma bulunamadı")
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { status: true } })
  if (!exam || !isScanAccepting(exam.status)) throw new Error("Yayınlanmış sınavın okutması silinemez")

  await prisma.$transaction(async (tx) => {
    const resultIds = batch.items.map((i) => i.examResultId).filter((id): id is string => Boolean(id))
    await tx.examScanBatch.delete({ where: { id: batch.id } })
    if (resultIds.length) await tx.examResult.deleteMany({ where: { id: { in: resultIds } } })
    const left = await tx.examScanBatch.count({ where: { examId } })
    if (left === 0) await tx.exam.update({ where: { id: examId }, data: { status: "READY_FOR_SCAN" } })
    await recomputeRankings(tx, examId)
  }, SCAN_TX_OPTIONS)
}

/** İncelemeyi reddet: tüm okutmalar ve sonuçlar silinir, sınav okutmaya hazır durumuna döner. */
export async function discardAllScans(examId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.examScanBatch.deleteMany({ where: { examId } })
    await tx.examResult.deleteMany({ where: { examId } })
    await tx.exam.update({ where: { id: examId }, data: { status: "READY_FOR_SCAN" } })
  }, SCAN_TX_OPTIONS)
}
