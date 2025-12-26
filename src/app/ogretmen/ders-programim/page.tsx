"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, School, Loader2 } from "lucide-react";

interface Schedule {
  id: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  class: {
    id: string;
    name: string;
    grade: number;
    section: string;
  };
}

const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

export default function TeacherSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<{ [key: number]: Schedule[] }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const teacherId = localStorage.getItem("staff_id");
      if (teacherId) {
        fetchSchedule(teacherId);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchSchedule = async (teacherId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/schedules/teacher?teacherId=${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
        
        // Organize by day
        const organized: { [key: number]: Schedule[] } = {
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
        };
        (data.schedules || []).forEach((schedule: Schedule) => {
          organized[schedule.dayOfWeek].push(schedule);
        });
        setWeeklySchedule(organized);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalHours = schedules.length;
  const uniqueClasses = new Set(schedules.map((s) => s.class.id)).size;
  const uniqueSubjects = new Set(schedules.map((s) => s.subjectName)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="h-7 w-7 text-blue-600" />
          Haftalık Ders Programım
        </h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Size atanmış haftalık ders programınızı görüntüleyin.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Ders Saati</p>
                <p className="text-2xl font-bold text-blue-600">{totalHours}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sınıf Sayısı</p>
                <p className="text-2xl font-bold text-green-600">{uniqueClasses}</p>
              </div>
              <School className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ders Sayısı</p>
                <p className="text-2xl font-bold text-purple-600">{uniqueSubjects}</p>
              </div>
              <Calendar className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Henüz ders programınız oluşturulmamış
            </h3>
            <p className="text-gray-600">
              Okul yönetimi tarafından ders programınız atandığında burada görünecektir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {dayNames.map((day, index) => {
            const dayIndex = index + 1;
            const daySchedules = weeklySchedule[dayIndex] || [];
            
            return (
              <Card key={dayIndex} className="border-t-4 border-t-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    {day}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {daySchedules.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Ders yok</p>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-2"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                          <Clock className="h-4 w-4 text-blue-600" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.subjectName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <School className="h-3 w-3" />
                          {schedule.class.name}
                        </div>
                        {schedule.room && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {schedule.room}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </div>
    </div>
  );
}

