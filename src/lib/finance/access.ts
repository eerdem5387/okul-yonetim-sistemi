import type { StaffDepartment } from "@prisma/client"
import { hasPermission, isSuperAdmin } from "@/lib/permissions"

/** Kurucu her zaman finansı görür/onaylar; ayrıca finance.* izni olanlar. */
export async function canViewFinance(staffId: string, department: StaffDepartment) {
  if (isSuperAdmin(department, staffId)) return true
  if (department === "KURUCU") return true
  return hasPermission(staffId, department, "finance", "view")
}

export async function canApproveFinance(staffId: string, department: StaffDepartment) {
  if (isSuperAdmin(department, staffId)) return true
  if (department === "KURUCU") return true
  return hasPermission(staffId, department, "finance", "approve")
}

/** Kurucu (veya süper admin) finance.view / finance.approve dağıtabilir. */
export async function canGrantFinanceAccess(staffId: string, department: StaffDepartment) {
  if (isSuperAdmin(department, staffId)) return true
  return department === "KURUCU"
}

export const FINANCE_GRANTABLE_ACTIONS = ["view", "approve"] as const
