"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { X, CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ToastType = "success" | "error" | "info" | "warning"

/** Tüm bilgilendirme pop-up'ları için varsayılan görünürlük süresi */
export const TOAST_DURATION_MS = 5000

export interface Toast {
  id: string
  message: string
  type: ToastType
  durationMs?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

const ToastComponent = ({ toast, onClose }: ToastProps) => {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const duration = toast.durationMs ?? TOAST_DURATION_MS
    const timer = setTimeout(() => {
      onCloseRef.current(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.durationMs])

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  }

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  }

  const textColors = {
    success: "text-green-900",
    error: "text-red-900",
    warning: "text-yellow-900",
    info: "text-blue-900",
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md animate-in slide-in-from-top-5 ${bgColors[toast.type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColors[toast.type]}`}>
          {toast.message}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onClose(toast.id)}
        className={`h-6 w-6 p-0 flex-shrink-0 ${textColors[toast.type]} hover:opacity-70`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export const ToastContainer = ({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  )
}

export type ToastContextValue = {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, durationMs?: number) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs?: number) => {
      const id = Math.random().toString(36).substring(7)
      setToasts((prev) => [...prev, { id, message, type, durationMs }])
    },
    []
  )

  const success = useCallback((message: string) => showToast(message, "success"), [showToast])
  const error = useCallback((message: string) => showToast(message, "error"), [showToast])
  const info = useCallback((message: string) => showToast(message, "info"), [showToast])
  const warning = useCallback((message: string) => showToast(message, "warning"), [showToast])

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }
}

/** Uygulama genelinde tek toast kuyruğu; tüm bildirimler {TOAST_DURATION_MS} ms sonra kapanır */
export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useToastState()

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={value.toasts} onClose={value.removeToast} />
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast, ToastProvider içinde kullanılmalıdır")
  }
  return ctx
}
