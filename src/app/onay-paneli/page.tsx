"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2, Calendar, User, BookOpen, Eye, School } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Approval {
  id: string;
  changeType: string;
  status: string;
  createdAt: string;
  requestedBy: string;
  notes: string | null;
  oldValue: string | null;
  newValue: string | null;
  schedule: {
    id: string;
    subjectName: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    teacherId?: string; // ✅ Teacher ID (opsiyonel)
    class: {
      name: string;
      grade: number;
      section: string;
    };
    teacher: {
      id?: string; // ✅ Teacher ID (opsiyonel)
      firstName: string;
      lastName: string;
    };
  } | null; // ✅ CREATE işlemlerinde null olabilir
  classId: string; // ✅ Sınıf ID'si (schedule null olsa bile)
}

const dayNames = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
// ✅ Sınıf yönetimi ile aynı format
type LessonSlot = { id: number; label: string; startTime: string; endTime: string };
const lessonSlots: LessonSlot[] = [
  { id: 1, label: "1. Ders", startTime: "08:00", endTime: "09:00" },
  { id: 2, label: "2. Ders", startTime: "09:00", endTime: "10:00" },
  { id: 3, label: "3. Ders", startTime: "10:00", endTime: "11:00" },
  { id: 4, label: "4. Ders", startTime: "11:00", endTime: "12:00" },
  { id: 5, label: "5. Ders", startTime: "12:00", endTime: "13:00" },
  { id: 6, label: "6. Ders", startTime: "13:00", endTime: "14:00" },
  { id: 7, label: "7. Ders", startTime: "14:00", endTime: "15:00" },
  { id: 8, label: "8. Ders", startTime: "15:00", endTime: "16:00" },
  { id: 9, label: "1. Etüt", startTime: "16:00", endTime: "17:00" },
  { id: 10, label: "2. Etüt", startTime: "17:00", endTime: "18:00" },
];

const changeTypeLabels: { [key: string]: string } = {
  CREATE: "Yeni Ders Ekleme",
  UPDATE: "Ders Güncelleme",
  DELETE: "Ders Silme",
};

const changeTypeColors: { [key: string]: string } = {
  CREATE: "bg-green-100 text-green-700 border-green-300",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-300",
  DELETE: "bg-red-100 text-red-700 border-red-300",
};

export default function ApprovalPanelPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  section: string;
}

interface StaffInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

interface ScheduleInfo {
  id: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

  const [classesMap, setClassesMap] = useState<Record<string, ClassInfo>>({});
  const [teachersMap, setTeachersMap] = useState<Record<string, StaffInfo>>({});
  const [counselorsMap, setCounselorsMap] = useState<Record<string, StaffInfo>>({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [classSchedules, setClassSchedules] = useState<ScheduleInfo[]>([]);

  useEffect(() => {
    fetchApprovals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/schedule-approvals?status=PENDING");
      if (response.ok) {
        const data = await response.json();
        const approvalsData = data.approvals || [];
        
        // ✅ CREATE işlemleri için class ve teacher bilgilerini çek
        const classIds = new Set<string>();
        const teacherIds = new Set<string>();
        
        const counselorIds = new Set<string>();
        
        approvalsData.forEach((approval: Approval) => {
          if (approval.classId) classIds.add(approval.classId);
          if (approval.requestedBy) counselorIds.add(approval.requestedBy);
          if (approval.newValue && !approval.schedule) {
            try {
              const parsed = JSON.parse(approval.newValue);
              if (parsed.teacherId) teacherIds.add(parsed.teacherId);
            } catch {
              // Ignore parse errors
            }
          }
        });
        
        // Class bilgilerini çek
        if (classIds.size > 0) {
          const classesResponse = await Promise.all(
            Array.from(classIds).map(id => fetch(`/api/classes/${id}`).then(r => r.json()))
          );
          const classes: Record<string, ClassInfo> = {};
          classesResponse.forEach((data: { class?: ClassInfo }) => {
            if (data.class) {
              classes[data.class.id] = data.class;
            }
          });
          setClassesMap(classes);
        }
        
        // Teacher bilgilerini çek
        if (teacherIds.size > 0) {
          const teachersResponse = await Promise.all(
            Array.from(teacherIds).map(id => fetch(`/api/staff/${id}`).then(r => r.json()))
          );
          const teachers: Record<string, StaffInfo> = {};
          teachersResponse.forEach((teacher: StaffInfo) => {
            if (teacher.id) {
              teachers[teacher.id] = teacher;
            }
          });
          setTeachersMap(teachers);
        }
        
        // ✅ Rehberlik uzmanı bilgilerini çek
        if (counselorIds.size > 0) {
          const counselorsResponse = await Promise.all(
            Array.from(counselorIds).map(id => fetch(`/api/staff/${id}`).then(r => r.json()))
          );
          const counselors: Record<string, StaffInfo> = {};
          counselorsResponse.forEach((counselor: StaffInfo) => {
            if (counselor.id) {
              counselors[counselor.id] = counselor;
            }
          });
          setCounselorsMap(counselors);
        }
        
        setApprovals(approvalsData);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    setActionLoading(approvalId);
    try {
      // Onaylayan kişinin staff ID'sini al
      const staffId = typeof window !== "undefined" ? localStorage.getItem("staff_id") : null;
      
      if (!staffId) {
        alert("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      const response = await fetch(`/api/schedule-approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: staffId }),
      });
      
      if (response.ok) {
        alert("✅ Değişiklik başarıyla onaylandı!");
        fetchApprovals(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || "Onaylama başarısız oldu.");
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert("Onaylama sırasında bir hata oluştu.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShowDetail = async (approval: Approval) => {
    setSelectedApproval(approval);
    
    // ✅ Sınıfın mevcut ders programını çek
    try {
      const response = await fetch(`/api/classes/${approval.classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassSchedules(data.class?.schedules || []);
      }
    } catch (error) {
      console.error("Error fetching class schedules:", error);
    }
    
    setShowDetailModal(true);
  };

  const handleReject = async (approvalId: string) => {
    const reason = prompt("Reddetme sebebini belirtiniz (opsiyonel):");
    if (reason === null) return; // İptal edildi
    
    setActionLoading(approvalId);
    try {
      // Reddeden kişinin staff ID'sini al
      const staffId = typeof window !== "undefined" ? localStorage.getItem("staff_id") : null;
      
      if (!staffId) {
        alert("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      const response = await fetch(`/api/schedule-approvals/${approvalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rejectedBy: staffId,
          notes: reason || undefined
        }),
      });
      
      if (response.ok) {
        alert("❌ Değişiklik reddedildi.");
        fetchApprovals(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || "Reddetme başarısız oldu.");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Reddetme sırasında bir hata oluştu.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="h-7 w-7 text-orange-600" />
            Onay Paneli
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Rehberlik uzmanlarının ders programı değişiklik taleplerini onaylayın veya reddedin.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bekleyen Onaylar</p>
                <p className="text-2xl font-bold text-orange-600">{approvals.length}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Yeni Ekleme</p>
                <p className="text-2xl font-bold text-green-600">
                  {approvals.filter((a) => a.changeType === "CREATE").length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Silme İsteği</p>
                <p className="text-2xl font-bold text-red-600">
                  {approvals.filter((a) => a.changeType === "DELETE").length}
                </p>
              </div>
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tüm talepler işlendi!</h3>
            <p className="text-gray-600">Şu anda onay bekleyen bir değişiklik bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={changeTypeColors[approval.changeType]}>
                        {changeTypeLabels[approval.changeType]}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(approval.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        // ✅ Schedule null ise newValue'dan parse et (CREATE işlemi)
                        let scheduleData: {
                          subjectName: string;
                          dayOfWeek: number;
                          startTime: string | null;
                          endTime: string | null;
                        } | null = null;
                        let classData: {
                          name: string;
                          grade: number;
                          section: string;
                        } | null = null;
                        let teacherData: {
                          firstName: string;
                          lastName: string;
                        } | null = null;

                        if (approval.schedule) {
                          // Mevcut schedule varsa (UPDATE/DELETE)
                          scheduleData = approval.schedule;
                          classData = approval.schedule.class;
                          teacherData = approval.schedule.teacher;
                        } else if (approval.newValue) {
                          // CREATE işlemi - newValue'dan parse et
                          try {
                            const parsed = JSON.parse(approval.newValue);
                            scheduleData = {
                              subjectName: parsed.subjectName,
                              dayOfWeek: parsed.dayOfWeek,
                              startTime: parsed.startTime || null,
                              endTime: parsed.endTime || null,
                            };
                            // Class bilgisini classesMap'ten al
                            if (approval.classId && classesMap[approval.classId]) {
                              classData = {
                                name: classesMap[approval.classId].name,
                                grade: classesMap[approval.classId].grade,
                                section: classesMap[approval.classId].section,
                              };
                            }
                            // Teacher bilgisini teachersMap'ten al
                            if (parsed.teacherId && teachersMap[parsed.teacherId]) {
                              teacherData = {
                                firstName: teachersMap[parsed.teacherId].firstName,
                                lastName: teachersMap[parsed.teacherId].lastName,
                              };
                            }
                          } catch (error) {
                            console.error("Error parsing newValue:", error);
                          }
                        }

                        if (!scheduleData) {
                          return (
                            <div className="text-sm text-gray-500">
                              Bilgiler yükleniyor...
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <strong>{scheduleData.subjectName}</strong>
                              {classData && (
                                <>
                                  <span className="text-gray-500">-</span>
                                  <span className="text-gray-700">{classData.name || `Sınıf ID: ${approval.classId}`}</span>
                                </>
                              )}
                            </div>
                            {teacherData && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                <span>
                                  {teacherData.firstName} {teacherData.lastName}
                                </span>
                              </div>
                            )}
                            {scheduleData.dayOfWeek && (() => {
                              // ✅ Saat gösterimini "1. Ders", "2. Ders" formatına çevir
                              let lessonLabel = "";
                              
                              if (scheduleData.startTime) {
                                // Saat formatını normalize et
                                let normalizedTime = String(scheduleData.startTime).trim();
                                if (normalizedTime.length > 5) {
                                  normalizedTime = normalizedTime.substring(0, 5);
                                }
                                if (normalizedTime.length < 5) {
                                  normalizedTime = normalizedTime.padStart(5, '0');
                                }
                                
                                // lessonSlots array'inde eşleşen slot'u bul
                                const slot = lessonSlots.find(
                                  s => s.startTime === normalizedTime
                                );
                                
                                if (slot) {
                                  lessonLabel = slot.label;
                                } else {
                                  // Eğer tam eşleşme yoksa, en yakın slot'u bul
                                  const timeParts = normalizedTime.split(':');
                                  const timeMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
                                  
                                  let closestSlot: LessonSlot | null = null;
                                  let minDiff = Infinity;
                                  
                                  lessonSlots.forEach((s) => {
                                    const slotParts = s.startTime.split(':');
                                    const slotMinutes = parseInt(slotParts[0]) * 60 + parseInt(slotParts[1]);
                                    const diff = Math.abs(timeMinutes - slotMinutes);
                                    
                                    if (diff < minDiff && diff <= 30) { // 30 dakika tolerans
                                      minDiff = diff;
                                      closestSlot = s;
                                    }
                                  });
                                  
                                  lessonLabel = closestSlot
                                    ? (closestSlot as LessonSlot).label
                                    : `${scheduleData.startTime} - ${scheduleData.endTime || ""}`;
                                }
                              } else {
                                lessonLabel = "Bilinmiyor";
                              }
                              
                              return (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {dayNames[scheduleData.dayOfWeek]} | {lessonLabel}
                                  </span>
                                </div>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </div>

                    {/* ✅ Rehberlik Uzmanı Bilgisi */}
                    {counselorsMap[approval.requestedBy] && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
                        <User className="h-4 w-4 text-purple-600" />
                        <span className="text-gray-500">Talep Eden:</span>
                        <span className="font-medium text-gray-900">
                          {counselorsMap[approval.requestedBy].firstName} {counselorsMap[approval.requestedBy].lastName}
                        </span>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                          Rehberlik
                        </Badge>
                      </div>
                    )}

                    {approval.notes && (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                        <strong>Not:</strong> {approval.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 lg:w-32 text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => handleShowDetail(approval)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detay
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 lg:w-32 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(approval.id)}
                      disabled={actionLoading === approval.id}
                    >
                      {actionLoading === approval.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Onayla
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 lg:w-32 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleReject(approval.id)}
                      disabled={actionLoading === approval.id}
                    >
                      {actionLoading === approval.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reddet
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ✅ Detay Modal - Haftalık Ders Programı */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-blue-600" />
              Ders Programı Detayı
            </DialogTitle>
          </DialogHeader>
          
          {selectedApproval && (() => {
            // Değişiklik bilgilerini parse et
            let changeDayOfWeek: number | null = null;
            let changeStartTime: string | null = null;
            let changeSubjectName: string | null = null;
            let changeTeacherId: string | null = null;
            
            if (selectedApproval.schedule) {
              // UPDATE veya DELETE - mevcut schedule'dan al
              changeDayOfWeek = selectedApproval.schedule.dayOfWeek;
              changeStartTime = selectedApproval.schedule.startTime;
              changeSubjectName = selectedApproval.schedule.subjectName;
              changeTeacherId = selectedApproval.schedule.teacherId || selectedApproval.schedule.teacher?.id || null;
              
              // UPDATE ise newValue'dan yeni bilgileri al
              if (selectedApproval.changeType === "UPDATE" && selectedApproval.newValue) {
                try {
                  const parsed = JSON.parse(selectedApproval.newValue);
                  changeSubjectName = parsed.subjectName || changeSubjectName;
                  changeTeacherId = parsed.teacherId || changeTeacherId;
                  // UPDATE'de dayOfWeek ve startTime değişebilir
                  if (parsed.dayOfWeek) changeDayOfWeek = parsed.dayOfWeek;
                  if (parsed.startTime) changeStartTime = parsed.startTime;
                } catch (error) {
                  console.error("Error parsing newValue:", error);
                }
              }
            } else if (selectedApproval.newValue) {
              // CREATE - newValue'dan parse et
              try {
                const parsed = JSON.parse(selectedApproval.newValue);
                changeDayOfWeek = parsed.dayOfWeek;
                changeStartTime = parsed.startTime;
                changeSubjectName = parsed.subjectName;
                changeTeacherId = parsed.teacherId;
              } catch (error) {
                console.error("Error parsing newValue:", error);
              }
            }
            
            const classData = classesMap[selectedApproval.classId];
            
            return (
              <div className="space-y-4">
                {/* Bilgi Kartı */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Sınıf:</span>{" "}
                        <span className="font-semibold">{classData?.name || "Yükleniyor..."}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">İşlem Tipi:</span>{" "}
                        <Badge className={changeTypeColors[selectedApproval.changeType]}>
                          {changeTypeLabels[selectedApproval.changeType]}
                        </Badge>
                      </div>
                      {counselorsMap[selectedApproval.requestedBy] && (
                        <div>
                          <span className="text-gray-600">Talep Eden:</span>{" "}
                          <span className="font-semibold">
                            {counselorsMap[selectedApproval.requestedBy].firstName}{" "}
                            {counselorsMap[selectedApproval.requestedBy].lastName}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Haftalık Ders Programı Tablosu */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Ders
                        </th>
                        {dayNames.slice(1, 6).map((day, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lessonSlots.map((slot, slotIndex) => {
                        const slotStartTime = slot.startTime;
                        return (
                          <tr key={slotIndex}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                              {slot.label}
                            </td>
                            {dayNames.slice(1, 6).map((_, dayIndex) => {
                              const dayOfWeek = dayIndex + 1;
                              const schedule = classSchedules.find(
                                (s) => s.dayOfWeek === dayOfWeek && s.startTime === slotStartTime
                              );
                              
                              // ✅ Değişiklik yapılmak istenen yer mi kontrol et
                              // Saat formatlarını normalize et ve karşılaştır
                              let normalizedChangeTime = changeStartTime;
                              if (normalizedChangeTime) {
                                normalizedChangeTime = String(normalizedChangeTime).trim();
                                if (normalizedChangeTime.length > 5) {
                                  normalizedChangeTime = normalizedChangeTime.substring(0, 5);
                                }
                                if (normalizedChangeTime.length < 5) {
                                  normalizedChangeTime = normalizedChangeTime.padStart(5, '0');
                                }
                              }
                              
                              // Slot start time'ı da normalize et
                              let normalizedSlotTime = slotStartTime;
                              if (normalizedSlotTime) {
                                normalizedSlotTime = String(normalizedSlotTime).trim();
                                if (normalizedSlotTime.length > 5) {
                                  normalizedSlotTime = normalizedSlotTime.substring(0, 5);
                                }
                                if (normalizedSlotTime.length < 5) {
                                  normalizedSlotTime = normalizedSlotTime.padStart(5, '0');
                                }
                              }
                              
                              // Eşleşme kontrolü
                              const isChangeLocation = 
                                changeDayOfWeek === dayOfWeek && 
                                normalizedChangeTime === normalizedSlotTime;
                              
                              // ✅ Öğretmen bilgisini al
                              let changeTeacherName = "";
                              if (isChangeLocation && changeTeacherId && teachersMap[changeTeacherId]) {
                                changeTeacherName = `${teachersMap[changeTeacherId].firstName} ${teachersMap[changeTeacherId].lastName}`;
                              }
                              
                              return (
                                <td
                                  key={dayIndex}
                                  className={`px-3 py-2 border-l border-gray-200 ${
                                    isChangeLocation
                                      ? "bg-orange-200 border-orange-400 border-2"
                                      : schedule
                                      ? "bg-gradient-to-br from-blue-50 to-indigo-50"
                                      : ""
                                  }`}
                                >
                                  {isChangeLocation ? (
                                    // ✅ Değişiklik yapılmak istenen yer - TURUNCU
                                    <div className="text-xs text-orange-800 font-bold">
                                      <p className="font-semibold">{changeSubjectName || "Yeni Ders"}</p>
                                      {changeTeacherName && (
                                        <p className="text-orange-700 font-medium mt-1">
                                          {changeTeacherName}
                                        </p>
                                      )}
                                      <p className="text-orange-600 text-[10px] mt-1">
                                        {selectedApproval.changeType === "CREATE" && "🆕 Yeni Ekleme"}
                                        {selectedApproval.changeType === "UPDATE" && "🔄 Güncelleme"}
                                        {selectedApproval.changeType === "DELETE" && "🗑️ Silme"}
                                      </p>
                                    </div>
                                  ) : schedule ? (
                                    // Mevcut ders
                                    <div className="text-xs text-gray-800 font-medium">
                                      <p className="font-semibold">{schedule.subjectName}</p>
                                      <p className="text-gray-600">
                                        {schedule.teacher?.firstName} {schedule.teacher?.lastName}
                                      </p>
                                      {schedule.room && (
                                        <p className="text-gray-500">{schedule.room}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Onay/Red Butonları */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1"
                  >
                    Kapat
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleReject(selectedApproval.id);
                    }}
                    disabled={actionLoading === selectedApproval.id}
                  >
                    {actionLoading === selectedApproval.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reddet
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleApprove(selectedApproval.id);
                    }}
                    disabled={actionLoading === selectedApproval.id}
                  >
                    {actionLoading === selectedApproval.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Onayla
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

