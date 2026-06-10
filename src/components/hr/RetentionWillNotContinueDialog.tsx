"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RetentionWillNotContinueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffName?: string
  loading?: boolean
  onRemoveFromList: () => void
  onKeepOnly: () => void
}

export function RetentionWillNotContinueDialog({
  open,
  onOpenChange,
  staffName,
  loading = false,
  onRemoveFromList,
  onKeepOnly,
}: RetentionWillNotContinueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Devam Etmeyecek — Onay</DialogTitle>
          <DialogDescription className="sr-only">
            Devam etmeyecek olarak işaretlenen personelin listeden kaldırılıp kaldırılmayacağını
            onaylayın.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-gray-600">
          {staffName && (
            <p>
              <span className="font-medium text-gray-900">{staffName}</span> için görüşme sonucu
              kaydedilecek.
            </p>
          )}
          <p>
            Bu kişiyi &quot;Devam Etmeyecek&quot; olarak işaretlediniz. Kişi personel listesinden
            kalıcı olarak kaldırılsın mı?
          </p>
          <p>
            <span className="font-medium text-gray-800">Evet</span> butonuna tıklarsanız tamamen
            kaldırılır.
          </p>
          <p>
            <span className="font-medium text-gray-800">Hayır</span> butonuna tıklarsanız kişi
            sadece &quot;Devam Etmeyecek&quot; olarak kayıt edilir.
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onKeepOnly}>
            Hayır
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onRemoveFromList}
          >
            {loading ? "İşleniyor..." : "Evet, listeden kaldır"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
