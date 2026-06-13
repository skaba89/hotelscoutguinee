import { describe, it, expect } from 'vitest'
import { PAGE_LABELS, PAGE_ICONS, STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS, DIGITAL_STATUS_COLORS, DIGITAL_STATUS_LABELS, ROOM_TYPE_LABELS, RESERVATION_STATUS_COLORS, RESERVATION_STATUS_LABELS } from '@/lib/constants'
import type { PageType } from '@/lib/types'

describe('Constants', () => {
  describe('PAGE_LABELS', () => {
    it('should have labels for all page types', () => {
      const pages: PageType[] = ['menu', 'dashboard', 'hotels', 'collecte', 'prospects', 'pipeline', 'ia', 'settings']
      pages.forEach(page => {
        expect(PAGE_LABELS[page]).toBeTruthy()
        expect(typeof PAGE_LABELS[page]).toBe('string')
      })
    })
  })

  describe('PAGE_ICONS', () => {
    it('should have icon components for all page types', () => {
      const pages: PageType[] = ['menu', 'dashboard', 'hotels', 'collecte', 'prospects', 'pipeline', 'ia', 'settings']
      pages.forEach(page => {
        expect(PAGE_ICONS[page]).toBeTruthy()
      })
    })
  })

  describe('Pipeline stage labels', () => {
    it('should have all 5 pipeline stages', () => {
      expect(Object.keys(STAGE_LABELS)).toHaveLength(5)
      expect(STAGE_LABELS.nouveau).toBe('Nouveau')
      expect(STAGE_LABELS.client).toBe('Client')
    })

    it('should have matching colors for all stages', () => {
      Object.keys(STAGE_LABELS).forEach(stage => {
        expect(STAGE_COLORS[stage]).toBeTruthy()
      })
    })
  })

  describe('Priority colors', () => {
    it('should have colors for all 3 priority levels', () => {
      expect(PRIORITY_COLORS.hot).toBeTruthy()
      expect(PRIORITY_COLORS.warm).toBeTruthy()
      expect(PRIORITY_COLORS.cold).toBeTruthy()
    })
  })

  describe('Digital status', () => {
    it('should have labels and colors for all statuses', () => {
      const statuses = ['ok', 'partial', 'none']
      statuses.forEach(status => {
        expect(DIGITAL_STATUS_COLORS[status]).toBeTruthy()
        expect(DIGITAL_STATUS_LABELS[status]).toBeTruthy()
      })
    })
  })

  describe('Room types', () => {
    it('should have labels for all room types', () => {
      expect(Object.keys(ROOM_TYPE_LABELS)).toHaveLength(4)
      expect(ROOM_TYPE_LABELS.standard).toBe('Standard')
      expect(ROOM_TYPE_LABELS.suite).toBe('Suite')
    })
  })

  describe('Reservation statuses', () => {
    it('should have labels and colors for all statuses', () => {
      const statuses = ['pending', 'confirmed', 'cancelled', 'completed']
      statuses.forEach(status => {
        expect(RESERVATION_STATUS_COLORS[status]).toBeTruthy()
        expect(RESERVATION_STATUS_LABELS[status]).toBeTruthy()
      })
    })
  })
})
