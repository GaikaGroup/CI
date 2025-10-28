import { describe, it, expect } from 'vitest';
import { ContentFormatterService } from '../../../../src/lib/modules/chat/services/ContentFormatterService.js';

describe('ContentFormatterService', () => {
  let service;

  beforeEach(() => {
    service = new ContentFormatterService();
  });

  describe('mapInterfaceLanguage', () => {
    it('should map valid language codes to full names', () => {
      expect(service.mapInterfaceLanguage('en')).toBe('english');
      expect(service.mapInterfaceLanguage('es')).toBe('spanish');
      expect(service.mapInterfaceLanguage('ru')).toBe('russian');
      expect(service.mapInterfaceLanguage('fr')).toBe('french');
      expect(service.mapInterfaceLanguage('de')).toBe('german');
      expect(service.mapInterfaceLanguage('it')).toBe('italian');
      expect(service.mapInterfaceLanguage('pt')).toBe('portuguese');
    });

    it('should handle uppercase language codes', () => {
      expect(service.mapInterfaceLanguage('EN')).toBe('english');
      expect(service.mapInterfaceLanguage('ES')).toBe('spanish');
    });

    it('should return null for invalid language codes', () => {
      expect(service.mapInterfaceLanguage('invalid')).toBeNull();
      expect(service.mapInterfaceLanguage('xx')).toBeNull();
    });

    it('should return null for null or undefined input', () => {
      expect(service.mapInterfaceLanguage(null)).toBeNull();
      expect(service.mapInterfaceLanguage(undefined)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(service.mapInterfaceLanguage(123)).toBeNull();
      expect(service.mapInterfaceLanguage({})).toBeNull();
      expect(service.mapInterfaceLanguage([])).toBeNull();
    });
  });

  describe('getLocalizedValue', () => {
    it('should return string value as-is', () => {
      expect(service.getLocalizedValue('Hello', 'english')).toBe('Hello');
    });

    it('should extract value for specified language key', () => {
      const value = {
        english: 'Hello',
        spanish: 'Hola',
        russian: 'Привет'
      };
      expect(service.getLocalizedValue(value, 'spanish')).toBe('Hola');
      expect(service.getLocalizedValue(value, 'russian')).toBe('Привет');
    });

    it('should fallback to english if language key not found', () => {
      const value = {
        english: 'Hello',
        spanish: 'Hola'
      };
      expect(service.getLocalizedValue(value, 'french')).toBe('Hello');
    });

    it('should fallback to first string value if no english key', () => {
      const value = {
        spanish: 'Hola',
        russian: 'Привет'
      };
      const result = service.getLocalizedValue(value, 'french');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should return null for null or undefined input', () => {
      expect(service.getLocalizedValue(null, 'english')).toBeNull();
      expect(service.getLocalizedValue(undefined, 'english')).toBeNull();
    });

    it('should return null for empty object', () => {
      expect(service.getLocalizedValue({}, 'english')).toBeNull();
    });

    it('should handle missing language key parameter', () => {
      const value = {
        english: 'Hello',
        spanish: 'Hola'
      };
      expect(service.getLocalizedValue(value, null)).toBe('Hello');
    });
  });

  describe('formatModeDetails', () => {
    it('should format mode with all properties', () => {
      const mode = {
        summary: 'Practice mode summary',
        instructions: 'Practice instructions',
        followUp: 'Follow-up guidance',
        minWords: 100,
        maxTokens: 500
      };
      const result = service.formatModeDetails(mode, 'Practice mode');
      expect(result).toContain('Practice mode summary: Practice mode summary');
      expect(result).toContain('Practice mode instructions: Practice instructions');
      expect(result).toContain('Practice mode follow-up guidance: Follow-up guidance');
      expect(result).toContain('Practice mode minimum word expectation: 100');
      expect(result).toContain('Practice mode maximum token guidance: 500');
    });

    it('should handle snake_case property names', () => {
      const mode = {
        follow_up_guidance: 'Follow-up',
        min_words: 50,
        max_tokens: 300
      };
      const result = service.formatModeDetails(mode, 'Exam mode');
      expect(result).toContain('follow-up guidance: Follow-up');
      expect(result).toContain('minimum word expectation: 50');
      expect(result).toContain('maximum token guidance: 300');
    });

    it('should handle partial mode configuration', () => {
      const mode = {
        summary: 'Only summary'
      };
      const result = service.formatModeDetails(mode, 'Test mode');
      expect(result).toBe('Test mode summary: Only summary');
    });

    it('should return null for null or undefined mode', () => {
      expect(service.formatModeDetails(null, 'Test')).toBeNull();
      expect(service.formatModeDetails(undefined, 'Test')).toBeNull();
    });

    it('should return null for empty mode object', () => {
      expect(service.formatModeDetails({}, 'Test')).toBeNull();
    });

    it('should return null for non-object mode', () => {
      expect(service.formatModeDetails('string', 'Test')).toBeNull();
      expect(service.formatModeDetails(123, 'Test')).toBeNull();
    });
  });

  describe('formatCourseSettings', () => {
    it('should format complete course settings', () => {
      const settings = {
        name: 'IELTS Preparation',
        level: 'B2',
        language: 'English',
        focus_skills: ['reading', 'writing'],
        session_methodology: 'Interactive learning',
        practice_mode: {
          summary: 'Practice summary',
          instructions: 'Practice instructions'
        },
        exam_mode: {
          summary: 'Exam summary',
          instructions: 'Exam instructions'
        }
      };
      const result = service.formatCourseSettings(settings, 'en', 'practice');
      expect(result).toContain('Course: IELTS Preparation');
      expect(result).toContain('Level: B2');
      expect(result).toContain('Focus skills: reading, writing');
      expect(result).toContain('Session methodology:\nInteractive learning');
      expect(result).toContain('Practice mode summary: Practice summary');
      expect(result).toContain('Exam mode summary: Exam summary');
      expect(result).toContain('Active mode for this session: Practice mode');
    });

    it('should format navigation codes', () => {
      const settings = {
        navigation_codes: {
          quick_navigation: '/help - Show help',
          code_processing_rules: 'Process codes immediately'
        }
      };
      const result = service.formatCourseSettings(settings, 'en', null);
      expect(result).toContain('Navigation quick codes:\n/help - Show help');
      expect(result).toContain('Navigation code handling rules:\nProcess codes immediately');
    });

    it('should format startup sequence with localization', () => {
      const settings = {
        startup_sequence: {
          language_selection_interface: 'Select your language',
          welcome_message_protocol: {
            english: 'Welcome!',
            spanish: '¡Bienvenido!'
          }
        }
      };
      const result = service.formatCourseSettings(settings, 'es', null);
      expect(result).toContain('Language selection interface:\nSelect your language');
      expect(result).toContain('Welcome message protocol:\n¡Bienvenido!');
    });

    it('should format consent protocol', () => {
      const settings = {
        consent_protocol: {
          content: 'Please agree to terms',
          consent_processing_rules: 'Store consent'
        }
      };
      const result = service.formatCourseSettings(settings, 'en', null);
      expect(result).toContain('Consent protocol:\nPlease agree to terms');
      expect(result).toContain('Consent handling rules:\nStore consent');
    });

    it('should format code processing system', () => {
      const settings = {
        code_processing_system: {
          input_recognition: 'Recognize /commands',
          response_format: 'JSON format',
          error_handling: 'Show friendly errors',
          context_aware_restrictions: 'Restrict in exam mode'
        }
      };
      const result = service.formatCourseSettings(settings, 'en', null);
      expect(result).toContain('Code recognition details:\nRecognize /commands');
      expect(result).toContain('Code response format:\nJSON format');
      expect(result).toContain('Code error handling:\nShow friendly errors');
      expect(result).toContain('Context-aware restrictions:\nRestrict in exam mode');
    });

    it('should format exam specifications', () => {
      const settings = {
        official_exam_specifications: 'IELTS official specs',
        official_scoring_methodology: 'Band score 1-9'
      };
      const result = service.formatCourseSettings(settings, 'en', null);
      expect(result).toContain('Official exam specifications:\nIELTS official specs');
      expect(result).toContain('Official scoring methodology:\nBand score 1-9');
    });

    it('should indicate active exam mode', () => {
      const settings = {
        name: 'Test Course'
      };
      const result = service.formatCourseSettings(settings, 'en', 'exam');
      expect(result).toContain('Active mode for this session: Exam mode');
    });

    it('should return null for null or undefined settings', () => {
      expect(service.formatCourseSettings(null, 'en', null)).toBeNull();
      expect(service.formatCourseSettings(undefined, 'en', null)).toBeNull();
    });

    it('should return null for empty settings object', () => {
      expect(service.formatCourseSettings({}, 'en', null)).toBeNull();
    });

    it('should return null for non-object settings', () => {
      expect(service.formatCourseSettings('string', 'en', null)).toBeNull();
      expect(service.formatCourseSettings(123, 'en', null)).toBeNull();
    });

    it('should handle minimal settings', () => {
      const settings = {
        name: 'Minimal Course'
      };
      const result = service.formatCourseSettings(settings, 'en', null);
      expect(result).toBe('Course: Minimal Course');
    });

    it('should use localized values based on interface language', () => {
      const settings = {
        addressing_protocol: {
          english: 'Hello student',
          spanish: 'Hola estudiante',
          russian: 'Привет студент'
        },
        main_menu: {
          english: 'Main menu',
          spanish: 'Menú principal'
        }
      };

      const resultEn = service.formatCourseSettings(settings, 'en', null);
      expect(resultEn).toContain('Addressing protocol:\nHello student');
      expect(resultEn).toContain('Main navigation menu:\nMain menu');

      const resultEs = service.formatCourseSettings(settings, 'es', null);
      expect(resultEs).toContain('Addressing protocol:\nHola estudiante');
      expect(resultEs).toContain('Main navigation menu:\nMenú principal');
    });
  });
});
