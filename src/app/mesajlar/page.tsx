"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ChatLayout } from "@/components/chat/ChatLayout"

export default function StaffMessagesPage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState<string | null>(null)
  const [department, setDepartment] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const r = localStorage.getItem("auth_role")
    const sid = localStorage.getItem("staff_id")
    const dep = localStorage.getItem("staff_department")
    if (!r || r === "parent" || !sid) {
      router.replace("/login")
      return
    }
    setStaffId(sid)
    setDepartment(dep)
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <ChatLayout
      actor={{
        kind: "staff",
        id: staffId!,
        department,
      }}
    />
  )
}
