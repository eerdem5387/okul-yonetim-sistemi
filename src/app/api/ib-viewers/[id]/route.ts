import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { resolveActorWithPermission } from "@/lib/permissions"

// PUT - IB Viewer güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await resolveActorWithPermission(request, "ib_viewer_accounts", "edit")
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const params = await context.params
    const body = await request.json()
    const { username, password, fullName, email, organization, isActive } = body

    const updateData: {
      fullName: string
      email: string | null
      organization: string | null
      isActive: boolean
      username?: string
      password?: string
    } = { fullName, email, organization, isActive }

    if (username) {
      const existing = await prisma.iBViewer.findFirst({
        where: { username, NOT: { id: params.id } },
      })
      if (existing) {
        return NextResponse.json({ error: "Bu kullanıcı adı zaten kullanılıyor" }, { status: 400 })
      }
      updateData.username = username
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const viewer = await prisma.iBViewer.update({
      where: { id: params.id },
      data: updateData,
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeViewer } = viewer
    return NextResponse.json(safeViewer)
  } catch (error) {
    console.error("Error updating IB viewer:", error)
    return NextResponse.json({ error: "Failed to update IB viewer" }, { status: 500 })
  }
}

// DELETE - IB Viewer sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await resolveActorWithPermission(request, "ib_viewer_accounts", "delete")
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const params = await context.params
    await prisma.iBViewer.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting IB viewer:", error)
    return NextResponse.json({ error: "Failed to delete IB viewer" }, { status: 500 })
  }
}
