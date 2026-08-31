import type { NextRequest } from "next/server"
import { resolveActorWithPermission } from "@/lib/permissions"
import { resolveStaffActor } from "@/lib/hr/actor"

export async function requireExamView(request: NextRequest) {
  return resolveActorWithPermission(request, "exams", "view")
}

export async function requireExamEdit(request: NextRequest) {
  return resolveActorWithPermission(request, "exams", "edit")
}

export async function requireExamCreate(request: NextRequest) {
  return resolveActorWithPermission(request, "exams", "create")
}

export async function requireExamExport(request: NextRequest) {
  return resolveActorWithPermission(request, "exams", "export")
}

/** Masaüstü okutma — export veya edit yetkisi yeterli. */
export async function requireExamScan(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return null
  const canExport = await resolveActorWithPermission(request, "exams", "export")
  if (canExport) return canExport
  return resolveActorWithPermission(request, "exams", "edit")
}
