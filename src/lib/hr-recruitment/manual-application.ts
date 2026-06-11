import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

export interface CreateManualApplicationInput {
  fullName: string
  note?: string | null
}

export async function createManualHrApplication(input: CreateManualApplicationInput) {
  const fullName = input.fullName.trim()
  if (fullName.length < 2) {
    throw new Error("Ad Soyad en az 2 karakter olmalıdır")
  }

  const now = new Date()
  const externalId = `manual_${randomUUID()}`

  return prisma.hrJobApplication.create({
    data: {
      externalId,
      source: "MANUAL",
      fullName,
      residence: "—",
      birthYear: 0,
      phone: "—",
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
