import { NextRequest, NextResponse } from "next/server"
import { requireStaffAccess } from "@/lib/auth/api-guard"
import { prisma } from "@/lib/prisma"

/** PATCH /api/students/[id]/book-payment — öğrenciyi kitap aldı olarak işaretle */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAccess(
    request,
    { module: "students", action: "edit" },
    { module: "registrations", action: "edit" }
  )
  if (!auth.ok) return auth.response
  try {
    const { id } = await context.params

    const existing = await prisma.student.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    const student = await prisma.student.update({
      where: { id },
      data: { bookPaymentPaid: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bookPaymentPaid: true,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error("PATCH /api/students/[id]/book-payment", error)
    return NextResponse.json({ error: "Kitap durumu güncellenemedi" }, { status: 500 })
  }
}
