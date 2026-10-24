export const DISRUPTION_SCOPES = ["SCHOOL", "CLASSES", "SUBJECTS", "TEACHER"] as const
export type DisruptionScopeValue = (typeof DISRUPTION_SCOPES)[number]

export function parseDisruptionScope(body: {
  scope?: string
  affectedSubjects?: unknown
  affectedClassIds?: unknown
  affectedStaffIds?: unknown
}):
  | {
      ok: true
      scope: DisruptionScopeValue
      affectedSubjects: string[]
      affectedClassIds: string[]
      affectedStaffIds: string[]
    }
  | { ok: false; error: string } {
  const subjects = Array.isArray(body.affectedSubjects)
    ? body.affectedSubjects.map(String)
    : []
  const classIds = Array.isArray(body.affectedClassIds)
    ? body.affectedClassIds.map(String)
    : []
  const staffIds = Array.isArray(body.affectedStaffIds)
    ? body.affectedStaffIds.map(String)
    : []

  const rawScope = body.scope
  const inferred =
    rawScope ||
    (classIds.length ? "CLASSES" : staffIds.length ? "TEACHER" : subjects.length ? "SUBJECTS" : "SCHOOL")
  const scope = inferred as DisruptionScopeValue
  if (!DISRUPTION_SCOPES.includes(scope)) {
    return { ok: false, error: "Geçersiz aksama kapsamı" }
  }

  if (scope === "SCHOOL") {
    return {
      ok: true,
      scope,
      affectedSubjects: [],
      affectedClassIds: [],
      affectedStaffIds: [],
    }
  }
  if (scope === "CLASSES" && classIds.length === 0) {
    return { ok: false, error: "En az bir sınıf seçin" }
  }
  if (scope === "SUBJECTS" && subjects.length === 0) {
    return { ok: false, error: "En az bir ders seçin" }
  }
  if (scope === "TEACHER" && staffIds.length === 0) {
    return { ok: false, error: "En az bir öğretmen seçin" }
  }

  return {
    ok: true,
    scope,
    affectedSubjects: scope === "SUBJECTS" ? subjects : [],
    affectedClassIds: scope === "CLASSES" ? classIds : [],
    affectedStaffIds: scope === "TEACHER" ? staffIds : [],
  }
}
