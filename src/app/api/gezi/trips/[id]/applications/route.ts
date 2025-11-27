import { NextRequest, NextResponse } from "next/server"
import { getTripApplications } from "@/lib/geziService"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") ?? "1")
    const limit = Number(searchParams.get("limit") ?? "20")
    const search = searchParams.get("q") || undefined

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

