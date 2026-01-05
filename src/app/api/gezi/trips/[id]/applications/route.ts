import { NextRequest, NextResponse } from "next/server"
import { getTripApplications } from "@/lib/geziService"
import { checkGeziAccess } from "@/lib/access-control"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  // Yetki kontrolü
  const { hasAccess } = await checkGeziAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
  try {
    const { id } = await context.params
    
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Geçersiz gezi ID" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")
    
    const page = pageParam ? Math.max(1, Math.floor(Number(pageParam)) || 1) : 1
    const limit = limitParam ? Math.min(100, Math.max(1, Math.floor(Number(limitParam)) || 20)) : 20
    const search = searchParams.get("q")?.trim() || undefined

    const result = await getTripApplications(id, {
      page,
      limit,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Başvurular alınamadı" },
      { status: 500 }
    )
  }
}

