/**
 * Faaliyet Ekleme – Form state tipleri (config-driven)
 */

import type { CategoryId } from "@/lib/ib-activity-config"

/** Ortak alanlar (tüm kategoriler) */
export interface FaaliyetCommon {
  title: string
  startDate: string
  endDate: string
  organizer: string
  description: string
  /** Düzenleme / detay: konum, süre, sonuç, kanıt linki */
  location?: string
  duration?: string
  outcome?: string
  evidence?: string
}

/** Katılımcı satırı: her öğrenci için puan, seviye, kişisel açıklama, katılım kanıt fotoğrafı */
export interface ParticipantRow {
  studentId: string
  studentName: string
  tcNumber: string
  grade: string
  successScore: number | ""
  achievementLevel: string
  personalDescription: string
  /** Faaliyete katılımı kanıtlayan fotoğraf URL (max 5MB) */
  participationPhotoUrl?: string
}

/** Form state – adım ve kategori değişince sıfırlanır */
export interface FaaliyetFormState {
  step: 1 | 2 | 3
  category: CategoryId | null
  subtype: string
  common: FaaliyetCommon
  teacherId: string
  teacherName: string
  participants: ParticipantRow[]
  /** Spor: sonuç belgesi dosya yükleme URL */
  resultDocumentUrl: string
}

export const initialCommon: FaaliyetCommon = {
  title: "",
  startDate: "",
  endDate: "",
  organizer: "",
  description: "",
}

export const initialFormState: FaaliyetFormState = {
  step: 1,
  category: null,
  subtype: "",
  common: initialCommon,
  teacherId: "",
  teacherName: "",
  participants: [],
  resultDocumentUrl: "",
}
