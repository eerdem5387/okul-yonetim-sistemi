import type { ExamStatus } from "@prisma/client"

const TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  DRAFT: ["CONFIGURED", "ARCHIVED"],
  CONFIGURED: ["DRAFT", "READY_FOR_SCAN", "ARCHIVED"],
  READY_FOR_SCAN: ["CONFIGURED", "SCANNING", "ARCHIVED"],
  SCANNING: ["IN_REVIEW", "READY_FOR_SCAN"],
  IN_REVIEW: ["READY_FOR_SCAN", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
}

export function canTransition(from: ExamStatus, to: ExamStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: ExamStatus, to: ExamStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Geçersiz durum geçişi: ${from} → ${to}`)
  }
}

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT: "Taslak",
  CONFIGURED: "Yapılandırıldı",
  READY_FOR_SCAN: "Okutmaya hazır",
  SCANNING: "Okutuluyor",
  IN_REVIEW: "İncelemede",
  PUBLISHED: "Yayınlandı",
  ARCHIVED: "Arşiv",
}
