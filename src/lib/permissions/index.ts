import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor, type StaffActor } from "@/lib/hr/actor"
import {
  PERMISSION_MODULES,
  permissionKey,
  type PermissionAction,
} from "./constants"

export { PERMISSION_MODULES, PERMISSION_ACTIONS, PERMISSION_ACTION_LABELS } from "./constants"
export type { PermissionModuleDef, PermissionAction } from "./constants"
export { permissionKey, parsePermissionKey, legacyFlagsToPermissionKeys } from "./constants"

const SUPER_ADMIN_DEPT: StaffDepartment = "SUPER_ADMIN"

const DEFAULT_DEPARTMENT_PERMISSIONS: Partial<
  Record<StaffDepartment, Array<{ module: string; action: PermissionAction }>>
> = {
  MUDUR: PERMISSION_MODULES.flatMap((m) =>
    m.actions.map((action) => ({ module: m.id, action }))
  ),
  MUDUR_YARDIMCISI: PERMISSION_MODULES.filter((m) => m.id !== "permissions").flatMap((m) =>
    m.actions.map((action) => ({ module: m.id, action }))
  ),
  OGRENCI_ISLERI: [
    { module: "dashboard", action: "view" },
    { module: "messaging", action: "view" },
    { module: "students", action: "view" },
    { module: "students", action: "edit" },
    { module: "classes", action: "view" },
    { module: "registrations", action: "view" },
    { module: "registrations", action: "edit" },
    { module: "staff", action: "view" },
    { module: "gezi", action: "view" },
    { module: "clubs", action: "view" },
    { module: "activity_events", action: "view" },
    { module: "activity_events", action: "approve" },
  ],
  REHBERLIK: [
    { module: "dashboard", action: "view" },
    { module: "messaging", action: "view" },
    { module: "students", action: "view" },
    { module: "gezi", action: "view" },
    { module: "clubs", action: "view" },
    { module: "activity_events", action: "view" },
    { module: "activity_events", action: "create" },
    { module: "ib_viewer_accounts", action: "view" },
    { module: "ib_viewer_accounts", action: "create" },
    { module: "ib_viewer_accounts", action: "edit" },
    { module: "exams", action: "view" },
    { module: "student_comments", action: "view" },
    { module: "neredeyiz", action: "view" },
  ],
  BAS_REHBERLIK: [
    { module: "dashboard", action: "view" },
    { module: "messaging", action: "view" },
    { module: "students", action: "view" },
    { module: "gezi", action: "view" },
    { module: "clubs", action: "view" },
    { module: "activity_events", action: "view" },
    { module: "activity_events", action: "create" },
    { module: "activity_events", action: "approve" },
    { module: "ib_viewer_accounts", action: "view" },
    { module: "ib_viewer_accounts", action: "create" },
    { module: "ib_viewer_accounts", action: "edit" },
    { module: "exams", action: "view" },
    { module: "student_comments", action: "view" },
    { module: "neredeyiz", action: "view" },
    { module: "neredeyiz", action: "approve" },
  ],
}

export function isSuperAdmin(department: StaffDepartment): boolean {
  return department === SUPER_ADMIN_DEPT
}

export async function getStaffPermissionMap(staffId: string): Promise<Map<string, boolean>> {
  const rows = await prisma.staffPermission.findMany({
    where: { staffId },
    select: { module: true, action: true, granted: true },
  })
  const map = new Map<string, boolean>()
  for (const r of rows) {
    map.set(permissionKey(r.module, r.action), r.granted)
  }
  return map
}

function departmentFallbackAllows(
  department: StaffDepartment,
  module: string,
  action: PermissionAction
): boolean {
  const list = DEFAULT_DEPARTMENT_PERMISSIONS[department]
  if (!list) return false
  return list.some((p) => p.module === module && p.action === action)
}

export async function hasPermission(
  staffId: string,
  department: StaffDepartment,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  if (isSuperAdmin(department)) return true

  const key = permissionKey(module, action)
  const map = await getStaffPermissionMap(staffId)
  if (map.has(key)) return map.get(key) === true

  // Geçiş: öğretmen için eski bayraklar
  if (department === "OGRETMEN") {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { hasGeziAccess: true, hasIbAccess: true },
    })
    if (!staff) return false
    if (module === "gezi" && staff.hasGeziAccess) return true
    if (module === "activity_events" && staff.hasIbAccess) return true
    if (module === "homework" || module === "attendance" || module === "messaging") {
      return action === "view" || action === "create" || action === "edit"
    }
    return false
  }

  return departmentFallbackAllows(department, module, action)
}

export async function getEffectivePermissionKeys(
  staffId: string,
  department: StaffDepartment
): Promise<string[]> {
  if (isSuperAdmin(department)) {
    return PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => permissionKey(m.id, a)))
  }

  const keys = new Set<string>()
  const map = await getStaffPermissionMap(staffId)
  for (const [k, granted] of map) {
    if (granted) keys.add(k)
  }

  if (department === "OGRETMEN") {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { hasGeziAccess: true, hasIbAccess: true },
    })
    if (staff?.hasGeziAccess) {
      ;["view", "create", "edit"].forEach((a) => keys.add(permissionKey("gezi", a)))
    }
    if (staff?.hasIbAccess) {
      ;["view", "create", "edit", "approve"].forEach((a) =>
        keys.add(permissionKey("activity_events", a))
      )
    }
    ;["homework", "attendance", "messaging", "schedules"].forEach((mod) => {
      ;["view", "create", "edit"].forEach((a) => keys.add(permissionKey(mod, a)))
    })
    return Array.from(keys)
  }

  const fallback = DEFAULT_DEPARTMENT_PERMISSIONS[department] ?? []
  for (const p of fallback) {
    const k = permissionKey(p.module, p.action)
    if (!map.has(k)) keys.add(k)
  }

  return Array.from(keys)
}

export async function assertPermission(
  actor: StaffActor | null,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  if (!actor) return false
  return hasPermission(actor.staffId, actor.department, module, action)
}

export async function requireSuperAdmin(request: NextRequest): Promise<StaffActor | null> {
  const actor = await resolveStaffActor(request)
  if (!actor || !isSuperAdmin(actor.department)) return null
  return actor
}

export async function resolveActorWithPermission(
  request: NextRequest,
  module: string,
  action: PermissionAction
): Promise<StaffActor | null> {
  const actor = await resolveStaffActor(request)
  if (!actor) return null
  const ok = await assertPermission(actor, module, action)
  return ok ? actor : null
}
