/**
 * @summary Shared client-side validators.
 *
 * @description Conservative regex — RFC 5322 in full is overkill for a signup form.
 *   This rejects obvious junk (no @, no domain, no TLD, trailing dot, double dots,
 *   whitespace) while accepting the long tail of legitimate addresses including
 *   plus-addressing and subdomains.
 */

// Local-part: letters/digits/dot/underscore/percent/plus/hyphen, one or more chars
// Domain: at least one label + dot + 2+ char TLD
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function isValidEmail(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  if (trimmed.includes('..')) return false;
  return EMAIL_RE.test(trimmed);
}
