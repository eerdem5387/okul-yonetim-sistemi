import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { listOfficialNoticeRecipients } from "@/lib/comms/access"

export const dynamic = "force-dynamic"

/** Resmi ileti alıcı adayları (gönderim yetkilileri hariç) */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const staff = await listOfficialNoticeRecipients(actor.staffId)
  return NextResponse.json({ staff })
}
