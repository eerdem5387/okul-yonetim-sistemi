import { NextRequest, NextResponse } from "next/server"
import { getTrip, updateTrip, type UpdateTripData } from "@/lib/geziService"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const trip = await getTrip(id)
    return NextResponse.json({ data: trip })
  } catch (error) {
    console.error("Error fetching trip:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gezi bulunamadı" },
      { status: 404 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const payload = await request.json()
    const trip = await updateTrip(id, payload as UpdateTripData)
    return NextResponse.json({ data: trip })
  } catch (error) {
    console.error("Error updating trip:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gezi güncellenemedi" },
      { status: 500 }
    )
  }
}

