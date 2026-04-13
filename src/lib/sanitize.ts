/**
 * Input sanitization utilities for security
 * Prevents XSS, injection attacks
 */

/** Strip HTML tags from input */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/** Sanitize user input for chat messages */
export function sanitizeMessage(input: string): string {
  if (!input || typeof input !== 'string') return ''
  // Trim and limit length
  let sanitized = input.trim().slice(0, 10000)
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  return sanitized
}

/** Sanitize search query */
export function sanitizeSearchQuery(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input.trim().slice(0, 200).replace(/[<>"'`;]/g, '')
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email) && email.length <= 254
}

/** Validate password strength */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' }
  }
  if (password.length > 128) {
    return { valid: false, message: 'Mật khẩu quá dài' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ hoa' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ thường' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 số' }
  }
  return { valid: true, message: '' }
}

/** Sanitize a URL input */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  // Only allow http/https protocols
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return ''
  }
  try {
    new URL(trimmed)
    return trimmed
  } catch {
    return ''
  }
}

/** Encrypt/mask sensitive data for logs */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***'
  return key.slice(0, 4) + '...' + key.slice(-4)
}
