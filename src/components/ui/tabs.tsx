"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultValue ?? "")
    const isControlled = value !== undefined
    const current = isControlled ? value! : internal

    const setValue = React.useCallback(
      (next: string) => {
        if (!isControlled) setInternal(next)
        onValueChange?.(next)
      },
      [isControlled, onValueChange]
    )

    const ctx = React.useMemo(() => ({ value: current, setValue }), [current, setValue])

    return (
      <TabsContext.Provider value={ctx}>
        <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1 text-gray-600",
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const ctx = React.useContext(TabsContext)
    if (!ctx) throw new Error("TabsTrigger must be used within Tabs")
    const active = ctx.value === value
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={(e) => {
          ctx.setValue(value)
          onClick?.(e)
        }}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          active
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, ...props }, ref) => {
    const ctx = React.useContext(TabsContext)
    if (!ctx) throw new Error("TabsContent must be used within Tabs")
    if (ctx.value !== value) return null
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("focus-visible:outline-none", className)}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
