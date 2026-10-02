import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type WorkHistoryPayload = {
  institutionName: string
  phone: string
  directorName: string
}

function phoneDigits(value: string): number {
  return value.replace(/\D/g, "").length
}

function isValidWorkHistory(entries: unknown): entries is WorkHistoryPayload[] {
  if (!Array.isArray(entries)) return false
  if (entries.length === 0) return true
  return entries.every((e) => {
    if (!e || typeof e !== "object") return false
    const entry = e as WorkHistoryPayload
    return (
      typeof entry.institutionName === "string" &&
      entry.institutionName.trim().length >= 2 &&
      typeof entry.directorName === "string" &&
      entry.directorName.trim().length >= 2 &&
      typeof entry.phone === "string" &&
      phoneDigits(entry.phone) >= 10
    )
  })
}

function isValidClubs(clubs: unknown): clubs is string[] {
  if (!Array.isArray(clubs) || clubs.length === 0) return false
  return clubs.every((c) => typeof c === "string" && c.trim().length > 0)
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const webhookSecret = headersList.get("x-webhook-secret")
    const expectedSecret = process.env.HR_WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error("[IK Webhook] HR_WEBHOOK_SECRET tanımlı değil")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (webhookSecret !== expectedSecret) {
      console.warn("[IK Webhook] Geçersiz secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const source = headersList.get("x-webhook-source")
    if (source !== "ik-leventokullari") {
      console.warn(`[IK Webhook] Beklenmeyen source: ${source}`)
    }

    const payload = await request.json()

    const required = [
      "id",
      "fullName",
      "residence",
      "birthYear",
      "phone",
      "universityDepartment",
      "formationStatus",
      "appliedBranch",
      "experienceLevels",
      "totalExperience",
      "hasPrivateSchoolExperience",
      "clubsAndActivities",
      "workHistory",
      "cvUrl",
      "cvFileName",
      "createdAt",
    ] as const

    for (const key of required) {
      const val = payload[key]
      if (val === undefined || val === null) {
        return NextResponse.json(
          { error: `Invalid payload - missing field: ${key}` },
          { status: 400 }
        )
      }
      if (
        key !== "workHistory" &&
        key !== "clubsAndActivities" &&
        key !== "experienceLevels" &&
        val === ""
      ) {
        return NextResponse.json(
          { error: `Invalid payload - missing field: ${key}` },
          { status: 400 }
        )
      }
    }

    if (!Array.isArray(payload.workHistory)) {
      return NextResponse.json({ error: "Invalid workHistory" }, { status: 400 })
    }

    if (!Array.isArray(payload.experienceLevels) || payload.experienceLevels.length === 0) {
      return NextResponse.json({ error: "Invalid experienceLevels" }, { status: 400 })
    }

    if (!isValidClubs(payload.clubsAndActivities)) {
      return NextResponse.json({ error: "Invalid clubsAndActivities" }, { status: 400 })
    }

    if (!isValidWorkHistory(payload.workHistory)) {
      return NextResponse.json({ error: "Invalid workHistory" }, { status: 400 })
    }

    const existing = await prisma.hrJobApplication.findUnique({
      where: { externalId: payload.id },
    })

    if (existing) {
      return NextResponse.json(
        { success: true, message: "Başvuru zaten mevcut", id: existing.id },
        { status: 200 }
      )
    }

    const record = await prisma.hrJobApplication.create({
      data: {
        externalId: payload.id,
        source: "WEBSITE",
        fullName: String(payload.fullName).trim(),
        residence: String(payload.residence).trim(),
        birthYear: Number(payload.birthYear),
        phone: String(payload.phone).trim(),
        universityDepartment: String(payload.universityDepartment).trim(),
        formationStatus: String(payload.formationStatus).trim(),
        appliedBranch: String(payload.appliedBranch).trim(),
        experienceLevels: payload.experienceLevels as Prisma.InputJsonValue,
        totalExperience: String(payload.totalExperience).trim(),
        hasPrivateSchoolExperience: Boolean(payload.hasPrivateSchoolExperience),
        clubsAndActivities: payload.clubsAndActivities as Prisma.InputJsonValue,
        workHistory: payload.workHistory as Prisma.InputJsonValue,
        cvUrl: String(payload.cvUrl).trim(),
        cvFileName: String(payload.cvFileName).trim(),
        createdAt: new Date(payload.createdAt),
      },
    })

    console.log(`[IK Webhook] Başvuru alındı: ${payload.id} -> ${record.id}`)

    return NextResponse.json(
      { success: true, message: "Başvuru alındı", id: record.id },
      { status: 200 }
    )
  } catch (error) {
    console.error("[IK Webhook] Hata:", error)

    if (error && typeof error === "object" && "code" in error) {
      const code = String(error.code)
      if (code === "P2002") {
        return NextResponse.json({ success: true, message: "Başvuru zaten mevcut" }, { status: 200 })
      }
      if (code === "P1001" || code === "P1002") {
        return NextResponse.json({ error: "Database connection error" }, { status: 503 })
      }
      if (code === "P2021") {
        console.error("[IK Webhook] hr_job_applications tablosu yok — migration çalıştırın")
        return NextResponse.json(
          {
            error: "Database not ready",
            message: "hr_job_applications tablosu bulunamadı. prisma migrate deploy çalıştırın.",
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
