import { Linking, Platform } from 'react-native';

// Open a Google Maps search URL for an arbitrary address / place name.
// Works on web (opens in a new tab) and native (hands off to the maps app
// via the system URL handler).
export function openInMaps(query: string): void {
  const q = query.trim();
  if (!q) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => {
    /* no-op */
  });
}

// Open a phone number — uses tel: protocol.
export function dialNumber(phone: string): void {
  const n = phone.replace(/[^\d+]/g, '');
  if (!n) return;
  const url = `tel:${n}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = url;
    return;
  }
  Linking.openURL(url).catch(() => {});
}

// Pull phone numbers out of a free-text string. Matches:
//   +6620263218, +91 98765 43210, 02 1234 5678, (080) 1234-5678, etc.
// Requires at least 8 digits (excluding + and separators) to avoid false
// positives like dates and postal codes.
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/g;

export function extractPhones(text: string): string[] {
  if (!text) return [];
  const matches = text.match(PHONE_RE) ?? [];
  return matches
    .map((m) => m.trim())
    .filter((m) => {
      const digits = m.replace(/[^\d]/g, '');
      return digits.length >= 8 && digits.length <= 15;
    });
}

// Strip phone numbers from a string so we can show "clean address" + separate phones.
export function stripPhones(text: string): string {
  if (!text) return '';
  return text
    .replace(PHONE_RE, '')
    .replace(/\s*(?:,\s*)?(?:Property phone|Phone|Tel)[:\s]*(?=$|,)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,|,\s*$/g, '')
    .trim();
}
