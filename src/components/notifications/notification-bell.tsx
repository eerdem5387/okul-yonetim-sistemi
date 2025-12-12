"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, CheckCheck, X } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL"
  createdAt: string
}

interface NotificationBellProps {
  targetRole?: "OGRETMEN" | "REHBERLIK" | "OGRENCI_ISLERI"
  targetUserId?: string
}

export default function NotificationBell({ targetRole, targetUserId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Bildirimleri fetch et
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (targetRole) params.append("targetRole", targetRole)
      if (targetUserId) params.append("targetUserId", targetUserId)
      params.append("limit", "20")

      const response = await fetch(`/api/notifications?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  // İlk yükleme ve periyodik yenileme
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // 30 saniyede bir güncelle
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, targetUserId])

  // Dışarı tıklandığında dropdown'u kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Tek bir bildirimi okundu işaretle
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Tümünü okundu işaretle
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetUserId,
        }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  // Bildirim rengini belirle
  const getNotificationColor = (priority: string, isRead: boolean) => {
    if (isRead) return "bg-gray-50 border-gray-200"
    
    switch (priority) {
      case "CRITICAL":
        return "bg-red-50 border-red-300"
      case "HIGH":
        return "bg-yellow-50 border-yellow-300"
      case "NORMAL":
        return "bg-blue-50 border-blue-300"
      case "LOW":
        return "bg-green-50 border-green-300"
      default:
        return "bg-white border-gray-200"
    }
  }

  // Bildirim ikonunu belirle
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TAMAMLANDI":
      case "ERKEN_TAMAMLANDI":
      case "UNITE_TAMAMLANDI":
        return "✅"
      case "ONAY_BEKLIYOR":
        return "⏳"
      case "GECIKMELI":
      case "KRITIK_GECIKME":
        return "⚠️"
      case "YAKLASAN_DEADLINE":
        return "⏰"
      case "AKSAMA_OLUSTURULDU":
        return "📅"
      case "OGRETMEN_ATANDI":
        return "🎓"
      default:
        return "🔔"
    }
  }

  // Zaman farkını hesapla
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Az önce"
    if (diffMins < 60) return `${diffMins} dakika önce`
    if (diffHours < 24) return `${diffHours} saat önce`
    if (diffDays < 7) return `${diffDays} gün önce`
    return date.toLocaleDateString("tr-TR")
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Bildirimler"
      >
        <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[18px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">
              Bildirimler {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  title="Tümünü Okundu İşaretle"
                >
                  <CheckCheck className="h-3 w-3" />
                  Tümü Okundu
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm text-center">Henüz bildiriminiz yok</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${getNotificationColor(
                      notification.priority,
                      notification.isRead
                    )}`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-medium ${
                              notification.isRead ? "text-gray-700" : "text-gray-900"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1 line-clamp-2 ${
                            notification.isRead ? "text-gray-500" : "text-gray-700"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

