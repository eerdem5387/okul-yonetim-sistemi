export interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

export interface ParticipantRow {
  id: string
  studentId: string
  student: Student
  score: number | null
  languageLevel: string | null
  participationPhotoUrl: string | null
  extraDocumentUrl: string | null
  artworkDescription?: string | null
  tournamentPlacement?: string | null
  projectRole?: string | null
  verificationStatus: string
  signedDocumentUrls: string[]
  signedCurriculumUrls: string[]
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
}

export interface ActivityEventDetail {
  id: string
  mainType: string
  subtype: string | null
  certificateType: string
  title: string
  description: string | null
  outcome: string | null
  startDate: string
  endDate: string
  location: string | null
  organizerName: string
  durationHours: number | null
  durationDays: number | null
  durationMonths: number | null
  durationYears: number | null
  evidenceUrls: string[]
  metadata?: unknown | null
  teacher: { id: string; firstName: string; lastName: string }
  createdAt: string
  participants: ParticipantRow[]
}
