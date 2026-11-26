export type NoticeType = "IHTAR" | "TALIMAT" | "PERSONEL_DUYURU"
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"

export type CommsCapabilities = {
  sendOfficial: boolean
  sendClassAnnouncement: boolean
  manageTemplates: boolean
  manageGrants: boolean
  approveRequests: boolean
  createClassGroup: boolean
  createRequest: boolean
  deleteComms: boolean
  showInbox: boolean
  viewAllNotices: boolean
}

export type CommsBadges = {
  unreadNotices: number
  pendingRequests: number
  decidedRequests: number
  unreadAnnouncements: number
  unreadMessages: number
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
  badges: CommsBadges
}

export type CommsTemplate = {
  id: string
  kind: string
  title: string
  body: string
  isActive: boolean
}

export type StaffRef = { id: string; firstName: string; lastName: string; department?: string }

export type OfficialNotice = {
  id: string
  type: NoticeType
  subject: string
  body: string
  createdAt: string
  seenAt: string | null
  batchId?: string
  senderStaff?: StaffRef
  recipientStaff?: StaffRef
}

export type NoticeBatch = {
  batchId: string
  type: NoticeType
  subject: string
  body: string
  createdAt: string
  sender: StaffRef
  singleRecipient: StaffRef | null
  total: number
  seen: number
  unseen: number
  lastRemindedAt: string | null
  mine: boolean
}

export type BatchRecipient = {
  noticeId: string
  staff: StaffRef
  seenAt: string | null
  remindedAt: string | null
  remindCount: number
}

export type StaffCommsRequest = {
  id: string
  subject: string
  body: string
  status: RequestStatus
  createdAt: string
  viewedAt?: string | null
  decidedAt?: string | null
  decisionNote?: string | null
  rejectReason?: string | null
  newDecision?: boolean
  requesterStaff?: StaffRef
  decidedByStaff?: StaffRef | null
  template?: { id: string; title: string } | null
}

export type ClassGroupSummary = {
  id: string
  title: string
  parentsCanPost: boolean
  class: { id: string; name: string }
  counselorStaff?: StaffRef | null
  _count?: { members: number; messages?: number }
  unreadCount?: number
  lastMessage?: { body: string; createdAt: string; senderName: string } | null
}

export type GroupMember = {
  id: string
  role: "COUNSELOR" | "TEACHER" | "PARENT"
  staff: StaffRef | null
  parent: { id: string; displayName: string } | null
}

export type GroupDetail = {
  id: string
  title: string
  classId: string
  class: { id: string; name: string }
  parentsCanPost: boolean
  counselorStaffId: string | null
  counselorStaff: StaffRef | null
  parentCount: number
  members: GroupMember[]
}

export type GroupPermissions = {
  canManage: boolean
  canPost: boolean
  canChangeCounselor: boolean
  canDelete: boolean
}

export type TimelineSender = { kind: "staff" | "parent"; id: string; displayName: string } | null

export type GroupTimelineItem =
  | {
      kind: "message"
      id: string
      body: string
      attachmentUrl?: string | null
      attachmentName?: string | null
      attachmentType?: string | null
      createdAt: string
      sender: TimelineSender
    }
  | {
      kind: "announcement"
      id: string
      subject: string
      body: string
      createdAt: string
      sender: TimelineSender
      seenAt: string | null
      readStats?: { total: number; seen: number }
    }
