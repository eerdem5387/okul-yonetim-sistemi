/**
 * Sayfayı kilitleyen tarayıcı `alert()` penceresi yerine sağ üstte çıkan kısa mesaj gösterir.
 * Mesaj türü (başarı / hata / uyarı / bilgi) metinden tahmin edilir.
 * Mesajın hemen ardından sayfa yenilense bile mesaj bir sonraki sayfada gösterilir.
 */
import type { ToastType } from "@/components/ui/toast"

export const NOTIFY_EVENT = "app-notify"
export const PENDING_NOTIFY_KEY = "pending_notifications"

export type NotifyDetail = { id: string; message: string; type: ToastType; ts: number; handled?: boolean }

const ERROR_HINTS = ["hata", "başarısız", "basarisiz", "edilemedi", "yapılamadı", "alınamadı", "yüklenemedi", "silinemedi", "kaydedilemedi", "oluşturulamadı", "gönderilemedi", "güncellenemedi", "bulunamadı", "geçersiz", "yetkiniz", "error", "failed"]
const WARNING_HINTS = ["lütfen", "zorunlu", "en az", "seçin", "seçiniz", "girin", "giriniz", "olmalı", "boş bırak", "uyarı", "dikkat"]
const SUCCESS_HINTS = ["başarı", "kaydedildi", "eklendi", "silindi", "güncellendi", "oluşturuldu", "gönderildi", "tamamlandı", "onaylandı", "aktarıldı", "kopyalandı", "yüklendi", "atandı", "reddedildi", "✓", "✅"]

export function inferNotifyType(message: string): ToastType {
  const text = message.toLocaleLowerCase("tr-TR")
  if (ERROR_HINTS.some((h) => text.includes(h)) || /(?:em|am)(?:ed|ad)[iı](?!\p{L})/u.test(text) || text.includes("❌")) return "error"
  if (SUCCESS_HINTS.some((h) => text.includes(h)) || /(?:[iıuü][ln])d[iıuü](?!\p{L})/u.test(text)) return "success"
  if (WARNING_HINTS.some((h) => text.includes(h)) || text.includes("⚠")) return "warning"
  return "info"
}

function readPending(): NotifyDetail[] {
  try {
    const raw = sessionStorage.getItem(PENDING_NOTIFY_KEY)
    return raw ? (JSON.parse(raw) as NotifyDetail[]) : []
  } catch {
    return []
  }
}

export function writePending(list: NotifyDetail[]): void {
  try {
    if (list.length === 0) sessionStorage.removeItem(PENDING_NOTIFY_KEY)
    else sessionStorage.setItem(PENDING_NOTIFY_KEY, JSON.stringify(list.slice(-5)))
  } catch {
    /* depolama kapalıysa yalnızca anlık gösterim */
  }
}

/** Gösterilmeden sayfa değişmiş (yenilenmiş) mesajlar — son 15 saniye. */
export function takePendingNotifications(): NotifyDetail[] {
  const now = Date.now()
  const list = readPending().filter((n) => now - n.ts < 15_000)
  writePending([])
  return list
}

export function notify(message: unknown, type?: ToastType): void {
  const text = typeof message === "string" ? message : String(message ?? "")
  if (typeof window === "undefined") return
  const detail: NotifyDetail = {
    id: Math.random().toString(36).slice(2),
    message: text,
    type: type ?? inferNotifyType(text),
    ts: Date.now(),
  }
  writePending([...readPending(), detail])
  window.dispatchEvent(new CustomEvent<NotifyDetail>(NOTIFY_EVENT, { detail }))
  if (!detail.handled) {
    // Mesaj kutusu yüklenmemişse (beklenmeyen durum) eski davranış
    writePending(readPending().filter((n) => n.id !== detail.id))
    window.alert(text)
  }
}
