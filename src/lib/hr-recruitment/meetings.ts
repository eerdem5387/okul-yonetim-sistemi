import type {
  HrApplicationMeetingOutcome,
  HrApplicationStatus,
  Prisma,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const APPLICATION_MEETING_OUTCOME_LABELS: Record<HrApplicationMeetingOutcome, string> = {
  OLUMLU: "Olumlu",
  KARARSIZ: "Kararsız",
  OLUMSUZ: "Olumsuz",
  TEKLIF: "Teklif Yapıldı",
  ISE_ALINDI: "İşe Alındı",
  RED: "Reddedildi",
}

export const APPLICATION_MEETING_OUTCOMES: HrApplicationMeetingOutcome[] = [
  "OLUMLU",
  "KARARSIZ",
  "OLUMSUZ",
  "TEKLIF",
  "ISE_ALINDI",
  "RED",
]

const meetingInclude = {
  conductedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.HrJobApplicationMeetingInclude

export type HrApplicationMeetingWithRelations = Prisma.HrJobApplicationMeetingGetPayload<{
  include: typeof meetingInclude
}>

export function outcomeToApplicationStatus(
  outcome: HrApplicationMeetingOutcome
): HrApplicationStatus {
  switch (outcome) {
    case "ISE_ALINDI":
      return "ISE_ALINDI"
    case "RED":
    case "OLUMSUZ":
      return "RED"
    case "OLUMLU":
    case "KARARSIZ":
    case "TEKLIF":
    default:
      return "GORUSME"
  }
}

async function syncApplicationFromLatestMeeting(
  tx: Prisma.TransactionClient,
  applicationId: string
) {
  const latest = await tx.hrJobApplicationMeeting.findFirst({
    where: { applicationId },
    orderBy: { meetingAt: "desc" },
  })

  if (!latest) {
    await tx.hrJobApplication.update({
      where: { id: applicationId },
      data: {
        lastMeetingAt: null,
        lastMeetingOutcome: null,
      },
    })
    return
  }

  await tx.hrJobApplication.update({
    where: { id: applicationId },
    data: {
      lastMeetingAt: latest.meetingAt,
      lastMeetingOutcome: latest.outcome,
      lastContactedAt: latest.meetingAt,
      status: outcomeToApplicationStatus(latest.outcome),
    },
  })
}

export async function listApplicationMeetings(applicationId: string) {
  const application = await prisma.hrJobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      fullName: true,
      appliedBranch: true,
      status: true,
      lastMeetingAt: true,
      lastMeetingOutcome: true,
    },
  })
  if (!application) return null

  const meetings = await prisma.hrJobApplicationMeeting.findMany({
    where: { applicationId },
    orderBy: { meetingAt: "desc" },
    include: meetingInclude,
  })

  return { application, meetings }
}

export interface CreateApplicationMeetingInput {
  applicationId: string
  meetingAt: Date
  outcome: HrApplicationMeetingOutcome
  notes?: string | null
  conductedById: string
}

export async function createApplicationMeeting(input: CreateApplicationMeetingInput) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.hrJobApplication.findUnique({
      where: { id: input.applicationId },
      select: { id: true },
    })
    if (!application) throw new Error("Başvuru bulunamadı")

    const meeting = await tx.hrJobApplicationMeeting.create({
      data: {
        applicationId: input.applicationId,
        meetingAt: input.meetingAt,
        outcome: input.outcome,
        notes: input.notes ?? null,
        conductedById: input.conductedById,
      },
      include: meetingInclude,
    })

    await syncApplicationFromLatestMeeting(tx, input.applicationId)
    return meeting
  })
}

export interface UpdateApplicationMeetingInput {
  meetingId: string
  meetingAt?: Date
  outcome?: HrApplicationMeetingOutcome
  notes?: string | null
}

export async function updateApplicationMeeting(input: UpdateApplicationMeetingInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.hrJobApplicationMeeting.findUnique({
      where: { id: input.meetingId },
    })
    if (!existing) throw new Error("Görüşme bulunamadı")

    const meeting = await tx.hrJobApplicationMeeting.update({
      where: { id: input.meetingId },
      data: {
        ...(input.meetingAt ? { meetingAt: input.meetingAt } : {}),
        ...(input.outcome ? { outcome: input.outcome } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: meetingInclude,
    })

    await syncApplicationFromLatestMeeting(tx, existing.applicationId)
    return meeting
  })
}

export async function deleteApplicationMeeting(meetingId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.hrJobApplicationMeeting.findUnique({
      where: { id: meetingId },
    })
    if (!existing) throw new Error("Görüşme bulunamadı")

    await tx.hrJobApplicationMeeting.delete({ where: { id: meetingId } })
    await syncApplicationFromLatestMeeting(tx, existing.applicationId)
  })
}
