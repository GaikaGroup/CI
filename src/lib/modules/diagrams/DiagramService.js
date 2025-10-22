/**
 * Universal Diagram Service
 * Automatically generates diagrams from text descriptions
 */

import { TextAnalyzer } from './analyzer/TextAnalyzer.js';
import { DiagramRenderer } from './renderer/DiagramRenderer.js';

export class DiagramService {
  /**
   * Generate diagram from text description
   * @param {string} text - Problem text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Result with SVG and metadata
   */
  static async generateFromText(text, options = {}) {
    try {
      // Step 1: Analyze text and extract diagram requirements
      const analysis = await TextAnalyzer.analyze(text);

      if (!analysis.needsDiagram) {
        return {
          success: false,
          reason: 'No diagram needed for this text'
        };
      }

      // Step 2: Render diagram based on analysis
      const diagram = await DiagramRenderer.render(analysis, options);

      return {
        success: true,
        svg: diagram.svg,
        dataURL: this._svgToDataURL(diagram.svg),
        type: analysis.type,
        metadata: {
          detected: analysis.detected,
          calculated: analysis.calculated,
          parameters: analysis.parameters,
          generated: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: this._getSuggestion(error)
      };
    }
  }

  /**
   * Check if text needs a diagram
   * @param {string} text - Text to check
   * @returns {Promise<boolean>} True if diagram is needed
   */
  static async needsDiagram(text) {
    const analysis = await TextAnalyzer.analyze(text);
    return analysis.needsDiagram;
  }

  /**
   * Get diagram type from text
   * @param {string} text - Text to analyze
   * @returns {Promise<string|null>} Diagram type or null
   */
  static async getDiagramType(text) {
    const analysis = await TextAnalyzer.analyze(text);
    return analysis.needsDiagram ? analysis.type : null;
  }

  /**
   * Convert SVG to data URL
   * @private
   */
  static _svgToDataURL(svg) {
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Get helpful suggestion based on error
   * @private
   */
  static _getSuggestion(error) {
    const message = error.message.toLowerCase();

    if (message.includes('angle') && message.includes('180')) {
      return 'Проверьте сумму углов треугольника (должна быть 180°)';
    }

    if (message.includes('side') && message.includes('inequality')) {
      return 'Проверьте неравенство треугольника: сумма любых двух сторон должна быть больше третьей';
    }

    if (message.includes('parse') || message.includes('extract')) {
      return 'Убедитесь что в тексте указаны все необходимые параметры';
    }

    return 'Проверьте условие задачи';
  }
}
