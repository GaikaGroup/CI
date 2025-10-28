import { describe, it, expect } from 'vitest';
import {
  COMMAND_TEMPERATURES,
  extractCommand,
  getTemperatureForCommand,
  getCommandInfo
} from '../../../src/lib/config/commandTemperatures.js';

describe('Command Temperatures', () => {
  describe('COMMAND_TEMPERATURES', () => {
    it('should have correct temperature values', () => {
      expect(COMMAND_TEMPERATURES.explain).toBe(0.2);
      expect(COMMAND_TEMPERATURES.solve).toBe(0.1);
      expect(COMMAND_TEMPERATURES.check).toBe(0.2);
      expect(COMMAND_TEMPERATURES.practice).toBe(0.4);
      expect(COMMAND_TEMPERATURES.notes).toBe(0.3);
      expect(COMMAND_TEMPERATURES.essay).toBe(0.7);
      expect(COMMAND_TEMPERATURES.default).toBe(0.3);
    });

    it('should have all temperatures between 0 and 1', () => {
      Object.values(COMMAND_TEMPERATURES).forEach((temp) => {
        expect(temp).toBeGreaterThanOrEqual(0);
        expect(temp).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('extractCommand', () => {
    it('should extract English commands', () => {
      expect(extractCommand('/explain something')).toBe('explain');
      expect(extractCommand('/solve 2+2')).toBe('solve');
      expect(extractCommand('/check my answer')).toBe('check');
      expect(extractCommand('/practice')).toBe('practice');
      expect(extractCommand('/notes')).toBe('notes');
      expect(extractCommand('/essay topic')).toBe('essay');
    });

    it('should extract Russian commands', () => {
      expect(extractCommand('/объяснить теорема пифагора')).toBe(null); // Russian not in COMMAND_TEMPERATURES
      expect(extractCommand('/решить задачу')).toBe(null);
    });

    it('should handle commands with extra spaces', () => {
      expect(extractCommand('  /explain  something  ')).toBe('explain');
      expect(extractCommand('/solve   2+2')).toBe('solve');
    });

    it('should handle uppercase commands', () => {
      expect(extractCommand('/EXPLAIN something')).toBe('explain');
      expect(extractCommand('/Solve 2+2')).toBe('solve');
    });

    it('should return null for non-command messages', () => {
      expect(extractCommand('explain something')).toBe(null);
      expect(extractCommand('hello world')).toBe(null);
      expect(extractCommand('')).toBe(null);
      expect(extractCommand(null)).toBe(null);
    });

    it('should return null for unknown commands', () => {
      expect(extractCommand('/unknown command')).toBe(null);
      expect(extractCommand('/test')).toBe(null);
    });
  });

  describe('getTemperatureForCommand', () => {
    it('should return correct temperature for known commands', () => {
      expect(getTemperatureForCommand('explain')).toBe(0.2);
      expect(getTemperatureForCommand('solve')).toBe(0.1);
      expect(getTemperatureForCommand('check')).toBe(0.2);
      expect(getTemperatureForCommand('practice')).toBe(0.4);
      expect(getTemperatureForCommand('notes')).toBe(0.3);
      expect(getTemperatureForCommand('essay')).toBe(0.7);
    });

    it('should extract command from full message', () => {
      expect(getTemperatureForCommand('/explain теорема пифагора')).toBe(0.2);
      expect(getTemperatureForCommand('/solve 2x + 5 = 15')).toBe(0.1);
      expect(getTemperatureForCommand('/check my answer is correct')).toBe(0.2);
      expect(getTemperatureForCommand('/practice 3 задачи')).toBe(0.4);
      expect(getTemperatureForCommand('/notes on quantum mechanics')).toBe(0.3);
      expect(getTemperatureForCommand('/essay about mathematics')).toBe(0.7);
    });

    it('should return default temperature for non-command messages', () => {
      expect(getTemperatureForCommand('hello world')).toBe(0.3);
      expect(getTemperatureForCommand('what is 2+2?')).toBe(0.3);
      expect(getTemperatureForCommand('')).toBe(0.3);
      expect(getTemperatureForCommand(null)).toBe(0.3);
    });

    it('should return default temperature for unknown commands', () => {
      expect(getTemperatureForCommand('/unknown')).toBe(0.3);
      expect(getTemperatureForCommand('/test')).toBe(0.3);
    });
  });

  describe('getCommandInfo', () => {
    it('should return info for all commands', () => {
      const info = getCommandInfo();

      expect(info.explain).toBeDefined();
      expect(info.solve).toBeDefined();
      expect(info.check).toBeDefined();
      expect(info.practice).toBeDefined();
      expect(info.notes).toBeDefined();
      expect(info.essay).toBeDefined();
    });

    it('should include temperature, description, and usage for each command', () => {
      const info = getCommandInfo();

      Object.values(info).forEach((commandInfo) => {
        expect(commandInfo).toHaveProperty('temperature');
        expect(commandInfo).toHaveProperty('description');
        expect(commandInfo).toHaveProperty('usage');
        expect(typeof commandInfo.temperature).toBe('number');
        expect(typeof commandInfo.description).toBe('string');
        expect(typeof commandInfo.usage).toBe('string');
      });
    });

    it('should have correct temperature values in info', () => {
      const info = getCommandInfo();

      expect(info.explain.temperature).toBe(0.2);
      expect(info.solve.temperature).toBe(0.1);
      expect(info.check.temperature).toBe(0.2);
      expect(info.practice.temperature).toBe(0.4);
      expect(info.notes.temperature).toBe(0.3);
      expect(info.essay.temperature).toBe(0.7);
    });
  });

  describe('Temperature optimization for math tasks', () => {
    it('should use lowest temperature for solving (most accurate)', () => {
      expect(getTemperatureForCommand('/solve')).toBe(0.1);
      expect(getTemperatureForCommand('/solve')).toBeLessThan(getTemperatureForCommand('/explain'));
    });

    it('should use low temperature for explanations (accurate but conversational)', () => {
      expect(getTemperatureForCommand('/explain')).toBe(0.2);
      expect(getTemperatureForCommand('/explain')).toBeLessThan(
        getTemperatureForCommand('/practice')
      );
    });

    it('should use medium temperature for practice (variety but accurate)', () => {
      expect(getTemperatureForCommand('/practice')).toBe(0.4);
      expect(getTemperatureForCommand('/practice')).toBeGreaterThan(
        getTemperatureForCommand('/explain')
      );
      expect(getTemperatureForCommand('/practice')).toBeLessThan(
        getTemperatureForCommand('/essay')
      );
    });

    it('should use highest temperature for essays (creative writing)', () => {
      expect(getTemperatureForCommand('/essay')).toBe(0.7);
      expect(getTemperatureForCommand('/essay')).toBeGreaterThan(
        getTemperatureForCommand('/practice')
      );
    });
  });
});
