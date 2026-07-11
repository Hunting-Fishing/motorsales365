
import { safeDOMOperation, safeQuerySelector } from './domSafetyUtils';

/**
 * Advanced DOM protection utilities with mutation observer capabilities
 */

let mutationObserver: MutationObserver | null = null;
const protectedElements = new WeakSet<Element>();

/**
 * Initialize DOM protection with mutation observer
 */
export const initializeDOMProtection = (): void => {
  if (typeof window === 'undefined' || mutationObserver) return;

  try {
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Log suspicious mutations that might be from extensions
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check for extension-injected elements with proper DOM API usage
              const hasExtensionId = element.id?.includes('extension');
              const hasExtensionClass = element.classList?.contains('extension') || 
                                      Array.from(element.classList || []).some(cls => cls.includes('extension'));
              const hasExtensionTag = element.tagName?.toLowerCase().includes('chrome');
              
              if (hasExtensionId || hasExtensionClass || hasExtensionTag) {
                console.warn('🔌 Extension-injected element detected:', element);
              }
            }
          });
        }
        
        if (mutation.type === 'attributes') {
          console.debug('🔍 DOM attribute mutation:', {
            target: mutation.target,
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue
          });
        }
      });
    });

    // Observe the entire document for changes
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });

    console.log('🛡️ DOM protection initialized');
  } catch (error) {
    console.warn('Failed to initialize DOM protection:', error);
  }
};

/**
 * Cleanup DOM protection
 */
export const cleanupDOMProtection = (): void => {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
    console.log('🛡️ DOM protection cleaned up');
  }
};

/**
 * Protect an element from extension interference
 */
export const protectElement = (element: Element): void => {
  if (!element) return;
  
  protectedElements.add(element);
  
  // Add data attribute to mark as protected
  safeDOMOperation(() => {
    element.setAttribute('data-protected', 'true');
  }, undefined, 'protectElement');
};

/**
 * Check if an element is protected
 */
export const isElementProtected = (element: Element): boolean => {
  return protectedElements.has(element) || element.hasAttribute('data-protected');
};

/**
 * Safe element creation with protection
 */
export const createProtectedElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    className?: string;
    id?: string;
    attributes?: Record<string, string>;
  }
): HTMLElementTagNameMap[K] | null => {
  return safeDOMOperation(() => {
    const element = document.createElement(tagName);
    
    if (options?.className) {
      element.className = options.className;
    }
    
    if (options?.id) {
      element.id = options.id;
    }
    
    if (options?.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    protectElement(element);
    return element;
  }, null, 'createProtectedElement');
};

/**
 * Validate CSS selector before use
 */
export const validateCSSSelector = (selector: string): boolean => {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
};

/**
 * Safe element query with validation and fallback
 */
export const safeProtectedQuery = (
  selector: string,
  container: Document | Element = document
): Element | null => {
  // First validate the selector
  if (!validateCSSSelector(selector)) {
    console.warn('Invalid CSS selector:', selector);
    return null;
  }
  
  return safeQuerySelector(selector, container);
};

/**
 * Check if current environment has extension conflicts
 */
export const detectExtensionConflicts = (): boolean => {
  const indicators = [
    // Check for common extension-injected elements
    () => document.querySelector('[id*="extension"]') !== null,
    () => document.querySelector('[class*="extension"]') !== null,
    () => document.querySelector('script[src*="chrome-extension"]') !== null,
    () => document.querySelector('script[src*="moz-extension"]') !== null,
    
    // Check for modified global objects
    () => window.hasOwnProperty('chrome') && (window as any).chrome?.runtime,
    () => (window as any).browser?.runtime,
    
    // Check for extension-modified prototypes
    () => {
      const originalQuery = Document.prototype.querySelector;
      return Document.prototype.querySelector !== originalQuery;
    }
  ];
  
  return indicators.some(check => {
    try {
      return check();
    } catch {
      return false;
    }
  });
};

/**
 * Create an isolated rendering context
 */
export const createIsolatedContext = (
  container: HTMLElement,
  options?: {
    shadowDOM?: boolean;
    cssIsolation?: boolean;
  }
): HTMLElement => {
  if (options?.shadowDOM && container.attachShadow) {
    try {
      const shadowRoot = container.attachShadow({ mode: 'closed' });
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-isolated', 'true');
      shadowRoot.appendChild(wrapper);
      return wrapper;
    } catch (error) {
      console.warn('Shadow DOM not supported, falling back to regular isolation');
    }
  }
  
  // Fallback to CSS isolation
  const wrapper = createProtectedElement('div', {
    attributes: {
      'data-isolated': 'true',
      'style': options?.cssIsolation ? 'isolation: isolate; contain: layout style;' : undefined
    }
  });
  
  if (wrapper) {
    container.appendChild(wrapper);
    return wrapper;
  }
  
  return container;
};
