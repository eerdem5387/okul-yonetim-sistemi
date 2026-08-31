import type { NextRequest } from "next/server"
import { resolveStaffActor, type StaffActor } from "@/lib/hr/actor"
import { hasPermission, isSuperAdmin } from "@/lib/permissions"

/** Sınıf / Neredeyiz gibi modüllerde personel seçim listesi için yeterli yetkiler */
const PICKER_VIEW_MODULES = ["staff", "classes", "neredeyiz"] as const

export async function resolveStaffPickerActor(
  request: NextRequest
): Promise<StaffActor | null> {
  const actor = await resolveStaffActor(request)
  if (!actor) return null
  if (isSuperAdmin(actor.department, actor.staffId)) return actor

  for (const moduleKey of PICKER_VIEW_MODULES) {
    if (await hasPermission(actor.staffId, actor.department, moduleKey, "view")) {
      return actor
    }
  }
  return null
}
