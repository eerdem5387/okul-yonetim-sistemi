"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ChatLayout } from "@/components/chat/ChatLayout"

export default function ParentMessagesPage() {
  const router = useRouter()
  const [parentId, setParentId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const pid = localStorage.getItem("parent_id")
    if (role !== "parent" || !pid) {
      router.replace("/veli-login")
      return
    }
    setParentId(pid)
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return <ChatLayout actor={{ kind: "parent", id: parentId! }} />
}
