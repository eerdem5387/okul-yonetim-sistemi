export type ChatActorKind = "staff" | "parent"

export interface ChatParticipantStaff {
  id: string
  firstName: string
  lastName: string
  department: string
}

export interface ChatParticipantParent {
  id: string
  displayName: string
  studentTcNumber: string
}

export interface ChatParticipant {
  id?: string
  role: "ADMIN" | "MEMBER"
  canPost?: boolean
  staff: ChatParticipantStaff | null
  parent: ChatParticipantParent | null
}

export type ConversationType = "PRIVATE" | "GROUP" | "ANNOUNCEMENT"
export type MessageType = "TEXT" | "IMAGE" | "DOCUMENT"

export interface ChatLastMessage {
  id: string
  body: string
  type: MessageType
  attachmentUrl: string | null
  createdAt: string
  senderStaffId: string | null
  senderParentId: string | null
}

export interface ChatConversation {
  id: string
  type: ConversationType
  title: string | null
  updatedAt: string
  myRole: "ADMIN" | "MEMBER"
  membersCanPost?: boolean
  createdByStaffId?: string | null
  systemKey?: string | null
  studentName?: string | null
  className?: string | null
  branchName?: string | null
  participants: ChatParticipant[]
  lastMessage: ChatLastMessage | null
  unreadCount: number
}

export interface ChatMessageSender {
  kind: ChatActorKind
  id: string
  displayName: string
  department?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  body: string
  type: MessageType
  attachmentUrl: string | null
  createdAt: string
  sender: ChatMessageSender | null
}

export interface ContactStaff {
  id: string
  firstName: string
  lastName: string
  department: string
  position: string | null
  subject: string | null
}

export interface ContactParent {
  id: string
  displayName: string
  studentTcNumber: string
  studentNames: string[]
  studentClasses: string[]
  studentClassIds?: string[]
  students?: { id: string; name: string }[]
}

export interface ContactsResponse {
  actor: { kind: ChatActorKind }
  staff: ContactStaff[]
  parents: ContactParent[]
  branches?: { id: string; name: string; teacherCount: number }[]
  classes?: { id: string; name: string }[]
}
