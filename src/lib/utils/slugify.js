export const slugify = (value, fallback = '') => {
  if (!value && !fallback) {
    return '';
  }

  const base = value ?? fallback;

  const slug = base
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug) {
    return slug;
  }

  return fallback ? slugify(fallback) : '';
};
