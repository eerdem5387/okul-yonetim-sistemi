import type { LucideIcon } from "lucide-react"
import {
  Award,
  Briefcase,
  Bus,
  BookOpen,
  ClipboardList,
  Contact,
  FileText,
  Handshake,
  MapPin,
  MessageSquare,
  School,
  Settings,
  Shirt,
  Target,
  UserPlus,
  UserSearch,
  Users,
  Utensils,
} from "lucide-react"
import { hasAnyModulePermission } from "./access"

export type PermissionNavItem = {
  module: string
  name: string
  href: string
  icon: LucideIcon
}

/** Rol menüsünde olmayan ama StaffPermission ile açılabilecek sayfalar. */
export const PERMISSION_NAV_CATALOG: PermissionNavItem[] = [
  { module: "messaging", name: "Mesajlar", href: "/mesajlar", icon: MessageSquare },
  { module: "staff", name: "Personel Yönetimi", href: "/personel", icon: Briefcase },
  { module: "hr", name: "İzinler", href: "/personel/izinler", icon: ClipboardList },
  { module: "hr_recruitment", name: "İK Başvuruları", href: "/ik-basvurular", icon: UserSearch },
  { module: "hr_retention", name: "Personel Görüşmeleri", href: "/personel/gorusmeler", icon: MessageSquare },
  { module: "students", name: "Öğrenci Yönetimi", href: "/students", icon: UserPlus },
  { module: "classes", name: "Sınıf Yönetimi", href: "/sinif-yonetimi", icon: School },
  { module: "registrations", name: "Yeni Kayıt", href: "/new-registration", icon: FileText },
  { module: "registrations", name: "Kayıt Yenileme", href: "/renewal", icon: FileText },
  { module: "registrations", name: "Forma Sözleşmesi", href: "/uniform", icon: Shirt },
  { module: "registrations", name: "Yemek Sözleşmesi", href: "/meal", icon: Utensils },
  { module: "registrations", name: "Servis Sözleşmesi", href: "/service", icon: Bus },
  { module: "registrations", name: "Kitap Sözleşmesi", href: "/book", icon: BookOpen },
  { module: "applications", name: "Bursluluk Başvuruları", href: "/basvurular", icon: ClipboardList },
  { module: "applications", name: "Teklif Görüşmeleri", href: "/teklif-gorusmeleri", icon: Handshake },
  { module: "aday_tespit", name: "Aday Öğrenci Tespiti", href: "/aday-ogrenci-tespiti", icon: Contact },
  { module: "parent_meetings", name: "Veli Görüşmeleri", href: "/yonetim/parent-meetings", icon: MessageSquare },
  { module: "approval_panel", name: "Onay Paneli", href: "/onay-paneli", icon: ClipboardList },
  { module: "gezi", name: "Gezi Yönetimi", href: "/gezi", icon: MapPin },
  { module: "clubs", name: "Kulüp Yönetimi", href: "/clubs", icon: Users },
  { module: "activity_events", name: "Faaliyet Yönetimi", href: "/faaliyet-yonetimi", icon: Award },
  { module: "activity_staff_stats", name: "Personel Faaliyet İstatistikleri", href: "/faaliyet-yonetimi/personel-istatistik", icon: Award },
  { module: "exams", name: "Sınav Yönetimi", href: "/rehberlik/sinavlar", icon: FileText },
  { module: "student_comments", name: "Öğrenci Görüşleri", href: "/rehberlik/gorusler", icon: MessageSquare },
  { module: "neredeyiz", name: "Neredeyiz?", href: "/neredeyiz", icon: Target },
  { module: "settings", name: "Ayarlar", href: "/yonetim/ayarlar", icon: Settings },
]

export function extraGrantedNavItems(options: {
  permissionKeys: readonly string[] | null | undefined
  existingHrefs?: readonly string[]
  existingModules?: readonly string[]
}): PermissionNavItem[] {
  const hrefs = new Set(options.existingHrefs ?? [])
  const modules = new Set(options.existingModules ?? [])
  return PERMISSION_NAV_CATALOG.filter((item) => {
    if (!hasAnyModulePermission(options.permissionKeys, item.module)) return false
    if (hrefs.has(item.href)) return false
    if (modules.has(item.module)) return false
    return true
  })
}
