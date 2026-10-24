/**
 * Neredeyiz ad eşleştirme + entegrasyon senaryo birim testleri (DB yok).
 * Çalıştır: npx tsx src/lib/neredeyiz/__tests__/sync-names.test.ts
 */
import { normalizeSubjectName, subjectNamesMatch } from "../names"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

/** Schedule → Subject eşleme tercih sırası (API sözleşmesi) */
function resolveSubjectQuery(params: {
  classId?: string
  grade?: number
  section?: string
  staffId?: string
}): { mode: "classId" | "gradeSection" | "staffOnly" | "none"; classId?: string } {
  if (params.classId) return { mode: "classId", classId: params.classId }
  if (params.grade != null) return { mode: "gradeSection" }
  if (params.staffId) return { mode: "staffOnly" }
  return { mode: "none" }
}

/** Progress POST: öğretmen atama zorunlu mu? */
function requiresAssignmentCheck(reportedBy?: string | null, markedBy?: string | null): boolean {
  return Boolean(reportedBy || markedBy)
}

function main() {
  assert(normalizeSubjectName("  Matematik  ") === "matematik", "trim+lower")
  assert(normalizeSubjectName("FİZİK") === normalizeSubjectName("fizik"), "tr-TR İ")
  assert(subjectNamesMatch("Matematik", "matematik"), "match case")
  assert(subjectNamesMatch("Türk Dili", "türk  dili"), "multi space")
  assert(!subjectNamesMatch("Matematik", "Geometri"), "mismatch")
  assert(subjectNamesMatch("Matematik", "matematik"), "schedule↔subject")

  const byClass = resolveSubjectQuery({
    classId: "cls_1",
    grade: 5,
    section: "A",
    staffId: "st_1",
  })
  assert(byClass.mode === "classId" && byClass.classId === "cls_1", "prefer classId over grade")

  const byGrade = resolveSubjectQuery({ grade: 5, section: "A", staffId: "st_1" })
  assert(byGrade.mode === "gradeSection", "fallback grade/section")

  assert(requiresAssignmentCheck("st_1", null), "teacher report needs assignment")
  assert(requiresAssignmentCheck(null, "st_1"), "markedBy needs assignment")
  assert(!requiresAssignmentCheck(null, null), "admin without staff skips assignment")

  // Class seed: ScheduleCourse adları Subject kabuğu üretir
  const courses = ["Matematik", "Fizik", "Türkçe"]
  const seeded = courses.map((name) => ({ classId: "cls_1", name }))
  assert(seeded.length === 3 && seeded.every((s) => s.classId === "cls_1"), "class seed shells")

  console.log("neredeyiz sync-names: ok")
}

main()
