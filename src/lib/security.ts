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

const BLOCKED_HOSTNAMES = [
  '169.254.169.254',       // AWS/GCP metadata endpoint
  'metadata.google.internal',
  'localhost',
  '0.0.0.0',
  '::1',
];

const BLOCKED_TLDS = ['.local', '.internal', '.localhost'];

const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Check if an IPv4 address falls within a private/reserved CIDR range.
 * Covers: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
 */
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map(Number);
  if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return false;

  const [a, b] = octets;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12  (172.16.x.x – 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16  (link-local / cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

export function validateUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return { valid: false, reason: `Scheme not allowed: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block well-known internal hostnames
    for (const blocked of BLOCKED_HOSTNAMES) {
      if (hostname === blocked) {
        return { valid: false, reason: `Blocked internal host: ${hostname}` };
      }
    }

    // Block internal TLDs
    for (const tld of BLOCKED_TLDS) {
      if (hostname === tld.slice(1) || hostname.endsWith(tld)) {
        return { valid: false, reason: `Blocked internal TLD: ${hostname}` };
      }
    }

    // Check if the hostname is a raw IP in a private range
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: `Blocked private IP: ${hostname}` };
      }
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
