import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS attacks
 */
export class InputSanitizer {
  /**
   * Sanitizes HTML content for safe rendering
   */
  static sanitizeHtml(dirty: string, options?: any): string {
    const clean = DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'div'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      ...options
    });
    return clean as unknown as string;
  }

  /**
   * Sanitizes text input by removing HTML and special characters
   */
  static sanitizeText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .trim();
  }

  /**
   * Validates and sanitizes email addresses
   */
  static sanitizeEmail(email: string): string {
    const cleaned = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : '';
  }

  /**
   * Sanitizes URL input
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return parsed.toString();
      }
    } catch {
      // Invalid URL
    }
    return '';
  }

  /**
   * Sanitizes phone numbers
   */
  static sanitizePhone(phone: string): string {
    return phone.replace(/[^\d+\-\s()]/g, '').trim();
  }
}