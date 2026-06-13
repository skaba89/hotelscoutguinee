// HotelScout Guinea — Formatting Utilities

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export function getScoreColor(score: number): string {
  if (score >= 60) return 'text-emerald-600'
  if (score >= 30) return 'text-amber-600'
  return 'text-red-600'
}

export function getScoreBg(score: number): string {
  if (score >= 60) return 'bg-emerald-500'
  if (score >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}
