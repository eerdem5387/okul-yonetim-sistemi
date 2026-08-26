"use client"

import { useEffect, useState } from "react"
import {
  fetchPermissionsMe,
  type PermissionsMeResponse,
} from "@/lib/permissions/client"
import { isPrimarySystemAdminStaffId } from "@/lib/permissions/system-admin"

export type StaffPermissionState = {
  permissionKeys: string[] | null
  permissionsLoaded: boolean
  isSuperAdmin: boolean
  me: PermissionsMeResponse | null
}

function resolveLocalSuperAdmin(): boolean {
  if (typeof window === "undefined") return false
  const dept = localStorage.getItem("staff_department")
  const staffId = localStorage.getItem("staff_id")
  return dept === "SUPER_ADMIN" || isPrimarySystemAdminStaffId(staffId)
}

function resolveSuperAdminFromMe(
  data: PermissionsMeResponse | null,
  localSuperAdmin: boolean
): boolean {
  if (localSuperAdmin) return true
  if (!data) return false
  return (
    data.isSuperAdmin === true ||
    data.department === "SUPER_ADMIN" ||
    isPrimarySystemAdminStaffId(data.staffId)
  )
}

export function shouldApplyPermissionFilter(state: StaffPermissionState): boolean {
  if (state.isSuperAdmin) return false
  if (!state.permissionsLoaded) return false
  if (!state.permissionKeys?.length) return false
  return true
}

export function checkNavPermission(
  state: StaffPermissionState,
  module: string,
  action: string,
  roleAllowed: boolean
): boolean {
  if (state.isSuperAdmin) return true
  const key = `${module}.${action}`
  if (state.permissionsLoaded && state.permissionKeys?.includes(key)) return true
  if (shouldApplyPermissionFilter(state)) return false
  return roleAllowed
}

export function useStaffPermissions(options?: { redirectOn401?: boolean }) {
  const [state, setState] = useState<StaffPermissionState>({
    permissionKeys: null,
    permissionsLoaded: false,
    isSuperAdmin: false,
    me: null,
  })

  useEffect(() => {
    const localSuperAdmin = resolveLocalSuperAdmin()
    setState((prev) => ({ ...prev, isSuperAdmin: localSuperAdmin }))

    fetchPermissionsMe({ redirectOn401: options?.redirectOn401 ?? true }).then((data) => {
      setState({
        permissionKeys: data?.permissions ?? null,
        permissionsLoaded: data !== null,
        isSuperAdmin: resolveSuperAdminFromMe(data, localSuperAdmin),
        me: data,
      })
    })
  }, [options?.redirectOn401])

  return state
}
