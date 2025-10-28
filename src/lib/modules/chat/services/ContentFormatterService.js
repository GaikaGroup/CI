/**
 * Content Formatter Service
 *
 * Handles formatting of course settings, exam profiles, and mode details
 * for inclusion in chat prompts. Provides pure functions with no side effects.
 */

/**
 * Maps interface language codes to full language names
 */
const INTERFACE_LANGUAGE_MAP = {
  en: 'english',
  es: 'spanish',
  ru: 'russian',
  fr: 'french',
  de: 'german',
  it: 'italian',
  pt: 'portuguese'
};

export class ContentFormatterService {
  /**
   * Maps interface language code to full language name
   * @param {string} languageCode - Language code (e.g., 'en', 'es', 'ru')
   * @returns {string|null} Full language name or null if invalid
   */
  mapInterfaceLanguage(languageCode) {
    if (!languageCode || typeof languageCode !== 'string') {
      return null;
    }
    const normalised = languageCode.toLowerCase();
    return INTERFACE_LANGUAGE_MAP[normalised] ?? null;
  }

  /**
   * Extracts localized value from a multilingual object
   * @param {string|Object} value - Value to extract (string or object with language keys)
   * @param {string} languageKey - Preferred language key
   * @returns {string|null} Localized string or null
   */
  getLocalizedValue(value, languageKey) {
    if (!value) {
      return null;
    }

    // If already a string, return it
    if (typeof value === 'string') {
      return value;
    }

    // Try to get value for the specified language
    if (languageKey && typeof value[languageKey] === 'string') {
      return value[languageKey];
    }

    // Fallback to English
    if (typeof value.english === 'string') {
      return value.english;
    }

    // Fallback to first available string value
    const firstString = Object.values(value).find((entry) => typeof entry === 'string');
    return firstString ?? null;
  }

  /**
   * Formats mode details (practice or exam mode) into a readable string
   * @param {Object} mode - Mode configuration object
   * @param {string} label - Label for the mode (e.g., 'Practice mode', 'Exam mode')
   * @returns {string|null} Formatted mode details or null
   */
  formatModeDetails(mode, label) {
    if (!mode || typeof mode !== 'object') {
      return null;
    }

    const lines = [];

    if (mode.summary) {
      lines.push(`${label} summary: ${mode.summary}`);
    }
    if (mode.instructions) {
      lines.push(`${label} instructions: ${mode.instructions}`);
    }

    // Handle various property name formats for follow-up guidance
    const followUp =
      mode.follow_up_guidance ?? mode.followUpGuidance ?? mode.follow_up ?? mode.followUp ?? null;
    if (followUp) {
      lines.push(`${label} follow-up guidance: ${followUp}`);
    }

    // Handle various property name formats for min words
    const minWords = mode.min_words ?? mode.minWords ?? null;
    if (minWords) {
      lines.push(`${label} minimum word expectation: ${minWords}`);
    }

    // Handle various property name formats for max tokens
    const maxTokens = mode.max_tokens ?? mode.maxTokens ?? null;
    if (maxTokens) {
      lines.push(`${label} maximum token guidance: ${maxTokens}`);
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  /**
   * Formats complete course settings into a structured prompt string
   * @param {Object} settings - Course settings object
   * @param {string} interfaceLanguageCode - Interface language code
   * @param {string} activeMode - Active mode ('exam' or 'practice')
   * @returns {string|null} Formatted course settings or null
   */
  formatCourseSettings(settings, interfaceLanguageCode, activeMode) {
    if (!settings || typeof settings !== 'object') {
      return null;
    }

    const languageKey = this.mapInterfaceLanguage(interfaceLanguageCode);
    const lines = [];

    // Format header with course name, level, and language
    if (settings.name || settings.level || settings.language) {
      const headerParts = [];
      if (settings.name) {
        headerParts.push(`Course: ${settings.name}`);
      }
      if (settings.level) {
        headerParts.push(`Level: ${settings.level}`);
      }
      if (settings.language) {
        headerParts.push(`Primary interface language: ${settings.language}`);
      }
      lines.push(headerParts.join(' · '));
    }

    // Focus skills
    if (Array.isArray(settings.focus_skills) && settings.focus_skills.length > 0) {
      lines.push(`Focus skills: ${settings.focus_skills.join(', ')}`);
    }

    // Navigation codes
    if (settings.navigation_codes?.quick_navigation) {
      lines.push(`Navigation quick codes:\n${settings.navigation_codes.quick_navigation}`);
    }

    if (settings.navigation_codes?.code_processing_rules) {
      lines.push(
        `Navigation code handling rules:\n${settings.navigation_codes.code_processing_rules}`
      );
    }

    // Startup sequence
    const languageSelection = settings.startup_sequence?.language_selection_interface;
    if (languageSelection) {
      lines.push(`Language selection interface:\n${languageSelection}`);
    }

    const welcomeProtocol = this.getLocalizedValue(
      settings.startup_sequence?.welcome_message_protocol,
      languageKey
    );
    if (welcomeProtocol) {
      lines.push(`Welcome message protocol:\n${welcomeProtocol}`);
    }

    // Consent protocol
    if (settings.consent_protocol?.content) {
      lines.push(`Consent protocol:\n${settings.consent_protocol.content}`);
    }

    if (settings.consent_protocol?.consent_processing_rules) {
      lines.push(`Consent handling rules:\n${settings.consent_protocol.consent_processing_rules}`);
    }

    // Addressing protocol
    const addressingPrompt = this.getLocalizedValue(settings.addressing_protocol, languageKey);
    if (addressingPrompt) {
      lines.push(`Addressing protocol:\n${addressingPrompt}`);
    }

    // Initial assessment
    const assessmentBrief = this.getLocalizedValue(
      settings.initial_assessment_briefing,
      languageKey
    );
    if (assessmentBrief) {
      lines.push(`Initial assessment briefing:\n${assessmentBrief}`);
    }

    // Main menu
    const mainMenu = this.getLocalizedValue(settings.main_menu, languageKey);
    if (mainMenu) {
      lines.push(`Main navigation menu:\n${mainMenu}`);
    }

    // Help system
    if (settings.help_system) {
      lines.push(`Help system overview:\n${settings.help_system}`);
    }

    // Code processing system
    if (settings.code_processing_system?.input_recognition) {
      lines.push(`Code recognition details:\n${settings.code_processing_system.input_recognition}`);
    }

    if (settings.code_processing_system?.response_format) {
      lines.push(`Code response format:\n${settings.code_processing_system.response_format}`);
    }

    if (settings.code_processing_system?.error_handling) {
      lines.push(`Code error handling:\n${settings.code_processing_system.error_handling}`);
    }

    if (settings.code_processing_system?.context_aware_restrictions) {
      lines.push(
        `Context-aware restrictions:\n${settings.code_processing_system.context_aware_restrictions}`
      );
    }

    // Exam specifications
    if (settings.official_exam_specifications) {
      lines.push(`Official exam specifications:\n${settings.official_exam_specifications}`);
    }

    if (settings.official_scoring_methodology) {
      lines.push(`Official scoring methodology:\n${settings.official_scoring_methodology}`);
    }

    // Session methodology
    if (settings.session_methodology) {
      lines.push(`Session methodology:\n${settings.session_methodology}`);
    }

    // Feedback and assessment
    if (settings.feedback_and_assessment_protocol) {
      lines.push(`Feedback and assessment protocol:\n${settings.feedback_and_assessment_protocol}`);
    }

    // Quality assurance
    if (settings.quality_assurance) {
      lines.push(`Quality assurance notes:\n${settings.quality_assurance}`);
    }

    // Compliance checklist
    if (settings.compliance_checklist) {
      lines.push(`Compliance checklist:\n${settings.compliance_checklist}`);
    }

    // Practice mode details
    const practiceDetails = this.formatModeDetails(settings.practice_mode, 'Practice mode');
    if (practiceDetails) {
      lines.push(practiceDetails);
    }

    // Exam mode details
    const examDetails = this.formatModeDetails(settings.exam_mode, 'Exam mode');
    if (examDetails) {
      lines.push(examDetails);
    }

    // Active mode indicator
    if (activeMode && typeof activeMode === 'string') {
      const activeLabel = activeMode === 'exam' ? 'Exam mode' : 'Practice mode';
      lines.push(`Active mode for this session: ${activeLabel}.`);
    }

    return lines.length > 0 ? lines.join('\n\n') : null;
  }
}
