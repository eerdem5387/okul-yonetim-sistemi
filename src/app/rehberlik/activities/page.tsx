"use client"

import { useState, useEffect } from "react"
import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import { IBFaaliyetDashboard } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus, Edit, Trash2 } from "lucide-react"

export default function RehberlikActivitiesPage() {
  const [showViewerModal, setShowViewerModal] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <IBFaaliyetDashboard
            faaliyetEkleHref="/faaliyet-ekle"
            faaliyetDuzenleHref={(activityId) => `/faaliyet-yonetimi/${activityId}`}
            studentDetailHref={(id) => `/activities/student/${id}`}
            showViewerButton={true}
            onViewerClick={() => setShowViewerModal(true)}
          />
          {showViewerModal && (
            <IBViewerManagementModal onClose={() => setShowViewerModal(false)} />
          )}
        </div>
      </main>
    </div>
  )
}

interface IBViewer {
  id: string
  username: string
  fullName: string
  email: string | null
  organization: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

function IBViewerManagementModal({ onClose }: { onClose: () => void }) {
  const [viewers, setViewers] = useState<IBViewer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingViewer, setEditingViewer] = useState<IBViewer | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    organization: "",
  })

  const fetchViewers = async () => {
    try {
      const res = await fetch("/api/ib-viewers")
      if (res.ok) setViewers(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchViewers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingViewer ? `/api/ib-viewers/${editingViewer.id}` : "/api/ib-viewers"
      const method = editingViewer ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        fetchViewers()
        setShowForm(false)
        setEditingViewer(null)
        setFormData({ username: "", password: "", fullName: "", email: "", organization: "" })
      } else {
        const err = await res.json()
        alert(err.error || "Kayıt başarısız")
      }
    } catch (err) {
      console.error(err)
      alert("Kayıt başarısız")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu IB Viewer hesabını silmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/ib-viewers/${id}`, { method: "DELETE" })
      if (res.ok) fetchViewers()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">IB Viewer Yönetimi</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => { setEditingViewer(null); setFormData({ username: "", password: "", fullName: "", email: "", organization: "" }); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni IB Viewer
            </Button>
          </div>
          {viewers.length > 0 ? (
            <div className="space-y-3">
              {viewers.map((v) => (
                <Card key={v.id} className="border border-gray-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{v.fullName}</p>
                      <p className="text-sm text-gray-500">@{v.username}</p>
                      {v.email && <p className="text-sm text-gray-500">{v.email}</p>}
                      <p className="text-xs mt-1">{v.isActive ? <span className="text-emerald-600">Aktif</span> : <span className="text-red-600">Pasif</span>}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingViewer(v); setFormData({ username: v.username, password: "", fullName: v.fullName, email: v.email ?? "", organization: v.organization ?? "" }); setShowForm(true) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">Henüz IB Viewer eklenmemiş</p>
          )}
          {showForm && (
            <Card className="mt-6 border border-gray-200">
              <CardHeader>
                <CardTitle>{editingViewer ? "IB Viewer Düzenle" : "Yeni IB Viewer"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Kullanıcı adı *</Label>
                      <Input value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} required disabled={!!editingViewer} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Şifre * {editingViewer && <span className="text-xs text-gray-500">(Değiştirmek için doldurun)</span>}</Label>
                      <Input type="password" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} required={!editingViewer} className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label>Ad soyad *</Label>
                    <Input value={formData.fullName} onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))} required className="mt-1.5" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Organizasyon</Label>
                      <Input value={formData.organization} onChange={(e) => setFormData((p) => ({ ...p, organization: e.target.value }))} className="mt-1.5" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit">{editingViewer ? "Güncelle" : "Oluştur"}</Button>
                    <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingViewer(null) }}>İptal</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
