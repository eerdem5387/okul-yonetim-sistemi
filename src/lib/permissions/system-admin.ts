/** Sistem tepesindeki birincil yönetici — departman yanlış kalsa bile tam yetki */
export const PRIMARY_SYSTEM_ADMIN_STAFF_ID = "cmjisyio80000nz72m1t1kaa8"

export function isPrimarySystemAdminStaffId(staffId: string | null | undefined): boolean {
  return staffId === PRIMARY_SYSTEM_ADMIN_STAFF_ID
}
