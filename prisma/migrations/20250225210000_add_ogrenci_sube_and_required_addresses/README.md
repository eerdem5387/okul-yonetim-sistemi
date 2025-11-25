# Migration: add_ogrenci_sube_and_required_addresses

This migration mirrors the changes coming from the başvuru sistemi:

- Adds the `ogrenciSube` column to the `basvurular` table with a default value.
- Ensures `babaIsAdresi` and `anneIsAdresi` are required (NOT NULL) with an empty
  string default, after backfilling existing records.

