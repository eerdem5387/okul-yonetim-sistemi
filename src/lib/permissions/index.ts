import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor, type StaffActor } from "@/lib/hr/actor"
import {
  ADMIN_ONLY_PERMISSION_MODULE_ID,
  PERMISSION_MODULES,
  permissionKey,
  type PermissionAction,
} from "./constants"
import { isPrimarySystemAdminStaffId } from "./system-admin"

export { PERMISSION_MODULES, PERMISSION_ACTIONS, PERMISSION_ACTION_LABELS } from "./constants"
export type { PermissionModuleDef, PermissionAction } from "./constants"
export {
  permissionKey,
  parsePermissionKey,
  legacyFlagsToPermissionKeys,
  ADMIN_ONLY_PERMISSION_MODULE_ID,
  ACTIVITY_STAFF_STATS_MODULE_ID,
  editablePermissionModules,
  fullPermissionKeysForModule,
} from "./constants"

const SUPER_ADMIN_DEPT: StaffDepartment = "SUPER_ADMIN"

/** Departmana göre otomatik tam yetki kaldırıldı; yalnızca StaffPermission + öğretmen geçişi + süper yönetici */
const DEFAULT_DEPARTMENT_PERMISSIONS: Partial<
  Record<StaffDepartment, Array<{ module: string; action: PermissionAction }>>
> = {}

export function isSuperAdmin(department: StaffDepartment, staffId?: string): boolean {
  if (staffId && isPrimarySystemAdminStaffId(staffId)) return true
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

function stripNonSuperAdminKeys(keys: Set<string>): void {
  for (const k of [...keys]) {
    if (k.startsWith(`${ADMIN_ONLY_PERMISSION_MODULE_ID}.`)) keys.delete(k)
  }
}

export async function hasPermission(
  staffId: string,
  department: StaffDepartment,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  if (isSuperAdmin(department, staffId)) return true

  // Yetkilendirme: yalnızca süper yönetici (StaffPermission ile devredilemez)
  if (module === ADMIN_ONLY_PERMISSION_MODULE_ID) return false

  const key = permissionKey(module, action)
  const map = await getStaffPermissionMap(staffId)
  if (map.has(key)) return map.get(key) === true

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
  if (isSuperAdmin(department, staffId)) {
    return PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => permissionKey(m.id, a)))
  }

  const keys = new Set<string>()
  const map = await getStaffPermissionMap(staffId)
  for (const [k, granted] of map) {
    if (granted && !k.startsWith(`${ADMIN_ONLY_PERMISSION_MODULE_ID}.`)) keys.add(k)
  }

  if (department === "OGRETMEN") {
    keys.add(permissionKey("dashboard", "view"))
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { hasGeziAccess: true, hasIbAccess: true },
    })
    if (staff?.hasGeziAccess) {
      ;["view", "create", "edit", "delete", "export"].forEach((a) => keys.add(permissionKey("gezi", a)))
    }
    if (staff?.hasIbAccess) {
      ;["view", "create", "edit", "delete", "export", "approve"].forEach((a) =>
        keys.add(permissionKey("activity_events", a))
      )
    }
    ;["homework", "attendance", "messaging", "schedules", "neredeyiz", "student_comments", "students"].forEach((mod) => {
      ;["view", "create", "edit"].forEach((a) => keys.add(permissionKey(mod, a)))
    })
    stripNonSuperAdminKeys(keys)
    return Array.from(keys)
  }

  const fallback = DEFAULT_DEPARTMENT_PERMISSIONS[department] ?? []
  for (const p of fallback) {
    const k = permissionKey(p.module, p.action)
    if (!map.has(k)) keys.add(k)
  }

  stripNonSuperAdminKeys(keys)
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
  if (!actor || !isSuperAdmin(actor.department, actor.staffId)) return null
  return actor
}

export async function resolveActorWithPermission(
  request: NextRequest,
  module: string,
  action: PermissionAction
): Promise<StaffActor | null> {
  const actor = await resolveStaffActor(request)
  if (!actor) return null
  if (isSuperAdmin(actor.department, actor.staffId)) return actor
  const ok = await assertPermission(actor, module, action)
  return ok ? actor : null
}
