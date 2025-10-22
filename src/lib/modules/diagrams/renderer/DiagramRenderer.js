/**
 * Diagram Renderer
 * Renders diagrams based on analysis results
 */

import { TriangleRenderer } from './TriangleRenderer.js';
import { SVGBuilder } from './SVGBuilder.js';

export class DiagramRenderer {
  /**
   * Render diagram based on analysis
   * @param {Object} analysis - Analysis result from TextAnalyzer
   * @param {Object} options - Rendering options
   * @returns {Promise<Object>} Rendered diagram
   */
  static async render(analysis, options = {}) {
    const { type, parameters } = analysis;

    switch (type) {
      case 'triangle':
        return TriangleRenderer.render(parameters, options);

      case 'circle':
        return this._renderCircle(parameters, options);

      case 'quadrilateral':
        return this._renderQuadrilateral(parameters, options);

      default:
        throw new Error(`Unsupported diagram type: ${type}`);
    }
  }

  /**
   * Render circle (placeholder)
   * @private
   */
  static _renderCircle(params, options) {
    const { width = 400, height = 300 } = options;
    const svg = new SVGBuilder(width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = params.radius || 100;

    svg.addCircle(centerX, centerY, radius);
    svg.addPoint(centerX, centerY, 3);
    svg.addText(centerX, centerY - radius - 15, `r = ${radius}`);

    return {
      svg: svg.build({ title: 'Circle', description: `Circle with radius ${radius}` })
    };
  }

  /**
   * Render quadrilateral (placeholder)
   * @private
   */
  static _renderQuadrilateral(params, options) {
    const { width = 400, height = 300 } = options;
    const svg = new SVGBuilder(width, height);

    // Simple square for now
    const size = params.sides[0] || 100;
    const x = (width - size) / 2;
    const y = (height - size) / 2;

    svg.addPolygon([
      { x, y },
      { x: x + size, y },
      { x: x + size, y: y + size },
      { x, y: y + size }
    ]);

    return {
      svg: svg.build({ title: 'Quadrilateral', description: params.type || 'Quadrilateral' })
    };
  }
}
