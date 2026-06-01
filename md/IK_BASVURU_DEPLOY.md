# İK Başvuru Entegrasyonu — Deploy

## Ortam değişkenleri

### okul-yonetim-sistemi (Vercel)

```env
HR_WEBHOOK_SECRET=<ik projesi ile aynı gizli anahtar>
```

### ik-leventokullari (Vercel)

```env
YONETIM_WEBHOOK_URL=https://yonetim.leventokullari.com/api/webhook/ik-basvuru
HR_WEBHOOK_SECRET=<yukarıdaki ile aynı>
BLOB_READ_WRITE_TOKEN=<Vercel Blob token>
```

## Migration

```bash
npx prisma migrate deploy
```

Migration: `20260601120000_add_hr_job_applications`

## Panel

- URL: `/ik-basvurular`
- Yetki modülü: `hr_recruitment` (view, edit, delete, export)

## Webhook

- `POST /api/webhook/ik-basvuru`
- Header: `X-Webhook-Secret`, `X-Webhook-Source: ik-leventokullari`
