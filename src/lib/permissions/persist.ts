import type { Prisma } from "@prisma/client"
import { ADMIN_ONLY_PERMISSION_MODULE_ID } from "./constants"

export type PermissionEntryInput = {
  module: string
  action: string
  granted: boolean
}

export function normalizeGrantedEntries(
  entries: PermissionEntryInput[]
): Array<{ module: string; action: string; granted: true }> {
  if (!Array.isArray(entries)) return []
  return entries
    .filter(
      (e) =>
        e?.granted === true &&
        e.module &&
        e.action &&
        String(e.module) !== ADMIN_ONLY_PERMISSION_MODULE_ID
    )
    .map((e) => ({
      module: String(e.module),
      action: String(e.action),
      granted: true as const,
    }))
}

export async function replaceStaffPermissions(
  tx: Prisma.TransactionClient,
  staffId: string,
  entries: PermissionEntryInput[]
): Promise<void> {
  await tx.staffPermission.deleteMany({ where: { staffId } })
  const toCreate = normalizeGrantedEntries(entries).map((e) => ({
    staffId,
    module: e.module,
    action: e.action,
    granted: true,
  }))
  if (toCreate.length > 0) {
    await tx.staffPermission.createMany({ data: toCreate })
  }
}
