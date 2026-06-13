import { describe, it, expect } from 'vitest'
import { formatNumber, formatDate, formatDateTime, getScoreColor, getScoreBg } from '@/lib/format'

describe('Format Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers in French locale', () => {
      const result = formatNumber(1000)
      // French locale uses space as thousands separator
      expect(result).toContain('1')
      expect(result).toContain('000')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('formatDate', () => {
    it('should return — for null', () => {
      expect(formatDate(null)).toBe('—')
    })

    it('should return — for undefined', () => {
      expect(formatDate(undefined)).toBe('—')
    })

    it('should format valid dates', () => {
      const result = formatDate('2024-01-15')
      expect(result).toBeTruthy()
      expect(result).not.toBe('—')
    })
  })

  describe('formatDateTime', () => {
    it('should return — for null', () => {
      expect(formatDateTime(null)).toBe('—')
    })

    it('should format dates with time', () => {
      const result = formatDateTime('2024-01-15T10:30:00Z')
      expect(result).toBeTruthy()
      expect(result).not.toBe('—')
    })
  })

  describe('getScoreColor', () => {
    it('should return emerald for scores >= 60', () => {
      expect(getScoreColor(60)).toBe('text-emerald-600')
      expect(getScoreColor(100)).toBe('text-emerald-600')
    })

    it('should return amber for scores 30-59', () => {
      expect(getScoreColor(30)).toBe('text-amber-600')
      expect(getScoreColor(59)).toBe('text-amber-600')
    })

    it('should return red for scores < 30', () => {
      expect(getScoreColor(0)).toBe('text-red-600')
      expect(getScoreColor(29)).toBe('text-red-600')
    })
  })

  describe('getScoreBg', () => {
    it('should return correct background colors', () => {
      expect(getScoreBg(60)).toBe('bg-emerald-500')
      expect(getScoreBg(30)).toBe('bg-amber-500')
      expect(getScoreBg(0)).toBe('bg-red-500')
    })
  })
})
