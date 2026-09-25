"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

const Dialog = ({ open = false, onOpenChange = () => {}, children }: DialogProps) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(DialogContext)

    React.useEffect(() => {
      if (!open) return
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }, [open])

    if (!open) return null

    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        
        {/* Content */}
        <div
          ref={ref}
          className={cn(
            "relative z-50 w-full max-w-lg bg-white rounded-t-2xl sm:rounded-lg shadow-xl p-6 m-0 sm:m-4 max-h-[92dvh] overflow-y-auto",
            className
          )}
          {...props}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 sm:right-4 sm:top-4 sm:h-8 sm:w-8 sm:rounded-sm sm:bg-transparent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h2>
  )
)
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-gray-500", className)}
      {...props}
    >
      {children}
    </p>
  )
)
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }

