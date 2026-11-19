import { buildCalendar } from "../calendar"
import { buildAcademicWeeks, currentWeek, evaluateWeeklyTopic, needsLateReason, topicRange } from "../weeks"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}
const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

const cal = buildCalendar({
  academicYearId: "y",
  startDate: d("2026-09-14"), // Pazartesi
  endDate: d("2027-06-25"),
  weekendDays: ["SATURDAY", "SUNDAY"],
  holidays: [
    { startDate: d("2026-10-29"), endDate: d("2026-10-29"), blocksTeaching: true },
    { startDate: d("2027-01-25"), endDate: d("2027-02-05"), blocksTeaching: true }, // 2 haftalık yarıyıl
  ],
})
const weeks = buildAcademicWeeks(cal)
assert(weeks[0]!.index === 1 && weeks[0]!.startKey === "2026-09-14" && weeks[0]!.endKey === "2026-09-18", "week 1")
assert(weeks.find((w) => w.startKey === "2026-11-16")!.index === 10, "16 Kasım = 10. hafta")
const breaks = weeks.filter((w) => w.isBreak)
assert(breaks.length === 2 && breaks.every((w) => w.index === null), "yarıyıl 2 tatil haftası")
const afterBreak = weeks.find((w) => w.startKey === "2027-02-08")!
const beforeBreak = weeks.find((w) => w.startKey === "2027-01-18")!
assert(afterBreak.index === beforeBreak.index! + 1, "tatil haftaları numara almaz")
assert(currentWeek(weeks, "2026-11-18")!.index === 10, "current week")

const scope = { subjectId: "s", classId: "c", staffIds: [] }
const r = topicRange(weeks, 7, 8)!
assert(r.startKey === "2026-10-26" && r.endKey === "2026-11-06", "7.–8. hafta aralığı")

// 7–8. hafta, bugün 18 Kasım, tamamlanmadı → gecikti (9 Kas–18 Kas: 8 ders günü)
const late = evaluateWeeklyTopic({ plannedStartWeek: 7, plannedEndWeek: 8 }, null, weeks, cal, scope, "2026-11-18")
assert(late.state === "GECIKTI" && late.lateDays === 8, "gecikti " + late.lateDays)
// zamanında
const ok = evaluateWeeklyTopic({ plannedStartWeek: 7, plannedEndWeek: 8 }, { completedAt: d("2026-11-06") }, weeks, cal, scope, "2026-11-18")
assert(ok.state === "TAMAMLANDI", "zamanında")
// geç tamamlandı
const lateDone = evaluateWeeklyTopic({ plannedStartWeek: 7, plannedEndWeek: 8 }, { completedAt: d("2026-11-10") }, weeks, cal, scope, "2026-11-18")
assert(lateDone.state === "GEC_TAMAMLANDI" && lateDone.lateDays === 2, "geç tamamlandı")
assert(needsLateReason({ plannedStartWeek: 7, plannedEndWeek: 8 }, "2026-11-10", weeks, cal, scope), "sebep gerekir")
// Cuma biten konu, Pazar bakılınca henüz gecikmiş sayılmaz
const weekend = evaluateWeeklyTopic({ plannedStartWeek: 9, plannedEndWeek: 9 }, null, weeks, cal, scope, "2026-11-15")
assert(weekend.state === "BU_HAFTA", "hafta sonu gecikme yok")
assert(evaluateWeeklyTopic({ plannedStartWeek: 10, plannedEndWeek: 10 }, null, weeks, cal, scope, "2026-11-18").state === "BU_HAFTA", "bu hafta")
assert(evaluateWeeklyTopic({ plannedStartWeek: 12, plannedEndWeek: 12 }, null, weeks, cal, scope, "2026-11-18").state === "PLANLANDI", "ileride")
assert(evaluateWeeklyTopic({ plannedStartWeek: null, plannedEndWeek: null }, null, weeks, cal, scope, "2026-11-18").state === "PLANSIZ", "plansız")

console.log("weeks: ok")
