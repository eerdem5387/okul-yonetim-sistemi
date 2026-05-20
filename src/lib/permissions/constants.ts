/** İzin eylemleri */
export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "export", "approve"] as const
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Görüntüle",
  create: "Oluştur",
  edit: "Düzenle",
  delete: "Sil",
  export: "Dışa aktar",
  approve: "Onayla",
}

export type PermissionModuleDef = {
  id: string
  label: string
  group: string
  actions: PermissionAction[]
}

/** Sistem modülleri — yetkilendirme matrisi satırları */
export const PERMISSION_MODULES: PermissionModuleDef[] = [
  { id: "dashboard", label: "Dashboard", group: "Genel", actions: ["view"] },
  { id: "messaging", label: "Mesajlar", group: "Genel", actions: ["view", "create", "edit", "delete"] },
  { id: "staff", label: "Personel Yönetimi", group: "Genel", actions: ["view", "create", "edit", "delete"] },
  { id: "permissions", label: "Yetkilendirme Sistemi", group: "Genel", actions: ["view", "edit"] },
  { id: "hr", label: "İK (izin, nöbet, notlar)", group: "İK", actions: ["view", "create", "edit", "delete", "approve"] },
  { id: "students", label: "Öğrenci Yönetimi", group: "Öğrenci", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "classes", label: "Sınıf Yönetimi", group: "Öğrenci", actions: ["view", "create", "edit", "delete"] },
  { id: "registrations", label: "Kayıt / Yenileme / Sözleşmeler", group: "Kayıt", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "applications", label: "Bursluluk Başvuruları", group: "Kayıt", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "parent_meetings", label: "Veli Görüşmeleri", group: "Kayıt", actions: ["view", "create", "edit", "delete"] },
  { id: "approval_panel", label: "Onay Paneli", group: "Kayıt", actions: ["view", "approve"] },
  { id: "gezi", label: "Gezi Yönetimi", group: "Faaliyet", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "clubs", label: "Kulüp Yönetimi", group: "Faaliyet", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "activity_events", label: "Faaliyet Yönetimi", group: "Faaliyet", actions: ["view", "create", "edit", "delete", "export", "approve"] },
  { id: "ib_viewer_accounts", label: "IB Viewer Hesapları", group: "Faaliyet", actions: ["view", "create", "edit", "delete"] },
  { id: "homework", label: "Ödevler", group: "Akademik", actions: ["view", "create", "edit", "delete"] },
  { id: "attendance", label: "Yoklama", group: "Akademik", actions: ["view", "create", "edit"] },
  { id: "schedules", label: "Ders Programı", group: "Akademik", actions: ["view", "create", "edit", "delete", "approve"] },
  { id: "exams", label: "Sınavlar", group: "Akademik", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "student_comments", label: "Öğrenci Görüşleri", group: "Akademik", actions: ["view", "create", "edit", "delete"] },
  { id: "neredeyiz", label: "Neredeyiz?", group: "Akademik", actions: ["view", "create", "edit", "delete", "approve", "export"] },
  { id: "settings", label: "Ayarlar", group: "Sistem", actions: ["view", "edit"] },
]

/** Personel matrisinde devredilemez; yalnızca SUPER_ADMIN bu modüle erişir */
export const ADMIN_ONLY_PERMISSION_MODULE_ID = "permissions" as const

/** Süper yöneticinin başkasına atayabileceği modül satırları (yetkilendirme hariç) */
export function editablePermissionModules(): PermissionModuleDef[] {
  return PERMISSION_MODULES.filter((m) => m.id !== ADMIN_ONLY_PERMISSION_MODULE_ID)
}

/** Bir modülde süper yöneticiyle aynı yetki = o modüldeki tüm aksiyon anahtarları */
export function fullPermissionKeysForModule(moduleId: string): string[] {
  if (moduleId === ADMIN_ONLY_PERMISSION_MODULE_ID) return []
  const mod = PERMISSION_MODULES.find((m) => m.id === moduleId)
  if (!mod) return []
  return mod.actions.map((a) => permissionKey(mod.id, a))
}

export function permissionKey(module: string, action: string): string {
  return `${module}.${action}`
}

export function parsePermissionKey(key: string): { module: string; action: string } | null {
  const dot = key.indexOf(".")
  if (dot <= 0) return null
  return { module: key.slice(0, dot), action: key.slice(dot + 1) }
}

/** Eski boolean bayraklardan izin anahtarları */
export function legacyFlagsToPermissionKeys(hasGeziAccess: boolean, hasIbAccess: boolean): string[] {
  const keys: string[] = []
  if (hasGeziAccess) {
    for (const a of ["view", "create", "edit", "delete", "export"] as PermissionAction[]) {
      keys.push(permissionKey("gezi", a))
    }
  }
  if (hasIbAccess) {
    for (const a of ["view", "create", "edit", "delete", "export", "approve"] as PermissionAction[]) {
      keys.push(permissionKey("activity_events", a))
    }
  }
  return keys
}
