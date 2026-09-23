/** Öğrenci başına kota sayılan (muaf olmayan) kulüp seçim üst sınırı */
export const MAX_CLUB_SELECTIONS = 3

export type ClubQuotaFields = {
  id: string
  exemptFromSelectionLimit?: boolean | null
}

/** Seçim kotasına dahil olan kulüp sayısı (muaf olanlar hariç). */
export function countQuotaSelections(
  selectedClubIds: string[],
  clubs: ClubQuotaFields[]
): number {
  const byId = new Map(clubs.map((c) => [c.id, c]))
  let n = 0
  for (const id of selectedClubIds) {
    const club = byId.get(id)
    if (!club) {
      // Bilinmeyen kulüp güvenli tarafta kota sayılır
      n++
      continue
    }
    if (!club.exemptFromSelectionLimit) n++
  }
  return n
}

export function isOverClubSelectionQuota(
  selectedClubIds: string[],
  clubs: ClubQuotaFields[]
): boolean {
  return countQuotaSelections(selectedClubIds, clubs) > MAX_CLUB_SELECTIONS
}
