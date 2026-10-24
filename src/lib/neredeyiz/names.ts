/** Normalize ders adı karşılaştırması (Schedule.subjectName ↔ Subject.name) */
export function normalizeSubjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR")
}

export function subjectNamesMatch(a: string, b: string): boolean {
  return normalizeSubjectName(a) === normalizeSubjectName(b)
}
