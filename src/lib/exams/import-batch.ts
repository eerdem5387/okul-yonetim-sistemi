import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { scoreAnswers } from "./scoring"
import { nameSimilarity, normalizeTc } from "./validation"
import type { ScanBatchSubmitInput } from "./types"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

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
  const summary = {
    total: input.items.length,
    matched: 0,
    unmatched: 0,
    lowConfidence: 0,
    duplicateTc: 0,
    outOfScope: 0,
  }

  const processedItems: Array<{
    item: (typeof input.items)[0]
    studentId: string | null
    errorCodes: string[]
    matchStatus: "MATCHED" | "UNMATCHED" | "MANUAL" | "LOW_CONFIDENCE"
  }> = []

  for (const item of input.items) {
    const errorCodes = [...(item.errorCodes ?? [])]
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

    const conf = item.confidenceScore ?? 1
    if (conf < LOW_CONFIDENCE) {
      errorCodes.push("LOW_CONFIDENCE")
      matchStatus = "LOW_CONFIDENCE"
      summary.lowConfidence++
    }

    const canImport =
      studentId &&
      matchStatus !== "UNMATCHED" &&
      !errorCodes.includes("DUPLICATE_TC") &&
      !errorCodes.includes("TC_MISSING")

    if (canImport) summary.matched++
    else summary.unmatched++

    processedItems.push({
      item,
      studentId: canImport ? studentId : null,
      errorCodes,
      matchStatus: canImport ? (matchStatus === "LOW_CONFIDENCE" ? "LOW_CONFIDENCE" : "MATCHED") : "UNMATCHED",
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
