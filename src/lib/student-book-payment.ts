/** Kitap almadı: açıkça false veya henüz Aldı işaretlenmemiş (null). */
export function studentBookNotReceivedWhere() {
  return {
    OR: [{ bookPaymentPaid: false }, { bookPaymentPaid: null }],
  }
}

export function studentBookReceivedWhere() {
  return { bookPaymentPaid: true }
}

export function isStudentBookReceived(bookPaymentPaid: boolean | null | undefined): boolean {
  return bookPaymentPaid === true
}
