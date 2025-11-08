/**
 * Language Detection Utilities
 * Detects language from text content
 */

/**
 * Detect language from text content
 */
export function detectLanguageFromText(text) {
  if (!text || text.length < 3) return null;

  // Russian detection - Cyrillic characters
  if (/[а-яё]/i.test(text)) {
    return 'ru';
  }

  // Spanish detection - Spanish-specific characters and common words
  if (
    /[ñáéíóúü¿¡]/i.test(text) ||
    /\b(el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|están)\b/i.test(text)
  ) {
    return 'es';
  }

  // French detection
  if (
    /[àâæçéèêëïîôùûüÿœ]/i.test(text) ||
    /\b(le|la|les|un|une|des|de|du|et|est|sont|dans|pour|avec|sur)\b/i.test(text)
  ) {
    return 'fr';
  }

  // German detection
  if (
    /[äöüß]/i.test(text) ||
    /\b(der|die|das|den|dem|des|ein|eine|und|ist|sind|in|zu|mit|auf)\b/i.test(text)
  ) {
    return 'de';
  }

  // Italian detection
  if (/\b(il|lo|la|i|gli|le|un|uno|una|di|da|in|con|su|per|che|è|sono)\b/i.test(text)) {
    return 'it';
  }

  // Portuguese detection
  if (
    /[ãõâêôáéíóú]/i.test(text) ||
    /\b(o|a|os|as|um|uma|de|da|do|em|no|na|com|por|para|que|é|são)\b/i.test(text)
  ) {
    return 'pt';
  }

  // Default to English
  return 'en';
}

/**
 * Get language confidence score (0-1)
 */
export function getLanguageConfidence(text, language) {
  if (!text || !language) return 0;

  const patterns = {
    ru: /[а-яё]/gi,
    es: /[ñáéíóúü¿¡]/gi,
    fr: /[àâæçéèêëïîôùûüÿœ]/gi,
    de: /[äöüß]/gi,
    en: /[a-z]/gi
  };

  const pattern = patterns[language];
  if (!pattern) return 0;

  const matches = text.match(pattern);
  if (!matches) return 0;

  return Math.min(matches.length / text.length, 1);
}

/**
 * Detect multiple languages in text
 */
export function detectMultipleLanguages(text) {
  const languages = ['en', 'ru', 'es', 'fr', 'de', 'it', 'pt'];
  const scores = {};

  for (const lang of languages) {
    scores[lang] = getLanguageConfidence(text, lang);
  }

  return Object.entries(scores)
    .filter(([_, score]) => score > 0.1)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, score]) => ({ language: lang, confidence: score }));
}
