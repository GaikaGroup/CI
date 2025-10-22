/**
 * Triangle Analyzer
 * Specialized analyzer for triangle problems
 */

import { ParameterExtractor } from './ParameterExtractor.js';

export class TriangleAnalyzer {
  /**
   * Analyze triangle problem
   * @param {string} text - Normalized problem text
   * @returns {Object} Analysis result
   */
  static async analyze(text) {
    const detected = [];
    const calculated = [];
    const parameters = {};

    // Extract angles
    const angles = ParameterExtractor.extractAngles(text);
    if (angles.A !== null) {
      parameters.angleA = angles.A;
      detected.push('angle A');
    }
    if (angles.B !== null) {
      parameters.angleB = angles.B;
      detected.push('angle B');
    }
    if (angles.C !== null) {
      parameters.angleC = angles.C;
      detected.push('angle C');
    }

    // Calculate missing angle if we have two
    let angleCount = [angles.A, angles.B, angles.C].filter((a) => a !== null).length;

    if (angleCount === 2) {
      if (angles.A === null) {
        parameters.angleA = 180 - angles.B - angles.C;
        calculated.push('angle A');
      } else if (angles.B === null) {
        parameters.angleB = 180 - angles.A - angles.C;
        calculated.push('angle B');
      } else if (angles.C === null) {
        parameters.angleC = 180 - angles.A - angles.B;
        calculated.push('angle C');
      }
    }

    // Extract sides
    const sides = ParameterExtractor.extractSides(text);
    if (sides.a !== null) {
      parameters.sideA = sides.a;
      detected.push('side a');
    }
    if (sides.b !== null) {
      parameters.sideB = sides.b;
      detected.push('side b');
    }
    if (sides.c !== null) {
      parameters.sideC = sides.c;
      detected.push('side c');
    }

    // Validate - we need at least 2 angles to draw a triangle
    angleCount = [parameters.angleA, parameters.angleB, parameters.angleC].filter(
      (a) => a != null
    ).length;
    const sideCount = [parameters.sideA, parameters.sideB, parameters.sideC].filter(
      (s) => s != null
    ).length;

    // Need at least 2 angles (third can be calculated) or 3 sides
    const hasEnoughInfo = angleCount >= 2 || sideCount >= 3;

    if (!hasEnoughInfo) {
      return {
        needsDiagram: false,
        reason: 'Not enough parameters to draw triangle',
        detected,
        parameters
      };
    }

    return {
      needsDiagram: true,
      type: 'triangle',
      parameters,
      detected,
      calculated
    };
  }
}
