import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptBuilderService } from '../../../../src/lib/modules/chat/services/PromptBuilderService.js';

describe('PromptBuilderService', () => {
  let service;
  let mockContentFormatter;

  beforeEach(() => {
    // Mock ContentFormatterService
    mockContentFormatter = {
      formatCourseSettings: vi.fn().mockReturnValue('Formatted course settings')
    };

    service = new PromptBuilderService(mockContentFormatter);
  });

  describe('buildPromptContent', () => {
    it('should build basic prompt with user content', () => {
      const result = service.buildPromptContent({
        content: 'Hello, can you help me?',
        recognizedText: '',
        images: [],
        sessionContext: null,
        examProfile: null,
        ocrError: null
      });

      expect(result).toContain('Student question:\nHello, can you help me?');
    });

    it('should include session documents', () => {
      const sessionContext = {
        documents: [
          {
            content: {
              processedContent: {
                text: 'Document 1 content'
              }
            }
          },
          {
            content: {
              processedContent: {
                text: 'Document 2 content'
              }
            }
          }
        ]
      };

      const result = service.buildPromptContent({
        content: 'Question',
        recognizedText: '',
        images: [],
        sessionContext,
        examProfile: null,
        ocrError: null
      });

      expect(result).toContain('Previous documents:');
      expect(result).toContain('Document 1:\nDocument 1 content');
      expect(result).toContain('Document 2:\nDocument 2 content');
    });

    it('should include exam profile information', () => {
      const examProfile = {
        subjectName: 'IELTS',
        level: 'B2',
        language: 'English',
        skills: ['reading', 'writing'],
        mode: 'exam',
        exam: {
          summary: 'Exam mode summary',
          instructions: 'Exam instructions',
          followUp: 'Follow-up guidance'
        }
      };

      const result = service.buildPromptContent({
        content: 'Question',
        recognizedText: '',
        images: [],
        sessionContext: null,
        examProfile,
        ocrError: null
      });

      expect(result).toContain('Exam course: IELTS (Level: B2)');
      expect(result).toContain('Mode: Exam simulation');
      expect(result).toContain('Target language: English');
      expect(result).toContain('Skills in focus: reading, writing');
      expect(result).toContain('Mode focus: Exam mode summary');
      expect(result).toContain('Guidance: Exam instructions');
      expect(result).toContain('Follow-up expectation: Follow-up guidance');
    });

    it('should include recognized text from images', () => {
      const result = service.buildPromptContent({
        content: 'What does this say?',
        recognizedText: 'Text from image',
        images: ['image1'],
        sessionContext: null,
        examProfile: null,
        ocrError: null
      });

      expect(result).toContain('Document content (OCR extracted):\nText from image');
    });

    it('should include OCR error note when provided', () => {
      const result = service.buildPromptContent({
        content: 'Question',
        recognizedText: '',
        images: ['image1'],
        sessionContext: null,
        examProfile: null,
        ocrError: 'OCR processing failed'
      });

      expect(result).toContain('[OCR Processing Note: OCR processing failed]');
    });

    it('should include default OCR note when no text recognized', () => {
      const result = service.buildPromptContent({
        content: 'Question',
        recognizedText: '',
        images: ['image1'],
        sessionContext: null,
        examProfile: null,
        ocrError: null
      });

      expect(result).toContain('[OCR Processing Note: No text could be recognized');
    });

    it('should not include OCR note when no images', () => {
      const result = service.buildPromptContent({
        content: 'Question',
        recognizedText: '',
        images: [],
        sessionContext: null,
        examProfile: null,
        ocrError: null
      });

      expect(result).not.toContain('[OCR Processing Note');
    });
  });

  describe('buildMessages', () => {
    it('should build basic messages array', () => {
      const messages = service.buildMessages({
        systemPrompt: 'You are a helpful assistant',
        fullContent: 'Hello',
        images: [],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: null
      });

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('RESPOND IN ENGLISH');
      expect(messages.some((m) => m.role === 'user')).toBe(true);
    });

    it('should use agent instructions when provided', () => {
      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'Hello',
        images: [],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: 'Custom agent instructions'
      });

      const firstSystemMessage = messages.find((m) => m.role === 'system');
      expect(firstSystemMessage.content).toContain('Custom agent instructions');
    });

    it('should include conversation history with sliding window', () => {
      const sessionContext = {
        history: Array.from({ length: 30 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`
        }))
      };

      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'Hello',
        images: [],
        sessionContext,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: null
      });

      // Should limit history to MAX_HISTORY_MESSAGES (20 for OpenAI)
      const historyMessages = messages.filter(
        (m) => m.content.startsWith('Message') && (m.role === 'user' || m.role === 'assistant')
      );
      expect(historyMessages.length).toBeLessThanOrEqual(20);
    });

    it('should add formatted course settings when exam profile provided', () => {
      const examProfile = {
        settings: { name: 'Test Course' },
        mode: 'exam'
      };

      service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'Hello',
        images: [],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: null
      });

      expect(mockContentFormatter.formatCourseSettings).toHaveBeenCalledWith(
        examProfile.settings,
        'en',
        'exam'
      );
    });

    it('should add detail level instruction when detailed', () => {
      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'Hello',
        images: [],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'detailed',
        adjustedMinWords: null,
        agentInstructions: null
      });

      const detailMessage = messages.find((m) => m.content.includes('detailed explanation'));
      expect(detailMessage).toBeDefined();
    });

    it('should add minimum words instruction when specified', () => {
      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'Hello',
        images: [],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: 500,
        agentInstructions: null
      });

      const minWordsMessage = messages.find((m) => m.content.includes('at least 500 words'));
      expect(minWordsMessage).toBeDefined();
    });

    it('should format vision message when images provided', () => {
      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'What is in this image?',
        images: ['data:image/png;base64,abc123'],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: null
      });

      const userMessage = messages.find((m) => m.role === 'user');
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content.some((c) => c.type === 'image_url')).toBe(true);
    });

    it('should add command context reminder for commands', () => {
      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: '/help',
        images: [],
        sessionContext: null,
        detectedLanguage: 'en',
        requestedProvider: 'openai',
        examProfile: null,
        language: 'en',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: null
      });

      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage.content).toContain('This is a COMMAND');
    });

    it('should add extra language enforcement for Ollama', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const messages = service.buildMessages({
        systemPrompt: 'System prompt',
        fullContent: 'Hello',
        images: [],
        sessionContext: null,
        detectedLanguage: 'es',
        requestedProvider: 'ollama',
        examProfile: null,
        language: 'es',
        detailLevel: 'normal',
        adjustedMinWords: null,
        agentInstructions: null
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Ollama] Added extra language enforcement')
      );

      const languageMessage = messages.find((m) => m.content === 'Language: español');
      expect(languageMessage).toBeDefined();

      consoleLogSpy.mockRestore();
    });
  });

  describe('_formatVisionMessage', () => {
    it('should format message with text and images', () => {
      const result = service._formatVisionMessage('What is this?', [
        'data:image/png;base64,abc123',
        'data:image/png;base64,def456'
      ]);

      expect(result.role).toBe('user');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('What is this?');
      expect(result.content[1].type).toBe('image_url');
      expect(result.content[1].image_url.url).toBe('data:image/png;base64,abc123');
      expect(result.content[2].type).toBe('image_url');
      expect(result.content[2].image_url.url).toBe('data:image/png;base64,def456');
    });
  });

  describe('language helper methods', () => {
    it('should get correct language prefix', () => {
      expect(service._getLanguagePrefix('en')).toContain('RESPOND IN ENGLISH');
      expect(service._getLanguagePrefix('es')).toContain('RESPONDE EN ESPAÑOL');
      expect(service._getLanguagePrefix('ru')).toContain('ОТВЕЧАЙ НА РУССКОМ');
    });

    it('should get correct user language instruction', () => {
      expect(service._getUserLanguageInstruction('en')).toContain('[Respond in English]');
      expect(service._getUserLanguageInstruction('es')).toContain('[Responde en español]');
      expect(service._getUserLanguageInstruction('ru')).toContain('[Отвечай на русском]');
    });

    it('should get correct target language name', () => {
      expect(service._getTargetLanguageName('en')).toBe('English');
      expect(service._getTargetLanguageName('es')).toBe('Spanish');
      expect(service._getTargetLanguageName('ru')).toBe('Russian');
      expect(service._getTargetLanguageName('unknown')).toBe('English');
    });
  });
});
