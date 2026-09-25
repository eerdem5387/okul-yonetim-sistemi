"use client"

import { useEffect } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileMenuButton({
  open,
  onToggle,
  className,
}: {
  open: boolean
  onToggle: () => void
  className?: string
}) {
  useEffect(() => {
    document.body.classList.add("mobile-nav-offset")
    return () => {
      document.body.classList.remove("mobile-nav-offset")
    }
  }, [])

  return (
    <div className="lg:hidden fixed inset-x-0 top-0 z-[70] flex h-14 items-center border-b border-gray-200 bg-white/95 px-3 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm touch-manipulation",
          className
        )}
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <span className="ml-3 truncate text-sm font-semibold text-gray-800">
        Öğretmen Paneli
      </span>
    </div>
  )
}
