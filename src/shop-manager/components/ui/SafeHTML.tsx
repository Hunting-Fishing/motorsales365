import DOMPurify from 'dompurify';
import { HTMLAttributes } from 'react';

interface SafeHTMLProps extends HTMLAttributes<HTMLDivElement> {
  html: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

/**
 * SafeHTML component that sanitizes HTML content before rendering
 * to prevent XSS attacks and other security vulnerabilities
 */
export const SafeHTML = ({ 
  html, 
  allowedTags, 
  allowedAttributes,
  className,
  ...props 
}: SafeHTMLProps) => {
  const sanitizedHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'div'
    ],
    ALLOWED_ATTR: allowedAttributes || [
      'href', 'src', 'alt', 'title', 'class'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      {...props}
    />
  );
};