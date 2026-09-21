/** Modülde herhangi bir işlem açıksa menü ve sayfa için görüntüleme de açık sayılır. */

export function hasAnyModulePermission(
  keys: readonly string[] | null | undefined,
  moduleId: string
): boolean {
  if (!keys?.length || !moduleId) return false
  const prefix = `${moduleId}.`
  return keys.some((key) => key.startsWith(prefix))
}

export function implyViewKeys(keys: Set<string>): void {
  const modules = new Set<string>()
  for (const key of keys) {
    const dot = key.indexOf(".")
    if (dot > 0) modules.add(key.slice(0, dot))
  }
  for (const moduleId of modules) {
    if (moduleId === "permissions") continue
    keys.add(`${moduleId}.view`)
  }
}

/** Daha özel önek önce gelmeli (startsWith eşleşmesinde ilk uzun eşleşme kullanılır). */
const PATH_MODULE_PREFIXES: Array<{ prefix: string; module: string }> = [
  { prefix: "/faaliyet-yonetimi/personel-istatistik", module: "activity_staff_stats" },
  { prefix: "/personel/gorusmeler", module: "hr_retention" },
  { prefix: "/personel/izinler", module: "hr" },
  { prefix: "/personel/nobet", module: "hr" },
  { prefix: "/personel/dashboard", module: "hr" },
  { prefix: "/faaliyet-yonetimi", module: "activity_events" },
  { prefix: "/faaliyet-ekle", module: "activity_events" },
  { prefix: "/rehberlik/sinavlar", module: "exams" },
  { prefix: "/rehberlik/gorusler", module: "student_comments" },
  { prefix: "/rehberlik/clubs", module: "clubs" },
  { prefix: "/rehberlik/gezi", module: "gezi" },
  { prefix: "/yonetim/parent-meetings", module: "parent_meetings" },
  { prefix: "/yonetim/ayarlar", module: "settings" },
  { prefix: "/new-registration", module: "registrations" },
  { prefix: "/edit-new-registration", module: "registrations" },
  { prefix: "/aday-ogrenci-tespiti", module: "aday_tespit" },
  { prefix: "/teklif-gorusmeleri", module: "applications" },
  { prefix: "/yaz-okulu-basvurular", module: "applications" },
  { prefix: "/ik-basvurular", module: "hr_recruitment" },
  { prefix: "/sinif-yonetimi", module: "classes" },
  { prefix: "/ders-programi", module: "schedules" },
  { prefix: "/ogrenci-dashboard", module: "students" },
  { prefix: "/veli-gorusmeleri", module: "parent_meetings" },
  { prefix: "/onay-paneli", module: "approval_panel" },
  { prefix: "/edit-renewal", module: "registrations" },
  { prefix: "/edit-uniform", module: "registrations" },
  { prefix: "/edit-service", module: "registrations" },
  { prefix: "/edit-book", module: "registrations" },
  { prefix: "/edit-meal", module: "registrations" },
  { prefix: "/students", module: "students" },
  { prefix: "/personel", module: "staff" },
  { prefix: "/renewal", module: "registrations" },
  { prefix: "/history", module: "registrations" },
  { prefix: "/uniform", module: "registrations" },
  { prefix: "/service", module: "registrations" },
  { prefix: "/neredeyiz", module: "neredeyiz" },
  { prefix: "/basvurular", module: "applications" },
  { prefix: "/mesajlar", module: "messaging" },
  { prefix: "/clubs", module: "clubs" },
  { prefix: "/gezi", module: "gezi" },
  { prefix: "/meal", module: "registrations" },
  { prefix: "/book", module: "registrations" },
]

export function modulesForPath(pathname: string | null | undefined): string[] {
  if (!pathname) return []
  const matches = PATH_MODULE_PREFIXES.filter(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)
  )
  return [...new Set(matches.map((entry) => entry.module))]
}

export function canAccessPathByPermission(
  pathname: string | null | undefined,
  keys: readonly string[] | null | undefined
): boolean {
  if (!pathname || !keys?.length) return false
  return modulesForPath(pathname).some((moduleId) =>
    hasAnyModulePermission(keys, moduleId)
  )
}
