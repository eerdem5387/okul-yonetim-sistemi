import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Başvuruyu sil
    await prisma.basvuru.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: "Başvuru başarıyla silindi"
    })
  } catch (error) {
    console.error("Error deleting basvuru:", error)
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: "Başvuru bulunamadı" },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Başvuru silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

