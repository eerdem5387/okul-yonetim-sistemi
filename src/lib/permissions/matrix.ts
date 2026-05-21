import { editablePermissionModules, permissionKey } from "./constants"

export type PermissionMatrixAction = {
  action: string
  key: string
  granted: boolean | null
}

export type PermissionMatrixModule = {
  module: string
  label: string
  group: string
  actions: PermissionMatrixAction[]
}

export function buildPermissionMatrix(
  explicitRows: Array<{ module: string; action: string; granted: boolean }>
): PermissionMatrixModule[] {
  const explicit = new Map<string, boolean>()
  for (const p of explicitRows) {
    explicit.set(permissionKey(p.module, p.action), p.granted)
  }

  return editablePermissionModules().map((mod) => ({
    module: mod.id,
    label: mod.label,
    group: mod.group,
    actions: mod.actions.map((action) => {
      const key = permissionKey(mod.id, action)
      return {
        action,
        key,
        granted: explicit.has(key) ? explicit.get(key) === true : null,
      }
    }),
  }))
}

export function emptyPermissionMatrix(): PermissionMatrixModule[] {
  return buildPermissionMatrix([])
}

export function matrixToEntries(
  matrix: PermissionMatrixModule[]
): Array<{ module: string; action: string; granted: boolean }> {
  const entries: Array<{ module: string; action: string; granted: boolean }> = []
  for (const mod of matrix) {
    for (const act of mod.actions) {
      if (act.granted === true) {
        entries.push({ module: mod.module, action: act.action, granted: true })
      }
    }
  }
  return entries
}

export { PERMISSION_ACTION_LABELS, type PermissionAction } from "./constants"
