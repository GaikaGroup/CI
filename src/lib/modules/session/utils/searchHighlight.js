/**
 * Search highlighting utilities
 * Provides functions to highlight search terms in text
 */

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight search terms in text
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Search term to highlight
 * @param {string} className - CSS class name for highlighting (default: 'highlight')
 * @returns {string} HTML string with highlighted terms
 */
export function highlightText(text, searchTerm, className = 'highlight') {
  if (!text || !searchTerm) {
    return text || '';
  }

  const escapedTerm = escapeRegex(searchTerm.trim());
  const regex = new RegExp(`(${escapedTerm})`, 'gi');

  return text.replace(regex, `<mark class="${className}">$1</mark>`);
}

/**
 * Get text excerpt around search term
 * @param {string} text - Full text
 * @param {string} searchTerm - Search term
 * @param {number} contextLength - Number of characters to show before and after match
 * @returns {string} Text excerpt with ellipsis
 */
export function getSearchExcerpt(text, searchTerm, contextLength = 50) {
  if (!text || !searchTerm) {
    return text || '';
  }

  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase().trim();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) {
    // No match found, return beginning of text
    return text.length > contextLength * 2 ? text.substring(0, contextLength * 2) + '...' : text;
  }

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + lowerTerm.length + contextLength);

  let excerpt = text.substring(start, end);

  if (start > 0) {
    excerpt = '...' + excerpt;
  }
  if (end < text.length) {
    excerpt = excerpt + '...';
  }

  return excerpt;
}

/**
 * Check if text contains search term (case-insensitive)
 * @param {string} text - Text to search in
 * @param {string} searchTerm - Search term
 * @returns {boolean} True if text contains search term
 */
export function containsSearchTerm(text, searchTerm) {
  if (!text || !searchTerm) {
    return false;
  }

  return text.toLowerCase().includes(searchTerm.toLowerCase().trim());
}

/**
 * Get all match positions in text
 * @param {string} text - Text to search in
 * @param {string} searchTerm - Search term
 * @returns {Array<{start: number, end: number}>} Array of match positions
 */
export function getMatchPositions(text, searchTerm) {
  if (!text || !searchTerm) {
    return [];
  }

  const positions = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase().trim();
  let index = 0;

  while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
    positions.push({
      start: index,
      end: index + lowerTerm.length
    });
    index += lowerTerm.length;
  }

  return positions;
}

export default {
  highlightText,
  getSearchExcerpt,
  containsSearchTerm,
  getMatchPositions
};
