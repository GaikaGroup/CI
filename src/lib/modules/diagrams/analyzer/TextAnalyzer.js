/**
 * Text Analyzer
 * Analyzes problem text and determines what diagram is needed
 */

import { TriangleAnalyzer } from './TriangleAnalyzer.js';
import { ParameterExtractor } from './ParameterExtractor.js';

export class TextAnalyzer {
  /**
   * Analyze text and determine diagram requirements
   * @param {string} text - Problem text
   * @returns {Promise<Object>} Analysis result
   */
  static async analyze(text) {
    // Normalize text
    const normalized = this._normalizeText(text);

    // Detect diagram type
    const type = this._detectType(normalized);

    if (!type) {
      return {
        needsDiagram: false,
        reason: 'No geometric shapes detected'
      };
    }

    // Analyze based on type
    switch (type) {
      case 'triangle':
        return await TriangleAnalyzer.analyze(normalized);

      case 'circle':
        return {
          needsDiagram: true,
          type: 'circle',
          parameters: ParameterExtractor.extractCircleParams(normalized),
          detected: ['circle'],
          calculated: []
        };

      case 'quadrilateral':
        return {
          needsDiagram: true,
          type: 'quadrilateral',
          parameters: ParameterExtractor.extractQuadrilateralParams(normalized),
          detected: ['quadrilateral'],
          calculated: []
        };

      default:
        return {
          needsDiagram: false,
          reason: `Diagram type '${type}' not yet supported`
        };
    }
  }

  /**
   * Normalize text for analysis
   * @private
   */
  static _normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect diagram type from text
   * @private
   */
  static _detectType(text) {
    // Triangle keywords
    const triangleKeywords = [
      'треугольник',
      'triangle',
      'угол a',
      'угол b',
      'угол c',
      'сторона ab',
      'сторона bc',
      'сторона ac'
    ];

    // Circle keywords
    const circleKeywords = [
      'окружность',
      'круг',
      'circle',
      'радиус',
      'radius',
      'диаметр',
      'diameter'
    ];

    // Quadrilateral keywords
    const quadKeywords = [
      'квадрат',
      'прямоугольник',
      'параллелограмм',
      'трапеция',
      'ромб',
      'square',
      'rectangle',
      'parallelogram',
      'trapezoid',
      'rhombus'
    ];

    // Check for each type
    if (triangleKeywords.some((kw) => text.includes(kw))) {
      return 'triangle';
    }

    if (circleKeywords.some((kw) => text.includes(kw))) {
      return 'circle';
    }

    if (quadKeywords.some((kw) => text.includes(kw))) {
      return 'quadrilateral';
    }

    return null;
  }
}
