export const COMMS_UNREAD_EVENT = "comms:unread-changed"

export function notifyCommsUnreadChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(COMMS_UNREAD_EVENT))
}
