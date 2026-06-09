// js/fingerprint.js
// Device fingerprinting using Web Crypto API (no external library)

/**
 * Generate a consistent SHA-256 hash from browser/device signals.
 * @returns {Promise<string>} hex string fingerprint
 */
async function getDeviceHash() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
    navigator.vendor || '',
    new Date().getTimezoneOffset(),
  ].join('|');

  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(components)
  );

  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check device status against the devices table.
 * @param {string} hash - device hash
 * @param {string} sap  - employee SAP
 * @returns {{ allowed: boolean, reason: string|null }}
 */
async function checkDevice(hash, sap) {
  const { data: device, error } = await db
    .from('devices')
    .select('sap, blocked')
    .eq('device_hash', hash)
    .maybeSingle();

  if (error) return { allowed: false, reason: 'خطأ في التحقق من الجهاز' };

  if (!device) {
    // New device — will be registered on submission
    return { allowed: true, reason: null };
  }

  if (device.blocked) {
    return { allowed: false, reason: 'هذا الجهاز محظور. يرجى التواصل مع المهندس المسؤول.' };
  }

  if (device.sap !== sap) {
    return { allowed: false, reason: 'هذا الجهاز مرتبط بحساب آخر. يرجى التواصل مع المهندس المسؤول.' };
  }

  return { allowed: true, reason: null };
}
