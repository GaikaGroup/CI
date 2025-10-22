import { describe, it, expect } from 'vitest';
import { DiagramService } from '../../../src/lib/modules/diagrams/DiagramService.js';

describe('DiagramService', () => {
  describe('generateFromText', () => {
    it('should generate triangle from text with two angles', async () => {
      const text = 'В треугольнике ABC угол A равен 50 градусам, угол B равен 70 градусам';
      const result = await DiagramService.generateFromText(text);

      expect(result.success).toBe(true);
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('</svg>');
      expect(result.type).toBe('triangle');
      expect(result.metadata.detected).toContain('angle A');
      expect(result.metadata.detected).toContain('angle B');
      expect(result.metadata.calculated).toContain('angle C');
    });

    it('should generate triangle from English text', async () => {
      const text = 'In triangle ABC angle A = 50 degrees, angle B = 70 degrees';
      const result = await DiagramService.generateFromText(text);

      expect(result.success).toBe(true);
      expect(result.type).toBe('triangle');
    });

    it('should return false for non-geometric text', async () => {
      const text = 'Решите уравнение x + 5 = 10';
      const result = await DiagramService.generateFromText(text);

      expect(result.success).toBe(false);
    });

    it('should handle invalid triangle angles', async () => {
      const text = 'В треугольнике ABC угол A = 100°, угол B = 100°';
      const result = await DiagramService.generateFromText(text);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestion).toBeDefined();
    });
  });

  describe('needsDiagram', () => {
    it('should return true for geometric problems with enough info', async () => {
      const text = 'В треугольнике ABC угол A = 50°, угол B = 70°';
      const needs = await DiagramService.needsDiagram(text);

      expect(needs).toBe(true);
    });

    it('should return false for geometric problems without enough info', async () => {
      const text = 'В треугольнике ABC угол A = 50°';
      const needs = await DiagramService.needsDiagram(text);

      expect(needs).toBe(false);
    });

    it('should return false for non-geometric problems', async () => {
      const text = 'Решите уравнение';
      const needs = await DiagramService.needsDiagram(text);

      expect(needs).toBe(false);
    });
  });

  describe('getDiagramType', () => {
    it('should detect triangle with enough info', async () => {
      const text = 'В треугольнике ABC угол A = 50°, угол B = 70°';
      const type = await DiagramService.getDiagramType(text);

      expect(type).toBe('triangle');
    });

    it('should return null for triangle without enough info', async () => {
      const text = 'В треугольнике ABC';
      const type = await DiagramService.getDiagramType(text);

      expect(type).toBeNull();
    });

    it('should return null for non-geometric text', async () => {
      const text = 'Решите уравнение';
      const type = await DiagramService.getDiagramType(text);

      expect(type).toBeNull();
    });
  });
});
