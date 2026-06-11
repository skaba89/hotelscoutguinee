// HotelScout Guinea — Security Utilities
// SSRF protection, API key encryption, input validation

import * as crypto from 'crypto';

// ─── API Key Encryption (AES-256-GCM) ──────────────────────────────

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'hotelscout-guinea-default-key-32b!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encrypted: string): string {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      // Legacy unencrypted key — return as-is for backward compatibility
      return encrypted;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Legacy unencrypted key — return as-is for backward compatibility
    return encrypted;
  }
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p));
}

// ─── SSRF Protection ───────────────────────────────────────────────

const BLOCKED_HOSTS = [
  '169.254.169.254',  // AWS/GCP metadata
  'metadata.google.internal',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '10.0.0.0',
  '172.16.0.0',
  '192.168.0.0',
];

const ALLOWED_SCHEMES = ['http:', 'https:'];

export function validateUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return { valid: false, reason: `Scheme not allowed: ${parsed.protocol}` };
    }

    // Block internal IPs
    const hostname = parsed.hostname.toLowerCase();
    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.startsWith(blocked)) {
        return { valid: false, reason: `Blocked internal host: ${hostname}` };
      }
    }

    // Block .local, .internal, .localhost TLDs
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return { valid: false, reason: `Blocked internal TLD: ${hostname}` };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

// ─── Input Sanitization ────────────────────────────────────────────

export function safeParseInt(value: string | null, defaultValue: number, min = 0, max = Infinity): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

export function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength).trim();
}
