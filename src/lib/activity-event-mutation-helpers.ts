import { Prisma, type LanguageLevel } from "@prisma/client"

/** Prisma enum ile aynı */
export const LANGUAGE_LEVEL_VALUES = new Set<string>(["A1", "A2", "B1", "B2", "C1", "C2"])

export function sanitizeMetadata(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw === null || raw === undefined) return undefined
  try {
    return JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue
  } catch {
    return undefined
  }
}

export function sanitizeEvidenceUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === "string" && u.length > 0)
}

export function parseParticipantScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = parseInt(String(value), 10)
  return Number.isFinite(n) ? n : null
}

export function parseParticipantLanguageLevel(value: unknown): LanguageLevel | null {
  if (value === null || value === undefined || value === "") return null
  const s = String(value).trim()
  if (!LANGUAGE_LEVEL_VALUES.has(s)) return null
  return s as LanguageLevel
}

export function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = parseInt(String(value), 10)
  return Number.isFinite(n) ? n : null
}

export type IncomingParticipant = {
  studentId: string
  score?: number
  languageLevel?: string
  extraDocumentUrl?: string
  artworkDescription?: string | null
  tournamentPlacement?: string | null
  projectRole?: string | null
}

export function validateParticipantsForCertificate(
  participants: IncomingParticipant[]
): { ok: true; normalized: IncomingParticipant[] } | { ok: false; error: string } {
  const participantStudentIds = participants.map((p) => String(p.studentId || "").trim())
  if (participantStudentIds.some((id) => !id)) {
    return { ok: false, error: "Katılımcı öğrenci kimliği eksik" }
  }
  const uniqueStudentIds = [...new Set(participantStudentIds)]
  if (uniqueStudentIds.length !== participantStudentIds.length) {
    return { ok: false, error: "Aynı öğrenci listede birden fazla kez eklenemez" }
  }

  return { ok: true, normalized: participants }
}
