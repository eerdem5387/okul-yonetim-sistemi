"use client"

import { NeredeyizSidebar } from "@/components/layout/neredeyiz-sidebar"

export default function NeredeyizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <NeredeyizSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 min-w-0">
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="h-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  )
}

