/**
 * Triangle Renderer
 * Renders triangle diagrams
 */

import { SVGBuilder } from './SVGBuilder.js';

export class TriangleRenderer {
  /**
   * Render triangle diagram
   * @param {Object} params - Triangle parameters
   * @param {Object} options - Rendering options
   * @returns {Object} Rendered diagram
   */
  static render(params, options = {}) {
    const { width = 400, height = 300, padding = 40 } = options;

    // Get angles (all three should be available after analysis)
    const angleA = params.angleA || 60;
    const angleB = params.angleB || 60;
    const angleC = params.angleC || 60;

    // Validate - check sum is 180°
    const sum = angleA + angleB + angleC;
    if (Math.abs(sum - 180) > 0.1) {
      throw new Error(`Невозможно построить треугольник: сумма углов ${Math.round(sum)}° ≠ 180°`);
    }

    // Validate - all angles must be positive
    if (angleA <= 0 || angleB <= 0 || angleC <= 0) {
      throw new Error('Все углы треугольника должны быть положительными');
    }

    // Calculate vertices
    const vertices = this._calculateVertices(angleA, angleB, angleC, width, height, padding);

    // Create SVG
    const svg = new SVGBuilder(width, height);

    // Draw triangle
    svg.addPolygon([vertices.A, vertices.B, vertices.C]);

    // Calculate center for label positioning
    const center = {
      x: (vertices.A.x + vertices.B.x + vertices.C.x) / 3,
      y: (vertices.A.y + vertices.B.y + vertices.C.y) / 3
    };

    // Add vertex labels
    this._addVertexLabel(svg, vertices.A, 'A', center);
    this._addVertexLabel(svg, vertices.B, 'B', center);
    this._addVertexLabel(svg, vertices.C, 'C', center);

    // Add angle labels
    this._addAngleLabel(svg, vertices.A, angleA, vertices.B, vertices.C);
    this._addAngleLabel(svg, vertices.B, angleB, vertices.A, vertices.C);
    this._addAngleLabel(svg, vertices.C, angleC, vertices.A, vertices.B);

    return {
      svg: svg.build({
        title: 'Triangle',
        description: `Triangle with angles ${Math.round(angleA)}°, ${Math.round(angleB)}°, ${Math.round(angleC)}°`
      })
    };
  }

  /**
   * Calculate triangle vertices from angles
   * @private
   */
  static _calculateVertices(angleA, angleB, angleC, width, height, padding) {
    // Use a base length that fits in the canvas
    const baseLength = Math.min(width, height) - 2 * padding;

    // Place C at bottom-left, B at bottom-right
    const C = { x: padding, y: height - padding };
    const B = { x: padding + baseLength, y: height - padding };

    // Calculate A position using angles
    const angleCRad = (angleC * Math.PI) / 180;
    const heightFromBase =
      baseLength *
      Math.sin(angleCRad) *
      (Math.sin((angleB * Math.PI) / 180) / Math.sin((angleA * Math.PI) / 180));

    const A = {
      x:
        C.x +
        baseLength *
          Math.cos(angleCRad) *
          (Math.sin((angleB * Math.PI) / 180) / Math.sin((angleA * Math.PI) / 180)),
      y: C.y - heightFromBase
    };

    return { A, B, C };
  }

  /**
   * Add vertex label
   * @private
   */
  static _addVertexLabel(svg, vertex, label, center) {
    // Calculate direction from center to vertex
    const dx = vertex.x - center.x;
    const dy = vertex.y - center.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Normalize and apply offset
    const offset = 20;
    const nx = dx / length;
    const ny = dy / length;

    const labelX = vertex.x + nx * offset;
    const labelY = vertex.y + ny * offset;

    svg.addText(labelX, labelY, label, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#1f2937'
    });
  }

  /**
   * Add angle label with arc
   * @private
   */
  static _addAngleLabel(svg, vertex, angle, point1, point2) {
    // Calculate angles to the two points
    const angle1 = Math.atan2(point1.y - vertex.y, point1.x - vertex.x);
    const angle2 = Math.atan2(point2.y - vertex.y, point2.x - vertex.x);

    // Convert to degrees
    let startAngle = (angle1 * 180) / Math.PI;
    let endAngle = (angle2 * 180) / Math.PI;

    // Ensure start < end
    if (startAngle > endAngle) {
      [startAngle, endAngle] = [endAngle, startAngle];
    }

    // Draw angle arc
    const arcRadius = 30;
    svg.addAngleArc(vertex.x, vertex.y, arcRadius, startAngle, endAngle);

    // Add angle label
    const bisector = (startAngle + endAngle) / 2;
    const labelRadius = arcRadius + 15;
    const labelX = vertex.x + labelRadius * Math.cos((bisector * Math.PI) / 180);
    const labelY = vertex.y + labelRadius * Math.sin((bisector * Math.PI) / 180);

    svg.addText(labelX, labelY, `${Math.round(angle)}°`, {
      fontSize: 14,
      fill: '#10b981'
    });
  }
}
