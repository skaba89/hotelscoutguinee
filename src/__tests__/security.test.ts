import { describe, it, expect } from 'vitest'
import { encryptApiKey, decryptApiKey, isEncrypted, isPrivateIP, validateUrl, safeParseInt, sanitizeString } from '@/lib/security'

describe('Security Utilities', () => {
  describe('API Key Encryption', () => {
    it('should encrypt and decrypt a key correctly', () => {
      const original = 'sk-test-api-key-12345'
      const encrypted = encryptApiKey(original)
      expect(encrypted).not.toBe(original)
      expect(decryptApiKey(encrypted)).toBe(original)
    })

    it('should produce encrypted format with 3 colon-separated parts', () => {
      const encrypted = encryptApiKey('test-key')
      const parts = encrypted.split(':')
      expect(parts.length).toBe(3)
    })

    it('should detect encrypted values correctly', () => {
      const encrypted = encryptApiKey('test-key')
      expect(isEncrypted(encrypted)).toBe(true)
      expect(isEncrypted('plain-text')).toBe(false)
      expect(isEncrypted('abc:def:123')).toBe(true) // looks like encrypted
    })

    it('should handle legacy unencrypted keys in decryptApiKey', () => {
      expect(decryptApiKey('plain-text-key')).toBe('plain-text-key')
    })

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const encrypted1 = encryptApiKey('same-key')
      const encrypted2 = encryptApiKey('same-key')
      expect(encrypted1).not.toBe(encrypted2) // Different IVs
      expect(decryptApiKey(encrypted1)).toBe('same-key')
      expect(decryptApiKey(encrypted2)).toBe('same-key')
    })
  })

  describe('SSRF Protection', () => {
    it('should detect private IPs', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true)
      expect(isPrivateIP('172.16.0.1')).toBe(true)
      expect(isPrivateIP('172.31.255.255')).toBe(true)
      expect(isPrivateIP('192.168.1.1')).toBe(true)
      expect(isPrivateIP('127.0.0.1')).toBe(true)
      expect(isPrivateIP('169.254.169.254')).toBe(true)
      expect(isPrivateIP('0.0.0.0')).toBe(true)
    })

    it('should allow public IPs', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false)
      expect(isPrivateIP('1.1.1.1')).toBe(false)
      expect(isPrivateIP('203.0.113.1')).toBe(false)
    })

    it('should reject invalid IPs', () => {
      expect(isPrivateIP('not-an-ip')).toBe(false)
      expect(isPrivateIP('256.256.256.256')).toBe(false)
    })

    it('should validate safe URLs', () => {
      expect(validateUrl('https://example.com').valid).toBe(true)
      expect(validateUrl('http://hotel-guinea.com').valid).toBe(true)
    })

    it('should block internal URLs', () => {
      expect(validateUrl('http://localhost:3000').valid).toBe(false)
      expect(validateUrl('http://169.254.169.254/latest').valid).toBe(false)
      expect(validateUrl('http://metadata.google.internal').valid).toBe(false)
      expect(validateUrl('http://test.local').valid).toBe(false)
      expect(validateUrl('http://app.internal/secret').valid).toBe(false)
    })

    it('should block non-HTTP schemes', () => {
      expect(validateUrl('ftp://example.com').valid).toBe(false)
      expect(validateUrl('file:///etc/passwd').valid).toBe(false)
      expect(validateUrl('javascript:alert(1)').valid).toBe(false)
    })

    it('should block private IP URLs', () => {
      expect(validateUrl('http://192.168.1.1/admin').valid).toBe(false)
      expect(validateUrl('http://10.0.0.1/internal').valid).toBe(false)
    })
  })

  describe('Input Sanitization', () => {
    it('should parse integers safely', () => {
      expect(safeParseInt('42', 0)).toBe(42)
      expect(safeParseInt('abc', 10)).toBe(10) // fallback
      expect(safeParseInt(null, 5)).toBe(5)    // null → default
      expect(safeParseInt('', 5)).toBe(5)      // empty → default
      expect(safeParseInt('150', 0, 1, 100)).toBe(100) // clamped
      expect(safeParseInt('-5', 0, 0)).toBe(0)         // min clamp
    })

    it('should sanitize strings', () => {
      expect(sanitizeString('hello')).toBe('hello')
      expect(sanitizeString('  hello  ')).toBe('hello')
      expect(sanitizeString(123 as unknown as string)).toBe('')
      expect(sanitizeString(null as unknown as string)).toBe('')
      expect(sanitizeString('a'.repeat(2000), 1000).length).toBe(1000)
    })
  })
})
