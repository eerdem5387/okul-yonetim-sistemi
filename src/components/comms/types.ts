export type CommsCapabilities = {
  sendOfficial: boolean
  sendClassAnnouncement: boolean
  manageTemplates: boolean
  approveRequests: boolean
  createClassGroup: boolean
  createRequest: boolean
}

export type CommsMe = {
  actor: {
    kind: "staff" | "parent"
    id: string
    department?: string
    name?: string
    displayName?: string
  }
  capabilities: CommsCapabilities
  badges: { unreadNotices: number; pendingRequests: number; unreadAnnouncements: number }
}

export type CommsTemplate = {
  id: string
  kind: string
  title: string
  body: string
  isActive: boolean
}

export type OfficialNotice = {
  id: string
  type: "IHTAR" | "TALIMAT" | "PERSONEL_DUYURU"
  subject: string
  body: string
  createdAt: string
  seenAt: string | null
  batchId?: string
  senderStaff?: { id: string; firstName: string; lastName: string }
  recipientStaff?: { id: string; firstName: string; lastName: string }
}

export type StaffCommsRequest = {
  id: string
  subject: string
  body: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  decidedAt?: string | null
  rejectReason?: string | null
  requesterStaff?: { id: string; firstName: string; lastName: string; department: string }
  decidedByStaff?: { id: string; firstName: string; lastName: string } | null
}

export type ClassGroupSummary = {
  id: string
  title: string
  parentsCanPost: boolean
  class: { id: string; name: string }
  counselorStaff?: { id: string; firstName: string; lastName: string } | null
  _count?: { members: number; messages?: number }
}
