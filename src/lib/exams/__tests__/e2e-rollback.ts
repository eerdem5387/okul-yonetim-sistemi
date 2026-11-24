/**
 * Uçtan uca optik okuma denemesi — CANLI veritabanında tek işlem içinde çalışır ve sonunda GERİ ALINIR.
 * Hiçbir kayıt kalıcı olmaz. Çalıştırma: npx tsx src/lib/exams/__tests__/e2e-rollback.ts
 */
import { readFileSync } from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { deviceTxtRowsToBatchItems, parseDeviceTxtContent, resolveTxtLayout } from "../device-txt-parser"
import { matchScanItems } from "../import-batch"
import { loadScoringContext, recomputeRankings, writeExamResults } from "../results"
import { evaluateExamReadiness } from "../validation"

const ROLLBACK = new Error("ROLLBACK")
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error("BAŞARISIZ: " + msg)
}

async function main() {
  const root = process.cwd()
  const layoutJson = JSON.parse(readFileSync(path.join(root, "packages/exam-import-contract/templates/device-txt-v1.json"), "utf-8"))
  const txt = new Uint8Array(readFileSync(path.join(root, "packages/exam-import-contract/fixtures/sample-markview-tyt.txt")))
  const staff = await prisma.staff.findFirst({ where: { isActive: true }, select: { id: true } })
  assert(staff, "personel yok")

  try {
    await prisma.$transaction(
      async (tx) => {
        const template = await tx.examScanTemplate.create({
          data: { templateKey: `e2e-${Date.now()}`, publisher: "Test", version: "1", label: "E2E", questionCount: 120, layoutJson },
        })
        const exam = await tx.exam.create({
          data: {
            name: "E2E GERI ALINACAK",
            examType: "YKS",
            examDate: new Date(),
            grade: 12,
            status: "READY_FOR_SCAN",
            createdById: staff!.id,
            scanTemplateId: template.id,
          },
        })
        const blocks = [
          ["Türkçe", 1, 40],
          ["Sosyal", 41, 60],
          ["Matematik", 61, 100],
          ["Fen", 101, 120],
        ] as const
        for (const [i, [name, a, b]] of blocks.entries()) {
          const sec = await tx.examSection.create({ data: { examId: exam.id, name, questionStart: a, questionEnd: b, sortOrder: i } })
          const qs = []
          for (let n = a; n <= b; n++) qs.push({ examId: exam.id, sectionId: sec.id, questionNo: n, sortOrder: n, correctAnswer: "ABCDE"[n % 5] })
          await tx.examQuestion.createMany({ data: qs })
        }
        // B kitapçığı: Türkçe için farklı anahtar
        const bRows = []
        for (let n = 1; n <= 40; n++) bRows.push({ examId: exam.id, questionNo: n, sortOrder: n, bookletVariant: "B", correctAnswer: "EDCBA"[n % 5] })
        await tx.examQuestion.createMany({ data: bRows })

        const full = await tx.exam.findUnique({ where: { id: exam.id }, include: { sections: true, questions: true, scanTemplate: true } })
        const readiness = evaluateExamReadiness(full!)
        assert(readiness.ready, "hazır olmalı: " + readiness.issues.join("; "))
        assert(readiness.questionCount === 120, "A soru sayısı 120 olmalı (B satırları sayılmaz)")

        const layout = resolveTxtLayout(layoutJson)
        assert(layout, "şablon çözülmeli")
        const parsed = parseDeviceTxtContent({ bytes: txt }, layout!)
        assert(parsed.encodingUsed === "windows-1254", "CP1254 algılanmalı: " + parsed.encodingUsed)
        const items = deviceTxtRowsToBatchItems(parsed.rows)
        items[0].bookletVariant = "B" // B kitapçığı yolunu da dene

        // İlk 5 satırın adlarıyla geçici öğrenciler (geri alınacak)
        for (const [i, row] of parsed.rows.slice(0, 5).entries()) {
          await tx.student.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName.replace(/\*/g, "").trim(),
              tcNumber: `9999999${String(1000 + i)}`,
              birthDate: new Date("2008-01-01"),
              grade: "12. Sınıf",
              address: "-", motherName: "-", motherTc: "-", motherPhone: "-", motherAddress: "-", motherOccupation: "-",
              fatherName: "-", fatherTc: "-", fatherPhone: "-", fatherAddress: "-", fatherOccupation: "-",
            },
          })
        }

        const { matched, summary } = await matchScanItems(exam.id, items, tx)
        console.log("özet:", JSON.stringify(summary))
        assert(summary.matched >= 5, "en az 5 isimle eşleşme bekleniyordu")

        const ctx = await loadScoringContext(tx, exam.id)
        const t0 = Date.now()
        const ids = await writeExamResults(
          tx,
          ctx!,
          matched.filter((m) => m.studentId).map((m) => ({ studentId: m.studentId!, bookletVariant: m.item.bookletVariant ?? null, answers: m.item.answers })),
          staff!.id
        )
        await recomputeRankings(tx, exam.id)
        console.log(`yazma: ${ids.size} sonuç, ${Date.now() - t0} ms`)

        const results = await tx.examResult.findMany({
          where: { examId: exam.id },
          select: { netScore: true, ranking: true, percentile: true, bookletVariant: true, scores: true, _count: { select: { answers: true } } },
          orderBy: { ranking: "asc" },
        })
        for (const r of results) {
          const sections = (r.scores as { sections: Array<{ name: string; net: number }> }).sections
          console.log(`sıra ${r.ranking} (%${r.percentile}) kit ${r.bookletVariant ?? "-"} net ${r.netScore} cevap ${r._count.answers} | ${sections.map((s) => `${s.name} ${s.net}`).join(", ")}`)
          assert(r._count.answers === 120, "120 cevap kaydı")
          assert(sections.length === 4, "4 ders neti")
          assert(r.ranking != null && r.percentile != null, "sıra/yüzdelik dolu")
        }
        const bWithB = await tx.examResultAnswer.count({
          where: { examResult: { examId: exam.id, bookletVariant: "B" }, questionNo: { lte: 40 }, question: { bookletVariant: "B" } },
        })
        console.log("B kitapçığı Türkçe cevaplarının B sorusuna bağlandığı kayıt:", bWithB)
        assert(bWithB === 40, "B kitapçıklı öğrencinin 40 Türkçe cevabı B sorularına bağlanmalı")
        throw ROLLBACK
      },
      { timeout: 120_000, maxWait: 10_000 }
    )
  } catch (e) {
    if (e !== ROLLBACK) throw e
    console.log("E2E OK — tüm kayıtlar geri alındı")
  } finally {
    await prisma.$disconnect()
  }
}

void main()
