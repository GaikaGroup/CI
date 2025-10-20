/**
 * Get course URL using slug or ID
 * @param {Object} course - Course object
 * @returns {string} Course URL
 */
export function getCourseUrl(course) {
  if (!course) return '/catalogue';

  // Prefer slug over ID for SEO
  const identifier = course.slug || course.id;
  return `/learn/${identifier}`;
}

/**
 * Get course progress URL
 * @param {Object} course - Course object
 * @returns {string} Course progress URL
 */
export function getCourseProgressUrl(course) {
  if (!course) return '/catalogue';

  const identifier = course.slug || course.id;
  return `/learn/${identifier}/progress`;
}
