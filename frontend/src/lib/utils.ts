import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number | string, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency,
    minimumFractionDigits: 0,
  }).format(Number(amount))
}

/** Validates a URL is http/https only — prevents javascript:/data: injection in href/src.
 *  Returns the browser-normalized href (not raw input) so tainted data never reaches the sink. */
export function safeUrl(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return ''
    return parsed.href   // return normalized URL, not raw tainted input
  } catch {
    const trimmed = url.trim()
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
    return ''
  }
}

// Trusted CDN domains — media uploaded through the admin portal
const TRUSTED_CDN_HOSTS    = ['media.vitelectronics.com', 'localhost']
const TRUSTED_CDN_SUFFIXES = ['.cloudfront.net', '.amazonaws.com']

/** Like safeUrl() but also enforces the URL belongs to a trusted CDN domain.
 *  Use this for media src/href attributes that should only ever point to our own storage. */
export function safeCdnUrl(url: string | null | undefined): string {
  const safe = safeUrl(url)
  if (!safe) return ''
  try {
    const { hostname } = new URL(safe)
    if (
      TRUSTED_CDN_HOSTS.includes(hostname) ||
      TRUSTED_CDN_SUFFIXES.some(s => hostname.endsWith(s))
    ) return safe
    return ''
  } catch {
    return ''
  }
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(date)
}