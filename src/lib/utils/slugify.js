/**
 * Generate URL-friendly slug from text
 * Supports multiple languages including Cyrillic
 */

const cyrillicMap = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya'
};

/**
 * Transliterate Cyrillic characters to Latin
 */
function transliterate(text) {
  return text
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      if (cyrillicMap[lower]) {
        return char === lower ? cyrillicMap[lower] : cyrillicMap[lower].toUpperCase();
      }
      return char;
    })
    .join('');
}

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @param {number} maxLength - Maximum length of slug (default: 50)
 * @returns {string} URL-friendly slug
 */
export function slugify(text, maxLength = 50) {
  if (!text) return '';

  // Transliterate Cyrillic to Latin
  let slug = transliterate(text);

  // Convert to lowercase and replace spaces/special chars with hyphens
  slug = slug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Truncate to max length at word boundary
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    const lastHyphen = slug.lastIndexOf('-');
    if (lastHyphen > maxLength * 0.7) {
      slug = slug.substring(0, lastHyphen);
    }
  }

  return slug;
}

/**
 * Generate unique slug by appending short ID
 * @param {string} text - Text to slugify
 * @param {string} id - Unique ID to append
 * @returns {string} Unique slug with ID suffix
 */
export function generateUniqueSlug(text, id) {
  const baseSlug = slugify(text, 40);
  const shortId = id.substring(0, 8);
  return `${baseSlug}-${shortId}`;
}

/**
 * Extract ID from slug
 * @param {string} slug - Slug with ID suffix
 * @returns {string|null} Extracted ID or null
 */
export function extractIdFromSlug(slug) {
  if (!slug) return null;

  // Try to extract short ID from end (format: text-abc12345)
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];

  // Check if last part looks like a short ID (8 chars, alphanumeric)
  if (lastPart && /^[a-z0-9]{8}$/i.test(lastPart)) {
    return lastPart;
  }

  // If no short ID found, treat entire slug as potential full ID
  return slug;
}
