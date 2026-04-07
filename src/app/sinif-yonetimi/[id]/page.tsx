"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Users,
  Calendar,
  Loader2,
  Plus,
  Trash2,
  User,
  BookOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClassData {
  id: string;
  name: string;
  grade: number;
  section: string;
  counselorId?: string | null;
  counselor?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  students?: Array<{
    id: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      tcNumber: string;
    };
  }>;
  schedules?: Array<{
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
  }>;
  academicYear: {
    id: string;
    name: string;
  };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  tcNumber: string;
  grade?: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface Schedule {
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

const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const lessonSlots = [
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

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [scheduleForm, setScheduleForm] = useState({
    subjectName: "",
    teacherId: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    room: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentsPickerLoading, setStudentsPickerLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null); // Kullanıcı rolü
  const [staffId, setStaffId] = useState<string | null>(null); // Rehberlik için

  useEffect(() => {
    // Kullanıcı rol kontrolü
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role");
      const sid = localStorage.getItem("staff_id");
      setUserRole(role);
      setStaffId(sid);
      
      fetchClassData(role, sid);
      fetchTeachers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Öğrenci ekle modalı: API sayfalaması (varsayılan limit=10) yüzünden tüm okul yerine arama/sunucu tarafı kullanılmalı */
  useEffect(() => {
    if (!showAddStudentModal) return;

    const ac = new AbortController();
    const q = studentSearch.trim();
    const delayMs = q.length > 0 ? 320 : 0;

    const timer = setTimeout(async () => {
      setStudentsPickerLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", q ? "500" : "5000");
        if (q) params.set("search", q);
        const res = await fetch(`/api/students?${params.toString()}`, {
          signal: ac.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("Error loading students for picker:", e);
      } finally {
        if (!ac.signal.aborted) setStudentsPickerLoading(false);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [showAddStudentModal, studentSearch]);

  const fetchClassData = async (role: string | null, staffId: string | null) => {
    try {
      const response = await fetch(`/api/classes/${id}`);
      if (response.ok) {
        const data = await response.json();
        const classData = data.class;
        
        // ✅ Rehberlik kullanıcısı kontrolü: Sadece kendisine atanan sınıfları görebilir
        if (role === "counselor" && staffId) {
          if (classData.counselorId !== staffId) {
            alert("Bu sınıfa erişim yetkiniz bulunmamaktadır. Sadece size atanan sınıfları görüntüleyebilirsiniz.");
            router.push("/sinif-yonetimi");
            return;
          }
        }
        
        setClassData(classData);
      }
    } catch (error) {
      console.error("Error fetching class:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/staff?department=OGRETMEN");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.staff || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/classes/${id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const parts: string[] = [];
        if (typeof data.added === "number" && data.added > 0) {
          parts.push(`${data.added} öğrenci eklendi`);
        }
        if (typeof data.skippedAlreadyInClass === "number" && data.skippedAlreadyInClass > 0) {
          parts.push(`${data.skippedAlreadyInClass} öğrenci zaten bu sınıftaydı`);
        }
        if (typeof data.invalidOrMissing === "number" && data.invalidOrMissing > 0) {
          parts.push(`${data.invalidOrMissing} kayıt geçersiz veya bulunamadı`);
        }
        if (parts.length === 0 && data.message) {
          parts.push(String(data.message));
        }
        if (parts.length > 0) {
          alert(parts.join(". ") + ".");
        }
        setShowAddStudentModal(false);
        setSelectedStudentIds([]);
        setStudentSearch("");
        fetchClassData(userRole, staffId);
      } else {
        alert(data.error || "Öğrenci eklenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Error adding students:", error);
      alert("Öğrenci eklenirken bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (
      !confirm(
        "Bu sınıfı kalıcı olarak silmek istediğinize emin misiniz?\n\n" +
          "Sınıftaki öğrenci atamaları, ders programı ve bu sınıfa bağlı ödev/yoklama kayıtları silinir. " +
          "Öğrenci kartları silinmez."
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        router.push("/sinif-yonetimi");
        return;
      }
      alert(data.error || "Sınıf silinirken bir hata oluştu.");
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Sınıf silinirken bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Bu öğrenciyi sınıftan çıkarmak istediğinize emin misiniz?")) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/classes/${id}/students?studentId=${studentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchClassData(userRole, staffId);
      } else {
        const data = await response.json();
        alert(data.error || "Öğrenci çıkarılırken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Error removing student:", error);
      alert("Öğrenci çıkarılırken bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleForm.subjectName || !scheduleForm.teacherId) {
      alert("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    setActionLoading(true);
    try {
      const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : "/api/schedules";
      const method = editingSchedule ? "PUT" : "POST";

      // Rehberlik ise requestedBy parametresi ekle
      const bodyData: {
        classId: string;
        subjectName: string;
        teacherId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room?: string;
        requestedBy?: string;
      } = {
        classId: id,
        ...scheduleForm,
        dayOfWeek: parseInt(scheduleForm.dayOfWeek),
      };

      if (userRole === "counselor" && staffId) {
        bodyData.requestedBy = staffId; // Rehberlik için onay mekanizması
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowAddScheduleModal(false);
        setEditingSchedule(null);
        setScheduleForm({
          subjectName: "",
          teacherId: "",
          dayOfWeek: "",
          startTime: "",
          endTime: "",
          room: "",
        });
        
        // Onay bekliyor mesajı göster
        if (data.pendingApproval) {
          alert("✅ Ders programı değişikliği oluşturuldu!\n\n📋 Talebiniz Müdür veya Yönetici onayına gönderildi.\n⏳ Onaylandıktan sonra ders programına eklenecektir.");
        } else {
          alert("✅ Ders başarıyla " + (editingSchedule ? "güncellendi!" : "eklendi!"));
        }
        
        fetchClassData(userRole, staffId);
      } else {
        alert(data.error || `Ders ${editingSchedule ? "güncellenirken" : "eklenirken"} bir hata oluştu.`);
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert(`Ders ${editingSchedule ? "güncellenirken" : "eklenirken"} bir hata oluştu.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz?")) return;
    setActionLoading(true);
    try {
      // Rehberlik ise requestedBy parametresi ekle
      let url = `/api/schedules/${scheduleId}`;
      if (userRole === "counselor" && staffId) {
        url += `?requestedBy=${staffId}`; // Rehberlik için onay mekanizması
      }

      const response = await fetch(url, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Onay bekliyor mesajı göster
        if (data.pendingApproval) {
          alert("✅ Ders silme talebi oluşturuldu!\n\n📋 Talebiniz Müdür veya Yönetici onayına gönderildi.\n⏳ Onaylandıktan sonra ders programdan silinecektir.");
        } else {
          alert("✅ Ders başarıyla silindi!");
        }
        fetchClassData(userRole, staffId);
      } else {
        alert(data.error || "Ders silinirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Ders silinirken bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Sınıf bulunamadı</p>
            <Button className="mt-4" onClick={() => router.back()}>
              Geri Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Bu sınıfta olmayan öğrenciler (liste API’den gelir; arama boşken limit=5000, doluyken sunucu araması)
  const assignedStudentIds = new Set(classData.students?.map((s) => s.student.id) || []);
  const availableStudents = students.filter((s) => !assignedStudentIds.has(s.id));

  const visibleIds = availableStudents.map((s) => s.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((sid) => selectedStudentIds.includes(sid));

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((x) => x !== studentId) : [...prev, studentId]
    );
  };

  const toggleAllVisibleStudents = () => {
    if (allVisibleSelected) {
      setSelectedStudentIds((prev) => prev.filter((sid) => !visibleIds.includes(sid)));
    } else {
      setSelectedStudentIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri Dön
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{classData.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {classData.academicYear.name} | {classData.grade}. Sınıf
          </p>
        </div>
        {(userRole === "admin" ||
          userRole === "principal" ||
          userRole === "student_affairs") && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={actionLoading}
            onClick={handleDeleteClass}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sınıfı sil
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Öğrenci</p>
                <p className="text-2xl font-bold text-blue-600">{classData.students?.length || 0}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ders Sayısı</p>
                <p className="text-2xl font-bold text-green-600">{classData.schedules?.length || 0}</p>
              </div>
              <BookOpen className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rehberlik</p>
                <p className="text-sm font-medium text-purple-600">
                  {classData.counselor
                    ? `${classData.counselor.firstName} ${classData.counselor.lastName}`
                    : "Atanmadı"}
                </p>
              </div>
              <User className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Öğrenciler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Öğrenciler ({classData.students?.length || 0})
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddStudentModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Öğrenci Ekle
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {classData.students?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Henüz öğrenci eklenmemiş</p>
              </div>
            ) : (
              <div className="space-y-2">
                {classData.students?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.student.firstName} {item.student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{item.student.tcNumber}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveStudent(item.student.id)}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Haftalık Ders Programı */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Haftalık Ders Programı
            </CardTitle>
            <p className="text-sm text-gray-500">Bir hücreye tıklayarak ders ekleyin veya düzenleyin</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-xs font-semibold text-gray-700 w-32">
                      Ders
                    </th>
                    {dayNames.slice(1, 6).map((day) => (
                      <th key={day} className="border border-gray-300 p-2 text-xs font-semibold text-gray-700">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lessonSlots.map((lesson, slotIndex) => {
                    return (
                      <tr key={slotIndex}>
                        <td className="border border-gray-300 p-2 text-xs font-semibold text-gray-700 bg-gray-50">
                          {lesson.label}
                        </td>
                        {[1, 2, 3, 4, 5].map((dayIndex) => {
                          const schedule = classData.schedules?.find(
                            (s) => s.dayOfWeek === dayIndex && s.startTime === lesson.startTime
                          );
                          return (
                            <td
                              key={`${dayIndex}-${slotIndex}`}
                              className={`border border-gray-300 p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                                schedule ? "bg-gradient-to-br from-green-50 to-teal-50" : "bg-white"
                              }`}
                              onClick={() => {
                                if (schedule) {
                                  setEditingSchedule(schedule);
                                  setScheduleForm({
                                    subjectName: schedule.subjectName,
                                    teacherId: schedule.teacher.id,
                                    dayOfWeek: String(schedule.dayOfWeek),
                                    startTime: schedule.startTime,
                                    endTime: schedule.endTime,
                                    room: schedule.room || "",
                                  });
                                } else {
                                  setEditingSchedule(null);
                                  setScheduleForm({
                                    subjectName: "",
                                    teacherId: "",
                                    dayOfWeek: String(dayIndex),
                                    startTime: lesson.startTime,
                                    endTime: lesson.endTime,
                                    room: "",
                                  });
                                }
                                setShowAddScheduleModal(true);
                              }}
                            >
                              {schedule ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {schedule.subjectName}
                                  </p>
                                  <p className="text-[10px] text-gray-600 truncate">
                                    {schedule.teacher.firstName} {schedule.teacher.lastName}
                                  </p>
                                  {schedule.room && (
                                    <p className="text-[10px] text-gray-500">{schedule.room}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-gray-300 hover:text-blue-600">
                                  <Plus className="h-4 w-4" />
                                </div>
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
          </CardContent>
        </Card>
      </div>

      {/* Add Student Modal */}
      <Dialog open={showAddStudentModal} onOpenChange={(open) => {
        setShowAddStudentModal(open);
        if (!open) {
          setStudentSearch("");
          setSelectedStudentIds([]);
        }
      }}>
        <DialogContent className="sm:max-w-xl max-h-[min(90vh,720px)] flex flex-col">
          <DialogHeader>
            <DialogTitle>Sınıfa öğrenci ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 flex flex-col min-h-0 flex-1">
            <div className="space-y-2 shrink-0">
              <Label htmlFor="student-search">Öğrenci ara</Label>
              <Input
                id="student-search"
                placeholder="İsim, soyisim veya TC ile ara…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Listeden birden çok öğrenci işaretleyip tek seferde ekleyebilirsiniz. «Listelenenlerin tümünü seç»
                yalnızca şu an ekrandaki (aranan) listeyi kapsar.
              </p>
            </div>
            <div className="space-y-2 min-h-0 flex flex-col flex-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Eklenebilir öğrenciler</span>
                <span className="text-xs tabular-nums text-blue-700 font-semibold">
                  {selectedStudentIds.length} seçili
                </span>
              </div>
              <div className="flex-1 min-h-[200px] max-h-[min(50vh,360px)] flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white">
                {studentsPickerLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-gray-500 gap-2 flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm">Öğrenciler yükleniyor…</p>
                  </div>
                ) : availableStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                    {studentSearch.trim() ? (
                      <>
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">Arama sonucu bulunamadı</p>
                      </>
                    ) : (
                      <>
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">Eklenebilecek öğrenci yok</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 shrink-0">
                      <input
                        id="select-all-visible"
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisibleStudents}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="select-all-visible" className="text-xs font-medium cursor-pointer select-none">
                        Listelenenlerin tümünü seç ({visibleIds.length})
                      </label>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                      {availableStudents.map((student) => {
                        const checked = selectedStudentIds.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-blue-50/80 transition-colors ${
                              checked ? "bg-blue-50 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-gray-900">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-gray-500">TC: {student.tcNumber}</p>
                              {student.grade && (
                                <p className="text-xs text-gray-500">Sınıf: {student.grade}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddStudentModal(false);
                  setStudentSearch("");
                  setSelectedStudentIds([]);
                }}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleAddStudents}
                disabled={selectedStudentIds.length === 0 || actionLoading}
                className="flex-1"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Seçilenleri ekle (${selectedStudentIds.length})`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Schedule Modal */}
      <Dialog open={showAddScheduleModal} onOpenChange={(open) => {
        setShowAddScheduleModal(open);
        if (!open) {
          setEditingSchedule(null);
          setScheduleForm({
            subjectName: "",
            teacherId: "",
            dayOfWeek: "",
            startTime: "",
            endTime: "",
            room: "",
          });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editingSchedule ? "Dersi Düzenle" : "Ders Ekle"}</span>
              {editingSchedule && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteSchedule(editingSchedule.id);
                    setShowAddScheduleModal(false);
                  }}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Gün ve Ders Bilgisi */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {dayNames[parseInt(scheduleForm.dayOfWeek) || 0]} | {lessonSlots.find(l => l.startTime === scheduleForm.startTime)?.label || scheduleForm.startTime}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-name">Ders Adı *</Label>
              <Input
                id="subject-name"
                value={scheduleForm.subjectName}
                onChange={(e) => setScheduleForm({ ...scheduleForm, subjectName: e.target.value })}
                placeholder="Örn: Matematik, Fizik, Türkçe"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-select">Öğretmen *</Label>
              <select
                id="teacher-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={scheduleForm.teacherId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, teacherId: e.target.value })}
              >
                <option value="">Öğretmen seçiniz</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Sınıf/Oda (Opsiyonel)</Label>
              <Input
                id="room"
                value={scheduleForm.room}
                onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                placeholder="Örn: A101, Fen Laboratuvarı"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddScheduleModal(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleAddSchedule}
                disabled={
                  !scheduleForm.subjectName ||
                  !scheduleForm.teacherId ||
                  actionLoading
                }
                className="flex-1"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingSchedule ? (
                  "Güncelle"
                ) : (
                  "Ekle"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

