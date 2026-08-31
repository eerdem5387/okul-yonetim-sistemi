"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, School } from "lucide-react";
import { getAuthHeaders } from "@/components/hr/hr-utils";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
}

export default function CreateClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [counselors, setCounselors] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    grade: "",
    section: "",
    academicYearId: "",
    counselorId: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAcademicYears();
    fetchCounselors();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch("/api/neredeyiz/academic-years");
      if (response.ok) {
        const data = await response.json();
        setAcademicYears(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, academicYearId: data[0].id }));
        }
      }
    } catch (fetchError) {
      console.error("Error fetching academic years:", fetchError);
    }
  };

  const fetchCounselors = async () => {
    try {
      const response = await fetch("/api/staff/pickers?type=counselors", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCounselors(data.staff || []);
      }
    } catch (fetchError) {
      console.error("Error fetching counselors:", fetchError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.grade || !formData.section || !formData.academicYearId) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      setLoading(false);
      return;
    }

    const className = `${formData.grade}/${formData.section.toUpperCase()}`;

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: className,
          grade: parseInt(formData.grade),
          section: formData.section.toUpperCase(),
          academicYearId: formData.academicYearId,
          counselorId: formData.counselorId || null,
        }),
      });

      if (response.ok) {
        router.push("/sinif-yonetimi");
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "Sınıf oluşturulurken bir hata oluştu.");
      }
    } catch (submitError) {
      console.error("Error creating class:", submitError);
      setError("Sınıf oluşturulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const grades = Array.from({ length: 8 }, (_, i) => i + 5); // 5-12
  const sections = ["A", "B", "C", "D", "E", "F", "G", "H"];

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri Dön
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <School className="h-6 w-6 text-blue-600" />
            Yeni Sınıf Oluştur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Akademik Yıl */}
            <div className="space-y-2">
              <Label htmlFor="academicYear">
                Akademik Yıl <span className="text-red-500">*</span>
              </Label>
              <select
                id="academicYear"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                required
              >
                <option value="">Seçiniz</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sınıf Seviyesi */}
            <div className="space-y-2">
              <Label htmlFor="grade">
                Sınıf Seviyesi <span className="text-red-500">*</span>
              </Label>
              <select
                id="grade"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                required
              >
                <option value="">Seçiniz</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}. Sınıf
                  </option>
                ))}
              </select>
            </div>

            {/* Şube */}
            <div className="space-y-2">
              <Label htmlFor="section">
                Şube <span className="text-red-500">*</span>
              </Label>
              <select
                id="section"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              >
                <option value="">Seçiniz</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s} Şubesi
                  </option>
                ))}
              </select>
            </div>

            {/* Rehberlik Uzmanı */}
            <div className="space-y-2">
              <Label htmlFor="counselor">Rehberlik Uzmanı (Opsiyonel)</Label>
              <select
                id="counselor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.counselorId}
                onChange={(e) => setFormData({ ...formData, counselorId: e.target.value })}
              >
                <option value="">Atanmadı</option>
                {counselors.map((counselor) => (
                  <option key={counselor.id} value={counselor.id}>
                    {counselor.firstName} {counselor.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Önizleme */}
            {formData.grade && formData.section && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Oluşturulacak Sınıf:</strong> {formData.grade}/{formData.section.toUpperCase()}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                İptal
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sınıf Oluştur
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

