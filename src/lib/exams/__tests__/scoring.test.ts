import { computeNet, resolveKeyMap, scoreAnswers, scoringRuleFor } from "../scoring"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const ans = (s: string) =>
  s.split("").map((ch, i) => ({
    questionNo: i + 1,
    givenAnswer: ch === "." || ch === "*" ? null : ch,
    isBlank: ch === ".",
    isAmbiguous: ch === "*",
  }))

// Net kuralları
assert(scoringRuleFor({ examType: "LGS", grade: 8 }).wrongsPerCorrect === 3, "LGS 3 yanlış")
assert(scoringRuleFor({ examType: "DENEME", grade: 7 }).wrongsPerCorrect === 3, "ortaokul denemesi 3 yanlış")
assert(scoringRuleFor({ examType: "YKS", grade: 12 }).wrongsPerCorrect === 4, "YKS 4 yanlış")
assert(scoringRuleFor({ examType: "DENEME", grade: 10 }).wrongsPerCorrect === 4, "lise denemesi 4 yanlış")
assert(computeNet(15, 6, 3) === 13, `LGS 15D 6Y = 13 (${computeNet(15, 6, 3)})`)
assert(computeNet(15, 6, 4) === 13.5, "YKS 15D 6Y = 13.5")
assert(computeNet(10, 1, 3) === 9.67, `yuvarlama ${computeNet(10, 1, 3)}`)

// A/B kitapçık
const keys = [
  ...[..."ABCDA"].map((c, i) => ({ questionNo: i + 1, correctAnswer: c, bookletVariant: null })),
  ...[..."DCBAD"].map((c, i) => ({ questionNo: i + 1, correctAnswer: c, bookletVariant: "B" })),
]
assert(resolveKeyMap(keys, null).get(1) === "A", "kitapçıksız → A anahtarı")
assert(resolveKeyMap(keys, "2B").get(1) === "D", "B kitapçığı → B anahtarı")
const rule = { wrongsPerCorrect: 4, ambiguousCountsAsWrong: true }
const a = scoreAnswers(ans("ABCDA"), keys, "A", rule)
const b = scoreAnswers(ans("DCBAD"), keys, "B", rule)
assert(a.correctCount === 5 && b.correctCount === 5, "her kitapçık kendi anahtarıyla tam puan")
const bWrongKey = scoreAnswers(ans("DCBAD"), keys, "A", rule)
assert(bWrongKey.correctCount === 0, "B cevapları A anahtarıyla puanlanırsa yanlış çıkar (eski hata)")

// Çift işaret yanlış sayılır, boş sayılmaz
const c = scoreAnswers(ans("AB*.A"), keys, null, rule)
assert(c.correctCount === 3 && c.wrongCount === 1 && c.blankCount === 1 && c.ambiguousCount === 1, JSON.stringify(c))

// Ders bazlı net
const d = scoreAnswers(ans("ABCDA"), keys, null, { wrongsPerCorrect: 3, ambiguousCountsAsWrong: true }, [
  { name: "Türkçe", questionStart: 1, questionEnd: 3 },
  { name: "Matematik", questionStart: 4, questionEnd: 5 },
])
assert(d.sections.length === 2 && d.sections[0].net === 3 && d.sections[1].net === 2, JSON.stringify(d.sections))

console.log("scoring tests OK")

// Toplam net = ders netlerinin toplamı; net eksiye düşebilir
const e = scoreAnswers(ans("EEEEA"), keys, null, { wrongsPerCorrect: 4, ambiguousCountsAsWrong: true }, [
  { name: "T", questionStart: 1, questionEnd: 4 },
  { name: "M", questionStart: 5, questionEnd: 5 },
])
assert(e.sections[0].net === -1 && e.sections[1].net === 1 && e.netScore === 0, JSON.stringify(e.sections) + e.netScore)
console.log("net tutarlılık OK")
