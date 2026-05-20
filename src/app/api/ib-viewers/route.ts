import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { resolveActorWithPermission } from "@/lib/permissions"

// GET - IB Viewer listesi
export async function GET(request: NextRequest) {
  const actor = await resolveActorWithPermission(request, "ib_viewer_accounts", "view")
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const viewers = await prisma.iBViewer.findMany({
      orderBy: { createdAt: "desc" },
    })

    const safeViewers = viewers.map((viewer) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = viewer
      return rest
    })

    return NextResponse.json(safeViewers)
  } catch (error) {
    console.error("Error fetching IB viewers:", error)
    return NextResponse.json({ error: "Failed to fetch IB viewers" }, { status: 500 })
  }
}

// POST - Yeni IB Viewer oluştur
export async function POST(request: NextRequest) {
  const actor = await resolveActorWithPermission(request, "ib_viewer_accounts", "create")
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { username, password, fullName, email, organization } = body

    const existing = await prisma.iBViewer.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: "Bu kullanıcı adı zaten kullanılıyor" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const viewer = await prisma.iBViewer.create({
      data: { username, password: hashedPassword, fullName, email, organization },
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeViewer } = viewer
    return NextResponse.json(safeViewer)
  } catch (error) {
    console.error("Error creating IB viewer:", error)
    return NextResponse.json({ error: "Failed to create IB viewer" }, { status: 500 })
  }
}
