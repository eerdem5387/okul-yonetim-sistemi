#!/usr/bin/env bash
# P3005: "database schema is not empty" — tablolar var, _prisma_migrations boş/eksik.
# Bu script, klasör adına göre sıralı tüm migration'ları (aşağıdaki SKIP hariç)
# `migrate resolve --applied` ile işaretler, ardından `migrate deploy` çalıştırır.
#
# ÖNEMLİ: Bu yalnızca migration SQL'leri GERÇEKTEN bir zamanlar çalışmış DB içindir.
# Tablolar yok / eksikse (ör. "relation staff does not exist") baseline YANLIŞTIR.
# O durumda: bash scripts/prisma-repair-drift.sh kullanın (db push + resolve).
#
# Önkoşul: DB şeması işaretlediğin migration'larla uyumlu olmalı.
# SKIP: Gerçekten SQL ile uygulanması gereken son migration (faaliyet tabloları).
#
# Kullanım: bash scripts/prisma-baseline-then-deploy.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_APPLY="20260330120000_add_activity_events_and_participants"

for dir in $(ls -d prisma/migrations/*/ 2>/dev/null | LC_ALL=C sort); do
  name=$(basename "$dir")
  if [[ "$name" == "$SKIP_APPLY" ]]; then
    echo "Atlanıyor (deploy uygulayacak): $name"
    continue
  fi
  echo "Baseline: $name"
  npx prisma migrate resolve --applied "$name"
done

echo "Deploy (kalan migration)..."
npx prisma migrate deploy
