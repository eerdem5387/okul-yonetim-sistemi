import type { StaffDepartment } from "@prisma/client"
import { STAFF_DEPARTMENT_LABELS } from "@/lib/hr/constants"

export type BulkAssignableDepartment = Exclude<StaffDepartment, "SUPER_ADMIN">

/** Toplu yetki atanabilir departmanlar (süper yönetici hariç) */
export const BULK_PERMISSION_DEPARTMENTS: BulkAssignableDepartment[] = (
  Object.keys(STAFF_DEPARTMENT_LABELS) as StaffDepartment[]
).filter((d): d is BulkAssignableDepartment => d !== "SUPER_ADMIN")

export function bulkDepartmentLabel(department: BulkAssignableDepartment): string {
  return STAFF_DEPARTMENT_LABELS[department] ?? department
}

export function isBulkAssignableDepartment(
  department: string
): department is BulkAssignableDepartment {
  return (BULK_PERMISSION_DEPARTMENTS as readonly string[]).includes(department)
}
