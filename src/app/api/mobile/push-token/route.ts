import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveCommsActor } from "@/lib/comms/identity"

function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token)
}

/** Personel veya veli cihazının Expo push token'ını kaydeder. */
export async function POST(request: NextRequest) {
  const actor = await resolveCommsActor(request)
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

  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null
  const appVersion = body.appVersion?.trim() || null
  const now = new Date()

  if (actor.kind === "parent") {
    // Aynı cihaz daha önce personel oturumunda kayıtlıysa o kayıt düşer (tek oturum = tek alıcı)
    await prisma.staffPushDevice.deleteMany({ where: { token } })
    await prisma.parentPushDevice.upsert({
      where: { token },
      create: { parentId: actor.parentId, token, platform, appVersion, lastSeenAt: now },
      update: {
        parentId: actor.parentId,
        platform: platform ?? undefined,
        appVersion: appVersion ?? undefined,
        lastSeenAt: now,
      },
    })
    return NextResponse.json({ ok: true })
  }

  await prisma.parentPushDevice.deleteMany({ where: { token } })
  await prisma.staffPushDevice.upsert({
    where: { token },
    create: { staffId: actor.staffId, token, platform, appVersion, lastSeenAt: now },
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
  const actor = await resolveCommsActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { token?: string }
  const token = body.token?.trim()

  // Token'sız istek, kullanıcının diğer cihazlarının kaydını silmesin.
  if (!token) {
    return NextResponse.json({ error: "Silinecek token gerekli." }, { status: 400 })
  }

  if (actor.kind === "parent") {
    await prisma.parentPushDevice.deleteMany({ where: { parentId: actor.parentId, token } })
  } else {
    await prisma.staffPushDevice.deleteMany({ where: { staffId: actor.staffId, token } })
  }
  return NextResponse.json({ ok: true })
}
