/**
 * Çapraz senaryo sözleşmeleri (sınıf ↔ program ↔ neredeyiz) — saf mantık.
 * Çalıştır: npx tsx src/lib/neredeyiz/__tests__/sync-integration.test.ts
 */
import { subjectNamesMatch } from "../names"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

type FakeClass = { id: string; academicYearId: string; grade: number; section: string }
type FakeSubject = { id: string; classId: string; name: string; grade: number; section: string }
type FakeSchedule = {
  id: string
  classId: string
  subjectName: string
  subjectId: string | null
  teacherId: string
}
type FakeAssignment = { subjectId: string; staffId: string }

/** In-memory senkron: planın lifecycle kurallarını doğrular */
function syncScheduleInMemory(
  classes: FakeClass[],
  subjects: FakeSubject[],
  assignments: FakeAssignment[],
  schedule: FakeSchedule
): { subjects: FakeSubject[]; assignments: FakeAssignment[]; schedule: FakeSchedule } {
  const cls = classes.find((c) => c.id === schedule.classId)
  if (!cls) throw new Error("class missing")

  let subject = subjects.find(
    (s) => s.classId === cls.id && subjectNamesMatch(s.name, schedule.subjectName)
  )
  if (!subject) {
    subject = {
      id: `sub_${subjects.length + 1}`,
      classId: cls.id,
      name: schedule.subjectName.trim(),
      grade: cls.grade,
      section: cls.section,
    }
    subjects = [...subjects, subject]
  }

  if (!assignments.some((a) => a.subjectId === subject!.id && a.staffId === schedule.teacherId)) {
    assignments = [...assignments, { subjectId: subject.id, staffId: schedule.teacherId }]
  }

  return {
    subjects,
    assignments,
    schedule: { ...schedule, subjectId: subject.id, subjectName: subject.name },
  }
}

function seedClassSubjects(
  cls: FakeClass,
  courseNames: string[],
  subjects: FakeSubject[]
): FakeSubject[] {
  const next = [...subjects]
  for (const name of courseNames) {
    if (!next.some((s) => s.classId === cls.id && subjectNamesMatch(s.name, name))) {
      next.push({
        id: `sub_${next.length + 1}`,
        classId: cls.id,
        name,
        grade: cls.grade,
        section: cls.section,
      })
    }
  }
  return next
}

function main() {
  const cls: FakeClass = {
    id: "c1",
    academicYearId: "y1",
    grade: 9,
    section: "A",
  }

  let subjects: FakeSubject[] = []
  subjects = seedClassSubjects(cls, ["Matematik", "Fizik"], subjects)
  assert(subjects.length === 2, "class create seeds subjects")
  assert(subjects.every((s) => s.classId === "c1" && s.grade === 9), "grade from class")

  let assignments: FakeAssignment[] = []
  const synced = syncScheduleInMemory( [cls], subjects, assignments, {
    id: "sch1",
    classId: "c1",
    subjectName: "matematik",
    subjectId: null,
    teacherId: "t1",
  })
  subjects = synced.subjects
  assignments = synced.assignments

  assert(synced.schedule.subjectId != null, "schedule gets subjectId")
  assert(subjectNamesMatch(synced.schedule.subjectName, "Matematik"), "name aligned")
  assert(
    assignments.some((a) => a.subjectId === synced.schedule.subjectId && a.staffId === "t1"),
    "assignment from schedule teacher"
  )

  // Aynı ders ikinci saat: yeni Subject açılmaz
  const synced2 = syncScheduleInMemory([cls], subjects, assignments, {
    id: "sch2",
    classId: "c1",
    subjectName: "Matematik",
    subjectId: null,
    teacherId: "t1",
  })
  assert(synced2.subjects.length === subjects.length, "no duplicate subject")
  assert(synced2.schedule.subjectId === synced.schedule.subjectId, "same subjectId")

  // Öğretmen classId ile ders görür; grade/section değil
  const teacherView = synced2.subjects.filter(
    (s) =>
      s.classId === "c1" &&
      assignments.some((a) => a.subjectId === s.id && a.staffId === "t1")
  )
  assert(teacherView.length >= 1, "teacher sees via classId+assignment")

  console.log("neredeyiz sync-integration: ok")
}

main()
