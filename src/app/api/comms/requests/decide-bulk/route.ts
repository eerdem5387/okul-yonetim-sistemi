import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { clampText, COMMS_LIMITS, isRequestApprover } from "@/lib/comms/access"
import { decideRequests } from "@/lib/comms/requests"

export const dynamic = "force-dynamic"

/** Toplu onay / red (onay mercii) */
export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!isRequestApprover(actor.department)) {
    return NextResponse.json({ error: "Onay yetkiniz yok" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? [...new Set<string>(body.ids.map(String))].slice(0, 200) : []
  const decision = body?.decision === "reject" ? "REJECTED" : body?.decision === "approve" ? "APPROVED" : null
  if (!ids.length || !decision) {
    return NextResponse.json({ error: "ids ve decision (approve | reject) zorunlu" }, { status: 400 })
  }
  const note = clampText(body?.note, COMMS_LIMITS.note) || null
  const { updated } = await decideRequests({ ids, decision, note, decider: actor })
  return NextResponse.json({ ok: true, updated })
}
