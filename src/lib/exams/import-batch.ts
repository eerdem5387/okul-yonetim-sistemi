import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { scoreAnswers } from "./scoring"
import { nameSimilarity, normalizeTc } from "./validation"
import type { ScanBatchSubmitInput } from "./types"
import { gradeLevelWhereClause, parseStudentGradeLevel } from "@/lib/student-grade-level"

const LOW_CONFIDENCE = 0.75

function studentInExamScope(
  studentGrade: string,
  examGrade: number | null,
  examClassId: string | null,
  studentClassIds: string[]
): boolean {
  if (examClassId) {
    return studentClassIds.includes(examClassId)
  }
  if (examGrade != null) {
    const level = parseStudentGradeLevel(studentGrade)
    return level === examGrade
  }
  return true
}

export async function processScanBatch(
  examId: string,
  operatorId: string,
  input: ScanBatchSubmitInput
) {
  const existing = await prisma.examScanBatch.findUnique({
    where: { externalBatchId: input.batchId },
    include: { items: true },
  })
  if (existing) {
    return { duplicate: true as const, batch: existing }
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: true,
      scanTemplate: true,
    },
  })
  if (!exam) throw new Error("Sınav bulunamadı")
  if (exam.definitionVersion !== input.definitionVersion) {
    throw new Error("Sınav tanım sürümü uyuşmuyor")
  }
  if (exam.status !== "READY_FOR_SCAN" && exam.status !== "SCANNING") {
    throw new Error("Sınav okutmaya uygun durumda değil")
  }

  const seenTc = new Set<string>()
  const seenStudentIds = new Set<string>()
  const summary = {
    total: input.items.length,
    matched: 0,
    unmatched: 0,
    lowConfidence: 0,
    duplicateTc: 0,
    outOfScope: 0,
    nameMatched: 0,
  }

  // Ad-soyad yedek eşleştirme için kapsam adayları (TC yoksa)
  const scopeCandidates = await prisma.student.findMany({
    where: exam.grade != null ? gradeLevelWhereClause(exam.grade) : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      tcNumber: true,
      classAssignments: { select: { classId: true } },
    },
  })

  const processedItems: Array<{
    item: (typeof input.items)[0]
    studentId: string | null
    errorCodes: string[]
    matchStatus: "MATCHED" | "UNMATCHED" | "MANUAL" | "LOW_CONFIDENCE"
  }> = []

  for (const item of input.items) {
    const errorCodes = [...(item.errorCodes ?? [])].filter(
      (c) => c !== "TC_MISSING" // yeniden değerlendireceğiz
    )
    const tc = normalizeTc(item.tcNumber)
    if (!tc) errorCodes.push("TC_MISSING")
    else if (seenTc.has(tc)) {
      errorCodes.push("DUPLICATE_TC")
      summary.duplicateTc++
    } else {
      seenTc.add(tc)
    }

    let studentId = item.studentId ?? null
    let matchStatus = item.matchStatus
    let matchedViaName = false

    // 1) TC öncelikli
    if (tc && !studentId) {
      const student = await prisma.student.findUnique({
        where: { tcNumber: tc },
        include: {
          classAssignments: { select: { classId: true } },
        },
      })
      if (!student) {
        errorCodes.push("STUDENT_NOT_FOUND")
        matchStatus = "UNMATCHED"
      } else {
        studentId = student.id
        const inScope = studentInExamScope(
          student.grade,
          exam.grade,
          exam.classId,
          student.classAssignments.map((c) => c.classId)
        )
        if (!inScope) {
          errorCodes.push("OUT_OF_SCOPE")
          summary.outOfScope++
        }
        if (item.studentNameRaw) {
          const fullName = `${student.firstName} ${student.lastName}`
          const sim = nameSimilarity(item.studentNameRaw, fullName)
          if (sim < 0.6) errorCodes.push("NAME_MISMATCH")
        }
      }
    }

    // 2) TC yoksa ad-soyad (tek yüksek skorlu aday)
    if (!studentId && item.studentNameRaw) {
      const scored = scopeCandidates
        .map((s) => ({
          student: s,
          score: nameSimilarity(item.studentNameRaw!, `${s.firstName} ${s.lastName}`),
          inScope: studentInExamScope(
            s.grade,
            exam.grade,
            exam.classId,
            s.classAssignments.map((c) => c.classId)
          ),
        }))
        .filter((x) => x.inScope && x.score >= 0.85)
        .sort((a, b) => b.score - a.score)

      if (scored.length === 1) {
        studentId = scored[0].student.id
        matchedViaName = true
        errorCodes.push("NAME_FALLBACK")
        summary.nameMatched++
        // TC eksik ama isimle bulundu — TC_MISSING kalsın (incelemede görünsün)
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
    } else if (studentId) {
      seenStudentIds.add(studentId)
    }

    const conf = item.confidenceScore ?? 1
    if (conf < LOW_CONFIDENCE) {
      errorCodes.push("LOW_CONFIDENCE")
      matchStatus = "LOW_CONFIDENCE"
      summary.lowConfidence++
    }

    // TC ile eşleşen veya isim yedek eşleşmesi (NAME_FALLBACK) sonuç yazılabilir
    const canImport =
      Boolean(studentId) &&
      matchStatus !== "UNMATCHED" &&
      !errorCodes.includes("DUPLICATE_TC") &&
      !errorCodes.includes("DUPLICATE_STUDENT") &&
      !errorCodes.includes("OUT_OF_SCOPE") &&
      (Boolean(tc) || matchedViaName)

    if (canImport) summary.matched++
    else summary.unmatched++

    processedItems.push({
      item,
      studentId: canImport ? studentId : null,
      errorCodes,
      matchStatus: canImport
        ? matchStatus === "LOW_CONFIDENCE"
          ? "LOW_CONFIDENCE"
          : "MATCHED"
        : "UNMATCHED",
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.exam.update({
      where: { id: examId },
      data: { status: "IN_REVIEW" },
    })

    const batch = await tx.examScanBatch.create({
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

    for (const row of processedItems) {
      const batchItem = await tx.examScanBatchItem.create({
        data: {
          batchId: batch.id,
          itemIndex: row.item.itemIndex,
          tcNumber: normalizeTc(row.item.tcNumber),
          studentNameRaw: row.item.studentNameRaw ?? null,
          studentId: row.studentId,
          bookletVariant: row.item.bookletVariant ?? null,
          matchStatus: row.matchStatus,
          confidenceScore: row.item.confidenceScore ?? null,
          errorCodes: row.errorCodes,
          answersJson: row.item.answers as unknown as Prisma.InputJsonValue,
        },
      })

      if (!row.studentId) continue

      const scored = scoreAnswers(
        row.item.answers,
        exam.questions.map((q) => ({
          questionNo: q.questionNo,
          correctAnswer: q.correctAnswer,
          bookletVariant: q.bookletVariant,
        })),
        row.item.bookletVariant
      )

      const examResult = await tx.examResult.upsert({
        where: {
          examId_studentId: { examId, studentId: row.studentId },
        },
        create: {
          examId,
          studentId: row.studentId,
          definitionVersion: exam.definitionVersion,
          bookletVariant: row.item.bookletVariant ?? null,
          scores: {
            summary: {
              correct: scored.correctCount,
              wrong: scored.wrongCount,
              blank: scored.blankCount,
              net: scored.netScore,
            },
          } as Prisma.InputJsonValue,
          totalScore: scored.netScore,
          correctCount: scored.correctCount,
          wrongCount: scored.wrongCount,
          blankCount: scored.blankCount,
          netScore: scored.netScore,
          enteredById: operatorId,
        },
        update: {
          definitionVersion: exam.definitionVersion,
          bookletVariant: row.item.bookletVariant ?? null,
          scores: {
            summary: {
              correct: scored.correctCount,
              wrong: scored.wrongCount,
              blank: scored.blankCount,
              net: scored.netScore,
            },
          } as Prisma.InputJsonValue,
          totalScore: scored.netScore,
          correctCount: scored.correctCount,
          wrongCount: scored.wrongCount,
          blankCount: scored.blankCount,
          netScore: scored.netScore,
          enteredById: operatorId,
        },
      })

      await tx.examResultAnswer.deleteMany({ where: { examResultId: examResult.id } })
      for (const ans of scored.answers) {
        const q = exam.questions.find((qq) => qq.questionNo === ans.questionNo)
        await tx.examResultAnswer.create({
          data: {
            examResultId: examResult.id,
            questionId: q?.id ?? null,
            questionNo: ans.questionNo,
            givenAnswer: ans.givenAnswer ?? null,
            isCorrect: ans.isCorrect,
            isBlank: ans.isBlank,
            isAmbiguous: ans.isAmbiguous,
          },
        })
      }

      await tx.examScanBatchItem.update({
        where: { id: batchItem.id },
        data: { examResultId: examResult.id },
      })
    }

    return batch
  })

  return { duplicate: false as const, batch: result, summary }
}
