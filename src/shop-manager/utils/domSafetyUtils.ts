
/**
 * Utility functions to safely interact with the DOM when browser extensions might interfere
 */

/**
 * Safely execute a DOM operation with error handling
 */
export const safeDOMOperation = <T>(
  operation: () => T,
  fallback?: T,
  errorContext?: string
): T | undefined => {
  try {
    return operation();
  } catch (error) {
    console.warn(`DOM operation failed${errorContext ? ` in ${errorContext}` : ''}:`, error);
    return fallback;
  }
};

/**
 * Safely query for DOM elements with validation
 */
export const safeQuerySelector = (
  selector: string,
  container: Document | Element = document
): Element | null => {
  try {
    // Validate selector before using it
    if (!selector || typeof selector !== 'string') {
      console.warn('Invalid selector provided:', selector);
      return null;
    }
    
    // Test if selector is valid by trying to parse it
    container.querySelector(selector);
    return container.querySelector(selector);
  } catch (error) {
    console.warn('Invalid CSS selector or query failed:', selector, error);
    return null;
  }
};

/**
 * Safely query for multiple DOM elements
 */
export const safeQuerySelectorAll = (
  selector: string,
  container: Document | Element = document
): NodeListOf<Element> | null => {
  try {
    if (!selector || typeof selector !== 'string') {
      console.warn('Invalid selector provided:', selector);
      return null;
    }
    
    return container.querySelectorAll(selector);
  } catch (error) {
    console.warn('Invalid CSS selector or query failed:', selector, error);
    return null;
  }
};

/**
 * Safely add event listeners with cleanup tracking
 */
export const safeAddEventListener = (
  element: Element | Window | Document,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): (() => void) | null => {
  try {
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        console.warn('Failed to remove event listener:', error);
      }
    };
  } catch (error) {
    console.warn('Failed to add event listener:', error);
    return null;
  }
};

/**
 * Check if an element is still in the DOM
 */
export const isElementInDOM = (element: Element): boolean => {
  try {
    return document.contains(element);
  } catch (error) {
    return false;
  }
};

/**
 * Safely manipulate element classes
 */
export const safeClassListOperation = (
  element: Element,
  operation: 'add' | 'remove' | 'toggle',
  className: string
): boolean => {
  try {
    if (!element || !element.classList || !className) {
      return false;
    }
    
    switch (operation) {
      case 'add':
        element.classList.add(className);
        break;
      case 'remove':
        element.classList.remove(className);
        break;
      case 'toggle':
        element.classList.toggle(className);
        break;
    }
    
    return true;
  } catch (error) {
    console.warn(`Failed to ${operation} class "${className}":`, error);
    return false;
  }
};
