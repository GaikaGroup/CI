/**
 * Accessibility utilities for subject management
 */

/**
 * Announce text to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level (polite, assertive)
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Manage focus for modal dialogs
 */
export class FocusManager {
  constructor(element) {
    this.element = element;
    this.focusableElements = [];
    this.firstFocusable = null;
    this.lastFocusable = null;
    this.previouslyFocused = null;
  }

  init() {
    this.previouslyFocused = document.activeElement;
    this.updateFocusableElements();
    this.trapFocus();

    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }
  }

  updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(this.element.querySelectorAll(focusableSelectors)).filter(
      (el) => {
        return el.offsetWidth > 0 && el.offsetHeight > 0;
      }
    );

    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
  }

  trapFocus() {
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(event) {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === this.firstFocusable) {
          event.preventDefault();
          this.lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === this.lastFocusable) {
          event.preventDefault();
          this.firstFocusable?.focus();
        }
      }
    } else if (event.key === 'Escape') {
      this.destroy();
    }
  }

  destroy() {
    this.element.removeEventListener('keydown', this.handleKeyDown);

    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
    }
  }
}

/**
 * Generate unique IDs for form elements
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'element') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add skip links for keyboard navigation
 * @param {Array<Object>} links - Array of {href, text} objects
 */
export function addSkipLinks(links) {
  const skipNav = document.createElement('nav');
  skipNav.className = 'skip-links';
  skipNav.setAttribute('aria-label', 'Skip navigation');

  const list = document.createElement('ul');

  links.forEach((link) => {
    const listItem = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.text;
    anchor.className = 'skip-link';

    listItem.appendChild(anchor);
    list.appendChild(listItem);
  });

  skipNav.appendChild(list);
  document.body.insertBefore(skipNav, document.body.firstChild);
}

/**
 * Validate form accessibility
 * @param {HTMLFormElement} form - Form element to validate
 * @returns {Array<string>} Array of accessibility issues
 */
export function validateFormAccessibility(form) {
  const issues = [];

  // Check for labels
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.id;
    const label = form.querySelector(`label[for="${id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');

    if (!label && !ariaLabel && !ariaLabelledBy) {
      issues.push(`Input element missing label: ${input.name || input.type}`);
    }
  });

  // Check for fieldsets in radio/checkbox groups
  const radioGroups = {};
  const checkboxGroups = {};

  form.querySelectorAll('input[type="radio"]').forEach((radio) => {
    const name = radio.name;
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  });

  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    const name = checkbox.name;
    if (name && name.includes('[]')) {
      if (!checkboxGroups[name]) checkboxGroups[name] = [];
      checkboxGroups[name].push(checkbox);
    }
  });

  Object.keys(radioGroups).forEach((name) => {
    if (radioGroups[name].length > 1) {
      const fieldset = radioGroups[name][0].closest('fieldset');
      if (!fieldset) {
        issues.push(`Radio group "${name}" should be wrapped in a fieldset`);
      }
    }
  });

  // Check for required field indicators
  const requiredInputs = form.querySelectorAll('[required]');
  requiredInputs.forEach((input) => {
    const ariaRequired = input.getAttribute('aria-required');
    if (ariaRequired !== 'true') {
      issues.push(`Required input should have aria-required="true": ${input.name || input.type}`);
    }
  });

  return issues;
}

/**
 * Add keyboard navigation to custom components
 * @param {HTMLElement} element - Element to add keyboard navigation to
 * @param {Object} options - Navigation options
 */
export function addKeyboardNavigation(element, options = {}) {
  const { role = 'menu', orientation = 'vertical', wrap = true, activateOnFocus = false } = options;

  element.setAttribute('role', role);
  element.setAttribute('aria-orientation', orientation);

  const items = Array.from(
    element.querySelectorAll('[role="menuitem"], [role="option"], button, a')
  );
  let currentIndex = 0;

  items.forEach((item, index) => {
    item.setAttribute('tabindex', index === 0 ? '0' : '-1');

    item.addEventListener('keydown', (event) => {
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          newIndex =
            orientation === 'vertical'
              ? (currentIndex + 1) % items.length
              : Math.min(currentIndex + 1, items.length - 1);
          if (!wrap && newIndex === 0 && currentIndex === items.length - 1) {
            newIndex = currentIndex;
          }
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          newIndex =
            orientation === 'vertical'
              ? (currentIndex - 1 + items.length) % items.length
              : Math.max(currentIndex - 1, 0);
          if (!wrap && newIndex === items.length - 1 && currentIndex === 0) {
            newIndex = currentIndex;
          }
          break;

        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;

        case 'End':
          event.preventDefault();
          newIndex = items.length - 1;
          break;

        case 'Enter':
        case ' ':
          if (activateOnFocus) {
            event.preventDefault();
            item.click();
          }
          break;
      }

      if (newIndex !== currentIndex) {
        items[currentIndex].setAttribute('tabindex', '-1');
        items[newIndex].setAttribute('tabindex', '0');
        items[newIndex].focus();
        currentIndex = newIndex;
      }
    });

    item.addEventListener('focus', () => {
      currentIndex = index;
    });
  });
}

/**
 * Check color contrast ratio
 * @param {string} foreground - Foreground color (hex, rgb, etc.)
 * @param {string} background - Background color (hex, rgb, etc.)
 * @returns {number} Contrast ratio
 */
export function getContrastRatio(foreground, background) {
  const getLuminance = (color) => {
    const rgb = color.match(/\d+/g).map(Number);
    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Add ARIA live region for dynamic content updates
 * @param {string} id - ID for the live region
 * @param {string} politeness - Politeness level (polite, assertive)
 * @returns {HTMLElement} Live region element
 */
export function createLiveRegion(id, politeness = 'polite') {
  let liveRegion = document.getElementById(id);

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = id;
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }

  return liveRegion;
}

/**
 * Update live region with new content
 * @param {string} id - Live region ID
 * @param {string} message - Message to announce
 */
export function updateLiveRegion(id, message) {
  const liveRegion = document.getElementById(id);
  if (liveRegion) {
    liveRegion.textContent = message;
  }
}
