import {
  buildCalendar,
  dayKey,
  evaluateTopic,
  teachingDaysAfter,
  validateRangeInYear,
} from "../calendar"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}
const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

// Türkiye saati: UTC 21:30 → ertesi gün
assert(dayKey(new Date("2026-06-18T21:30:00Z")) === "2026-06-19", "istanbul day key")

const cal = buildCalendar({
  academicYearId: "y",
  startDate: d("2026-09-14"),
  endDate: d("2027-06-25"),
  weekendDays: ["SATURDAY", "SUNDAY"],
  holidays: [
    { startDate: d("2026-10-29"), endDate: d("2026-10-29"), blocksTeaching: true }, // Perşembe
    { startDate: d("2026-11-02"), endDate: d("2026-11-02"), blocksTeaching: false }, // işlenebilir
  ],
  disruptions: [
    { startDate: d("2026-11-03"), endDate: d("2026-11-03"), scope: "CLASSES", affectedSubjects: [], affectedClassIds: ["c1"], affectedStaffIds: [] },
  ],
})
const scope = { subjectId: "s1", classId: "c1", staffIds: ["t1"] }
const other = { subjectId: "s2", classId: "c2", staffIds: ["t2"] }

// Cuma 23 Ekim → Cuma 30 Ekim: Pzt-Çar (3) + Cuma (1); 29 Ekim tatil, hafta sonu yok sayılır
assert(teachingDaysAfter(cal, "2026-10-23", "2026-10-30", scope) === 4, "weekend + holiday skipped")
// 2 Kasım işlenebilir tatil sayılır; 3 Kasım yalnız c1 için aksama
assert(teachingDaysAfter(cal, "2026-10-30", "2026-11-03", scope) === 1, "disruption for c1")
assert(teachingDaysAfter(cal, "2026-10-30", "2026-11-03", other) === 2, "disruption not for c2")

// Gecikme: plan bitişi Cuma 23 Ekim, bugün Pzt 26 Ekim → 1 ders günü
const late = evaluateTopic({ plannedStartDate: d("2026-10-19"), plannedEndDate: d("2026-10-23") }, null, cal, scope, "2026-10-26")
assert(late.state === "GECIKMELI" && late.delayDays === 1, "1 day late")
// Bitiş Cuma, bugün Pazar → gecikme yok (hafta sonu)
const weekend = evaluateTopic({ plannedStartDate: null, plannedEndDate: d("2026-10-23") }, null, cal, scope, "2026-10-25")
assert(weekend.state !== "GECIKMELI", "weekend is not delay")
// Onay bekleyen: bildirim anında gecikme donar
const pending = evaluateTopic(
  { plannedStartDate: null, plannedEndDate: d("2026-10-23") },
  { status: "PENDING_APPROVAL", actualEndDate: null, reportedAt: d("2026-10-23") },
  cal, scope, "2026-11-20",
)
assert(pending.state === "ONAY_BEKLIYOR" && pending.delayDays === 0, "pending frozen")
// Erken tamamlandı
const early = evaluateTopic(
  { plannedStartDate: null, plannedEndDate: d("2026-10-23") },
  { status: "TAMAMLANDI", actualEndDate: d("2026-10-21") },
  cal, scope, "2026-11-20",
)
assert(early.state === "ERKEN_TAMAMLANDI" && early.earlyDays === 2, "early")

assert(validateRangeInYear(cal, d("2026-09-01"), d("2026-09-20"), "Konu") !== null, "outside year")
assert(validateRangeInYear(cal, d("2026-10-05"), d("2026-10-01"), "Konu") !== null, "reversed")
assert(validateRangeInYear(cal, d("2026-10-01"), d("2026-10-05"), "Konu") === null, "ok range")

console.log("calendar: ok")
