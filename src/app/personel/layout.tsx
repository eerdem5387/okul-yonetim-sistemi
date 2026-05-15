import type { Metadata } from "next"
import { HrTabs } from "@/components/hr/HrTabs"

export const metadata: Metadata = {
  title: "Personel Yönetimi - Okul Yönetim Sistemi",
}

export default function PersonelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <HrTabs />
      <div className="flex-1">{children}</div>
    </div>
  )
}
