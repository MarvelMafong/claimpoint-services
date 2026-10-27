// Shared, dependency-free auth helpers (safe in Node and Edge runtimes).

export const SESSION_ONLY_COOKIE = 'cp_session_only';

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function cleanPassword(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Only same-origin absolute paths ("/dashboard", "/claims?x=1"). Rejects
// "//evil.com", "/\evil.com", and full URLs.
export function safeNextPath(value) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (/[\r\n]/.test(value)) return null;
  return value;
}

// When the user did not tick "Stay logged in", every auth cookie written
// (login, token refresh) must be a session cookie. Removal cookies
// (maxAge 0) are left untouched.
export function applySessionOnly(options, sessionOnly) {
  if (!sessionOnly || !options) return options;
  if (options.maxAge === 0) return options;
  const { maxAge, expires, ...rest } = options;
  return rest;
}
