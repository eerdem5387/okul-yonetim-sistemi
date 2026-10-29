"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CommsLayout } from "@/components/comms/CommsLayout"

export default function StaffMessagesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const r = localStorage.getItem("auth_role")
    const sid = localStorage.getItem("staff_id")
    if (!r || r === "parent" || !sid) {
      router.replace("/login")
      return
    }
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return <CommsLayout kind="staff" />
}
