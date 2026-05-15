import { prisma } from "@/lib/prisma"

export async function listDuties(params: { staffId?: string; dayOfWeek?: number } = {}) {
  return prisma.staffDuty.findMany({
    where: {
      staffId: params.staffId,
      dayOfWeek: params.dayOfWeek,
    },
    include: {
      staff: {
        select: { id: true, firstName: true, lastName: true, department: true, subject: true },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { location: "asc" }],
  })
}

export interface UpsertDutyInput {
  id?: string
  staffId: string
  dayOfWeek: number
  location: string
  notes?: string | null
}

export async function createDuty(input: UpsertDutyInput) {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7) {
    throw new Error("dayOfWeek 1-7 arasında olmalı")
  }
  return prisma.staffDuty.create({
    data: {
      staffId: input.staffId,
      dayOfWeek: input.dayOfWeek,
      location: input.location.trim(),
      notes: input.notes ?? null,
    },
  })
}

export async function updateDuty(input: UpsertDutyInput) {
  if (!input.id) throw new Error("id gerekli")
  return prisma.staffDuty.update({
    where: { id: input.id },
    data: {
      staffId: input.staffId,
      dayOfWeek: input.dayOfWeek,
      location: input.location.trim(),
      notes: input.notes ?? null,
    },
  })
}

export async function deleteDuty(id: string) {
  return prisma.staffDuty.delete({ where: { id } })
}
