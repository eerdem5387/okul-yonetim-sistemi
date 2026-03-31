#!/usr/bin/env bash
# Migration geçmişi "uygulandı" görünüp veritabanı eksikse (ör. staff yok, baseline yanlış yapıldı):
# 1) Başarısız migration kaydını temizle
# 2) prisma db push — şemayı schema.prisma ile eşitler (eksik tabloları oluşturur)
# 3) Son migration'ı uygulanmış işaretle (SQL push'ta yapıldı; deploy tekrar CREATE etmesin)
#
# Kullanım: bash scripts/prisma-repair-drift.sh
# Önce .env içinde doğru DATABASE_URL olmalı (production Neon ile aynı olmalı).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LAST="20260330120000_add_activity_events_and_participants"

echo ">>> 1/4 migrate resolve --rolled-back (başarısız kayıt varsa temizler)..."
set +e
npx prisma migrate resolve --rolled-back "$LAST" 2>/dev/null
RB=$?
set -e
if [[ "$RB" -ne 0 ]]; then
  echo "    (atlandı — kayıt zaten başarısız değildi veya yoktu)"
fi

echo ">>> 2/4 prisma db push (eksik tablolar / şema farkı)..."
npx prisma db push

echo ">>> 3/4 migrate resolve --applied $LAST ..."
npx prisma migrate resolve --applied "$LAST"

echo ">>> 4/4 migrate deploy (doğrulama)..."
npx prisma migrate deploy

echo ">>> Bitti. migrate status:"
npx prisma migrate status
