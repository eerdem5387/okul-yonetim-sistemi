import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"

function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token)
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    token?: string
    platform?: string
    appVersion?: string
  }

  const token = body.token?.trim()
  if (!token || !isExpoPushToken(token)) {
    return NextResponse.json({ error: "Geçerli Expo push token gerekli." }, { status: 400 })
  }

  const platform =
    body.platform === "ios" || body.platform === "android" ? body.platform : null
  const appVersion = body.appVersion?.trim() || null
  const now = new Date()

  await prisma.staffPushDevice.upsert({
    where: { token },
    create: {
      staffId: actor.staffId,
      token,
      platform,
      appVersion,
      lastSeenAt: now,
    },
    update: {
      staffId: actor.staffId,
      platform: platform ?? undefined,
      appVersion: appVersion ?? undefined,
      lastSeenAt: now,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { token?: string }
  const token = body.token?.trim()

  if (token) {
    await prisma.staffPushDevice.deleteMany({
      where: { staffId: actor.staffId, token },
    })
  } else {
    await prisma.staffPushDevice.deleteMany({ where: { staffId: actor.staffId } })
  }

  return NextResponse.json({ ok: true })
}
