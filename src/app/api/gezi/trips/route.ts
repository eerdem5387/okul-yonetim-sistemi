import { NextRequest, NextResponse } from "next/server"
import {
  getTrips,
  createTrip,
  type CreateTripData,
} from "@/lib/geziService"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")
    const upcomingOnly = searchParams.get("upcoming") === "true"
    const search = searchParams.get("q")

    const options = {
      isActive: isActive ? isActive === "true" : undefined,
      upcomingOnly,
      search: search || undefined,
    }

    const trips = await getTrips(options)
    return NextResponse.json({ data: trips })
  } catch (error) {
    console.error("Error fetching trips:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Geziler alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const trip = await createTrip(payload as CreateTripData)
    return NextResponse.json({ data: trip }, { status: 201 })
  } catch (error) {
    console.error("Error creating trip:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gezi oluşturulamadı" },
      { status: 500 }
    )
  }
}

