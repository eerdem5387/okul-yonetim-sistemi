import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** PATCH /api/students/[id]/book-payment — öğrenciyi kitap aldı olarak işaretle */
export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
