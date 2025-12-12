/**
 * Bildirim Oluşturma Utility Fonksiyonları
 */

type NotificationType =
  | "ONAY_BEKLIYOR"
  | "TAMAMLANDI"
  | "GECIKMELI"
  | "YAKLASAN_DEADLINE"
  | "AKSAMA_OLUSTURULDU"
  | "OGRETMEN_ATANDI"
  | "UNITE_TAMAMLANDI"
  | "ERKEN_TAMAMLANDI"
  | "HAFTALIK_OZET"
  | "KRITIK_GECIKME"

type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL"

type StaffDepartment = "OGRETMEN" | "REHBERLIK" | "OGRENCI_ISLERI"

interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  targetRole?: StaffDepartment | null
  targetUserId?: string | null
  priority?: NotificationPriority
  relatedSubjectId?: string | null
  relatedTopicId?: string | null
  relatedUnitId?: string | null
  relatedStaffId?: string | null
}

/**
 * Yeni bir bildirim oluşturur
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: params.type,
        title: params.title,
        message: params.message,
        targetRole: params.targetRole || null,
        targetUserId: params.targetUserId || null,
        priority: params.priority || "NORMAL",
        relatedSubjectId: params.relatedSubjectId || null,
        relatedTopicId: params.relatedTopicId || null,
        relatedUnitId: params.relatedUnitId || null,
        relatedStaffId: params.relatedStaffId || null,
      }),
    })

    if (!response.ok) {
      throw new Error("Bildirim oluşturulamadı")
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

/**
 * Konu tamamlama onayı bildirimi (Rehberlik için)
 */
export async function notifyTopicPendingApproval(
  topicName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  teacherName: string,
  topicId: string,
  subjectId: string
) {
  return createNotification({
    type: "ONAY_BEKLIYOR",
    title: "Onay Bekleyen Konu",
    message: `${teacherName}, ${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${topicName} konusunu tamamlandı olarak bildirdi.`,
    targetRole: "REHBERLIK",
    priority: "HIGH",
    relatedTopicId: topicId,
    relatedSubjectId: subjectId,
  })
}

/**
 * Konu tamamlandı bildirimi (Öğretmen için)
 */
export async function notifyTopicCompleted(
  topicName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  teacherId: string,
  topicId: string,
  subjectId: string
) {
  return createNotification({
    type: "TAMAMLANDI",
    title: "Konu Onaylandı ✅",
    message: `${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${topicName} konusu onaylandı. Tebrikler!`,
    targetRole: "OGRETMEN",
    targetUserId: teacherId,
    priority: "NORMAL",
    relatedTopicId: topicId,
    relatedSubjectId: subjectId,
  })
}

/**
 * Gecikme bildirimi
 */
export async function notifyTopicDelayed(
  topicName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  delayDays: number,
  teacherId: string | null,
  topicId: string,
  subjectId: string
) {
  const isCritical = delayDays >= 5

  // Öğretmene bildirim
  if (teacherId) {
    await createNotification({
      type: isCritical ? "KRITIK_GECIKME" : "GECIKMELI",
      title: isCritical ? "⚠️ Kritik Gecikme" : "Gecikme Uyarısı",
      message: `${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${topicName} konusu planın ${delayDays} gün gerisinde kaldı.`,
      targetRole: "OGRETMEN",
      targetUserId: teacherId,
      priority: isCritical ? "CRITICAL" : "HIGH",
      relatedTopicId: topicId,
      relatedSubjectId: subjectId,
    })
  }

  // Rehberlik/Yönetime bildirim
  return createNotification({
    type: isCritical ? "KRITIK_GECIKME" : "GECIKMELI",
    title: isCritical ? "⚠️ Kritik Gecikme" : "Gecikme Bildirimi",
    message: `${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${topicName} konusu ${delayDays} gün gecikmeye girdi.`,
    targetRole: "REHBERLIK",
    priority: isCritical ? "CRITICAL" : "HIGH",
    relatedTopicId: topicId,
    relatedSubjectId: subjectId,
  })
}

/**
 * Yaklaşan deadline bildirimi
 */
export async function notifyUpcomingDeadline(
  topicName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  daysLeft: number,
  teacherId: string,
  topicId: string,
  subjectId: string
) {
  return createNotification({
    type: "YAKLASAN_DEADLINE",
    title: "Yaklaşan Deadline",
    message: `${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${topicName} konusunun bitiş tarihine ${daysLeft} gün kaldı.`,
    targetRole: "OGRETMEN",
    targetUserId: teacherId,
    priority: daysLeft <= 2 ? "HIGH" : "NORMAL",
    relatedTopicId: topicId,
    relatedSubjectId: subjectId,
  })
}

/**
 * Aksama oluşturuldu bildirimi
 */
export async function notifyDisruptionCreated(
  disruptionReason: string,
  startDate: string,
  endDate: string,
  affectedSubjectsCount: number
) {
  return createNotification({
    type: "AKSAMA_OLUSTURULDU",
    title: "Yeni Aksama Oluşturuldu",
    message: `"${disruptionReason}" nedeniyle ${new Date(startDate).toLocaleDateString("tr-TR")} - ${new Date(endDate).toLocaleDateString("tr-TR")} tarihlerinde aksama oluşturuldu. ${affectedSubjectsCount} ders etkilendi.`,
    targetRole: null, // Herkese
    priority: "NORMAL",
  })
}

/**
 * Öğretmen atama bildirimi
 */
export async function notifyTeacherAssigned(
  teacherId: string,
  teacherName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  subjectId: string
) {
  return createNotification({
    type: "OGRETMEN_ATANDI",
    title: "Yeni Ders Ataması 🎓",
    message: `${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} dersine atandınız.`,
    targetRole: "OGRETMEN",
    targetUserId: teacherId,
    priority: "NORMAL",
    relatedSubjectId: subjectId,
  })
}

/**
 * Ünite tamamlandı bildirimi
 */
export async function notifyUnitCompleted(
  unitName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  teacherId: string,
  unitId: string,
  subjectId: string
) {
  return createNotification({
    type: "UNITE_TAMAMLANDI",
    title: "Ünite Tamamlandı 🎉",
    message: `Tebrikler! ${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${unitName} ünitesinin tüm konuları tamamlandı.`,
    targetRole: "OGRETMEN",
    targetUserId: teacherId,
    priority: "NORMAL",
    relatedUnitId: unitId,
    relatedSubjectId: subjectId,
  })
}

/**
 * Erken tamamlama bildirimi
 */
export async function notifyEarlyCompletion(
  topicName: string,
  subjectName: string,
  grade: number,
  section: string | null,
  earlyDays: number,
  teacherId: string,
  topicId: string,
  subjectId: string
) {
  return createNotification({
    type: "ERKEN_TAMAMLANDI",
    title: "Erken Tamamlama 🌟",
    message: `Harika! ${grade}${section ? `/${section}` : ""}. sınıf ${subjectName} - ${topicName} konusu planın ${earlyDays} gün önünde tamamlandı.`,
    targetRole: "OGRETMEN",
    targetUserId: teacherId,
    priority: "LOW",
    relatedTopicId: topicId,
    relatedSubjectId: subjectId,
  })
}

