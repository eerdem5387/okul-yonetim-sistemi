"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CommsLayout } from "@/components/comms/CommsLayout"

export default function ParentMessagesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const pid = localStorage.getItem("parent_id")
    if (role !== "parent" || !pid) {
      router.replace("/veli-login")
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

  return <CommsLayout kind="parent" />
}
