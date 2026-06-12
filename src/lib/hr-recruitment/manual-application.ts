import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

const PLACEHOLDER_PHONE = "—"

export function isPlaceholderPhone(phone: string | null | undefined): boolean {
  if (!phone?.trim() || phone.trim() === PLACEHOLDER_PHONE) return true
  return false
}

export function normalizeManualPhone(phone?: string | null): string {
  const trimmed = phone?.trim() ?? ""
  if (!trimmed) return PLACEHOLDER_PHONE
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length < 10) {
    throw new Error("Geçerli bir telefon numarası giriniz (en az 10 hane)")
  }
  return trimmed
}

export function formatDisplayPhone(phone: string | null | undefined): string {
  if (isPlaceholderPhone(phone)) return ""
  return phone!.trim()
}

export interface CreateManualApplicationInput {
  fullName: string
  phone?: string | null
  note?: string | null
}

export async function createManualHrApplication(input: CreateManualApplicationInput) {
  const fullName = input.fullName.trim()
  if (fullName.length < 2) {
    throw new Error("Ad Soyad en az 2 karakter olmalıdır")
  }

  const phone = input.phone?.trim()
    ? normalizeManualPhone(input.phone)
    : PLACEHOLDER_PHONE

  const now = new Date()
  const externalId = `manual_${randomUUID()}`

  return prisma.hrJobApplication.create({
    data: {
      externalId,
      source: "MANUAL",
      fullName,
      residence: "—",
      birthYear: 0,
      phone,
      universityDepartment: "—",
      formationStatus: "—",
      appliedBranch: "Belirtilmemiş",
      experienceLevels: [],
      totalExperience: "—",
      hasPrivateSchoolExperience: false,
      pedagogicalApproach: "",
      clubsAndActivities: "",
      references: [],
      cvUrl: "",
      cvFileName: "",
      internalNote: input.note?.trim() || null,
      status: "YENI",
      createdAt: now,
    },
  })
}
