/**
 * Unit tests for voice commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectVoiceCommand,
  executeVoiceCommand,
  isLikelyCommand,
  getAvailableCommands
} from '../../../src/lib/modules/chat/voiceCommands.js';

// Mock dependencies
vi.mock('../../../src/lib/modules/chat/services/SecondOpinionService.js', () => ({
  secondOpinionService: {
    requestSecondOpinion: vi.fn()
  }
}));

vi.mock('../../../src/lib/modules/chat/voiceServices.js', () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue()
}));

vi.mock('$modules/i18n/stores', () => ({
  selectedLanguage: {
    subscribe: vi.fn((callback) => {
      callback('en');
      return () => {};
    })
  }
}));

describe('Voice Commands - detectVoiceCommand', () => {
  describe('English commands', () => {
    it('should detect "second opinion" command', () => {
      const result = detectVoiceCommand('Can I get a second opinion?', 'en');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Can I get a second opinion?',
        language: 'en'
      });
    });

    it('should detect "another opinion" command', () => {
      const result = detectVoiceCommand('Give me another opinion', 'en');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Give me another opinion',
        language: 'en'
      });
    });

    it('should detect "different answer" command', () => {
      const result = detectVoiceCommand('I want a different answer', 'en');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'I want a different answer',
        language: 'en'
      });
    });

    it('should detect "ask another model" command', () => {
      const result = detectVoiceCommand('Ask another AI model', 'en');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Ask another AI model',
        language: 'en'
      });
    });

    it('should detect "repeat" command', () => {
      const result = detectVoiceCommand('Please repeat that', 'en');
      expect(result).toEqual({
        type: 'repeat',
        originalText: 'Please repeat that',
        language: 'en'
      });
    });

    it('should detect "stop" command', () => {
      const result = detectVoiceCommand('Stop', 'en');
      expect(result).toEqual({
        type: 'stop',
        originalText: 'Stop',
        language: 'en'
      });
    });

    it('should return null for non-command text', () => {
      const result = detectVoiceCommand('What is the capital of France?', 'en');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = detectVoiceCommand('SECOND OPINION', 'en');
      expect(result).not.toBeNull();
      expect(result.type).toBe('secondOpinion');
    });
  });

  describe('Russian commands', () => {
    it('should detect "второе мнение" command', () => {
      const result = detectVoiceCommand('Дай мне второе мнение', 'ru');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Дай мне второе мнение',
        language: 'ru'
      });
    });

    it('should detect "другое мнение" command', () => {
      const result = detectVoiceCommand('Хочу другое мнение', 'ru');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Хочу другое мнение',
        language: 'ru'
      });
    });

    it('should detect "повтори" command', () => {
      const result = detectVoiceCommand('Повтори пожалуйста', 'ru');
      expect(result).toEqual({
        type: 'repeat',
        originalText: 'Повтори пожалуйста',
        language: 'ru'
      });
    });

    it('should detect "стоп" command', () => {
      const result = detectVoiceCommand('Стоп', 'ru');
      expect(result).toEqual({
        type: 'stop',
        originalText: 'Стоп',
        language: 'ru'
      });
    });
  });

  describe('Spanish commands', () => {
    it('should detect "segunda opinión" command', () => {
      const result = detectVoiceCommand('Dame una segunda opinión', 'es');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Dame una segunda opinión',
        language: 'es'
      });
    });

    it('should detect "otra opinión" command', () => {
      const result = detectVoiceCommand('Quiero otra opinión', 'es');
      expect(result).toEqual({
        type: 'secondOpinion',
        originalText: 'Quiero otra opinión',
        language: 'es'
      });
    });

    it('should detect "repite" command', () => {
      const result = detectVoiceCommand('Repite por favor', 'es');
      expect(result).toEqual({
        type: 'repeat',
        originalText: 'Repite por favor',
        language: 'es'
      });
    });

    it('should detect "detener" command', () => {
      const result = detectVoiceCommand('Detener', 'es');
      expect(result).toEqual({
        type: 'stop',
        originalText: 'Detener',
        language: 'es'
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = detectVoiceCommand('', 'en');
      expect(result).toBeNull();
    });

    it('should handle null input', () => {
      const result = detectVoiceCommand(null, 'en');
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = detectVoiceCommand(undefined, 'en');
      expect(result).toBeNull();
    });

    it('should handle whitespace-only input', () => {
      const result = detectVoiceCommand('   ', 'en');
      expect(result).toBeNull();
    });

    it('should fallback to English for unknown language', () => {
      const result = detectVoiceCommand('second opinion', 'unknown');
      expect(result).not.toBeNull();
      expect(result.type).toBe('secondOpinion');
    });
  });
});

describe('Voice Commands - isLikelyCommand', () => {
  it('should return true for command text', () => {
    expect(isLikelyCommand('second opinion', 'en')).toBe(true);
    expect(isLikelyCommand('repeat', 'en')).toBe(true);
    expect(isLikelyCommand('stop', 'en')).toBe(true);
  });

  it('should return false for non-command text', () => {
    expect(isLikelyCommand('What is the weather?', 'en')).toBe(false);
    expect(isLikelyCommand('Tell me about history', 'en')).toBe(false);
  });

  it('should work with different languages', () => {
    expect(isLikelyCommand('второе мнение', 'ru')).toBe(true);
    expect(isLikelyCommand('segunda opinión', 'es')).toBe(true);
  });
});

describe('Voice Commands - getAvailableCommands', () => {
  it('should return English commands', () => {
    const commands = getAvailableCommands('en');
    expect(commands).toBeInstanceOf(Array);
    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toContain('second opinion');
  });

  it('should return Russian commands', () => {
    const commands = getAvailableCommands('ru');
    expect(commands).toBeInstanceOf(Array);
    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toContain('второе мнение');
  });

  it('should return Spanish commands', () => {
    const commands = getAvailableCommands('es');
    expect(commands).toBeInstanceOf(Array);
    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toContain('segunda opinión');
  });

  it('should fallback to English for unknown language', () => {
    const commands = getAvailableCommands('unknown');
    expect(commands).toBeInstanceOf(Array);
    expect(commands[0]).toContain('second opinion');
  });
});

describe('Voice Commands - executeVoiceCommand', () => {
  let mockSecondOpinionService;
  let mockSynthesizeSpeech;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked modules
    const { secondOpinionService } = await import(
      '../../../src/lib/modules/chat/services/SecondOpinionService.js'
    );
    const { synthesizeSpeech } = await import('../../../src/lib/modules/chat/voiceServices.js');

    mockSecondOpinionService = secondOpinionService;
    mockSynthesizeSpeech = synthesizeSpeech;
  });

  describe('Second opinion command', () => {
    it('should handle successful second opinion request', async () => {
      mockSecondOpinionService.requestSecondOpinion.mockResolvedValue({
        success: true,
        data: {
          provider: 'ollama',
          model: 'llama3',
          content: 'This is a second opinion response.'
        }
      });

      const command = {
        type: 'secondOpinion',
        originalText: 'second opinion',
        language: 'en'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: 'msg-789'
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(true);
      expect(result.shouldSpeak).toBe(false); // Already spoken
      expect(result.opinionData).toBeDefined();
      expect(mockSecondOpinionService.requestSecondOpinion).toHaveBeenCalledWith(
        'msg-789',
        'session-123',
        {
          userId: 'user-456',
          language: 'en'
        }
      );
      expect(mockSynthesizeSpeech).toHaveBeenCalled();
    });

    it('should handle missing lastMessageId', async () => {
      const command = {
        type: 'secondOpinion',
        originalText: 'second opinion',
        language: 'en'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: null
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(false);
      expect(result.shouldSpeak).toBe(true);
      expect(result.message).toContain('no previous message');
      expect(mockSecondOpinionService.requestSecondOpinion).not.toHaveBeenCalled();
    });

    it('should handle second opinion service error', async () => {
      mockSecondOpinionService.requestSecondOpinion.mockRejectedValue(
        new Error('Service unavailable')
      );

      const command = {
        type: 'secondOpinion',
        originalText: 'second opinion',
        language: 'en'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: 'msg-789'
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(false);
      expect(result.shouldSpeak).toBe(true);
      // Error message should be present (either generic error or specific message)
      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should handle no alternative providers error', async () => {
      mockSecondOpinionService.requestSecondOpinion.mockRejectedValue(
        new Error('No alternative providers available')
      );

      const command = {
        type: 'secondOpinion',
        originalText: 'second opinion',
        language: 'en'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: 'msg-789'
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(false);
      expect(result.shouldSpeak).toBe(true);
      expect(result.message).toContain('alternative');
    });

    it('should call onStatusChange callback', async () => {
      mockSecondOpinionService.requestSecondOpinion.mockResolvedValue({
        success: true,
        data: {
          provider: 'ollama',
          model: 'llama3',
          content: 'Second opinion content.'
        }
      });

      const onStatusChange = vi.fn();

      const command = {
        type: 'secondOpinion',
        originalText: 'second opinion',
        language: 'en'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: 'msg-789',
        onStatusChange
      };

      await executeVoiceCommand(command, context);

      expect(onStatusChange).toHaveBeenCalledWith({ isGeneratingSecondOpinion: true });
      expect(onStatusChange).toHaveBeenCalledWith({
        isGeneratingSecondOpinion: false,
        currentProvider: 'ollama'
      });
      expect(onStatusChange).toHaveBeenCalledWith({ currentProvider: null });
    });
  });

  describe('Repeat command', () => {
    it('should repeat last response', async () => {
      const command = {
        type: 'repeat',
        originalText: 'repeat',
        language: 'en'
      };

      const context = {
        lastResponse: 'This is the last response.'
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(true);
      expect(result.shouldSpeak).toBe(false); // Already spoken
      expect(result.message).toBe('This is the last response.');
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith('This is the last response.', {
        isWaitingPhrase: false,
        language: 'en',
        priority: 1
      });
    });

    it('should handle missing last response', async () => {
      const command = {
        type: 'repeat',
        originalText: 'repeat',
        language: 'en'
      };

      const context = {
        lastResponse: null
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(false);
      expect(result.shouldSpeak).toBe(true);
      expect(result.message).toContain('nothing to repeat');
    });
  });

  describe('Stop command', () => {
    it('should handle stop command', async () => {
      const command = {
        type: 'stop',
        originalText: 'stop',
        language: 'en'
      };

      const context = {};

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(true);
      expect(result.shouldSpeak).toBe(false);
      expect(result.message).toBe('Stopped.');
    });
  });

  describe('Unknown command', () => {
    it('should handle unknown command type', async () => {
      const command = {
        type: 'unknown',
        originalText: 'unknown command',
        language: 'en'
      };

      const context = {};

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(false);
      expect(result.shouldSpeak).toBe(true);
      expect(result.message).toContain('understand');
    });
  });

  describe('Multilingual support', () => {
    it('should handle Russian commands', async () => {
      mockSecondOpinionService.requestSecondOpinion.mockResolvedValue({
        success: true,
        data: {
          provider: 'ollama',
          model: 'llama3',
          content: 'Это второе мнение.'
        }
      });

      const command = {
        type: 'secondOpinion',
        originalText: 'второе мнение',
        language: 'ru'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: 'msg-789'
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(true);
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.stringContaining('ollama'),
        expect.objectContaining({ language: 'ru' })
      );
    });

    it('should handle Spanish commands', async () => {
      mockSecondOpinionService.requestSecondOpinion.mockResolvedValue({
        success: true,
        data: {
          provider: 'ollama',
          model: 'llama3',
          content: 'Esta es una segunda opinión.'
        }
      });

      const command = {
        type: 'secondOpinion',
        originalText: 'segunda opinión',
        language: 'es'
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        lastMessageId: 'msg-789'
      };

      const result = await executeVoiceCommand(command, context);

      expect(result.success).toBe(true);
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.stringContaining('ollama'),
        expect.objectContaining({ language: 'es' })
      );
    });
  });
});
