/**
 * Parameter Extractor
 * Extracts numerical parameters from text
 */

export class ParameterExtractor {
  /**
   * Extract triangle angles from text
   * @param {string} text - Normalized text
   * @returns {Object} Angles {A, B, C} or null
   */
  static extractAngles(text) {
    const angles = { A: null, B: null, C: null };

    // Patterns for angle extraction
    const patterns = [
      // "угол A = 50", "угол A равен 50", "angle A = 50", "angle A equals 50"
      /(?:угол|angle)\s*([abc])\s*(?:=|равен|равна|equals?)\s*(\d+(?:\.\d+)?)/gi,
      // "∠A = 50"
      /∠\s*([abc])\s*=\s*(\d+(?:\.\d+)?)/gi,
      // "угол при вершине A равен 50 градусам"
      /(?:угол|angle)\s*(?:при\s*вершине|at\s*vertex)?\s*([abc])\s*(?:равен|равна|is|equals?)\s*(\d+(?:\.\d+)?)\s*(?:градус|degrees?|°)?/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const vertex = match[1].toUpperCase();
        const value = parseFloat(match[2]);

        if (vertex === 'A' && angles.A === null) angles.A = value;
        if (vertex === 'B' && angles.B === null) angles.B = value;
        if (vertex === 'C' && angles.C === null) angles.C = value;
      }
    }

    return angles;
  }

  /**
   * Extract triangle sides from text
   * @param {string} text - Normalized text
   * @returns {Object} Sides {a, b, c} or null
   */
  static extractSides(text) {
    const sides = { a: null, b: null, c: null };

    // Patterns for side extraction
    const patterns = [
      // "сторона a = 5", "side a = 5"
      /сторона\s*([abc])\s*(?:=|равна|equals?)\s*(\d+(?:\.\d+)?)/gi,
      // "сторона AB = 5"
      /сторона\s*([abc][abc])\s*(?:=|равна)\s*(\d+(?:\.\d+)?)/gi,
      // "AB = 5 см"
      /([abc][abc])\s*=\s*(\d+(?:\.\d+)?)\s*(?:см|м|cm|m)?/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const side = match[1].toLowerCase();
        const value = parseFloat(match[2]);

        // Map AB -> c, BC -> a, AC -> b
        if (side === 'ab' || side === 'ba') {
          if (sides.c === null) sides.c = value;
        } else if (side === 'bc' || side === 'cb') {
          if (sides.a === null) sides.a = value;
        } else if (side === 'ac' || side === 'ca') {
          if (sides.b === null) sides.b = value;
        } else if (side === 'a' && sides.a === null) {
          sides.a = value;
        } else if (side === 'b' && sides.b === null) {
          sides.b = value;
        } else if (side === 'c' && sides.c === null) {
          sides.c = value;
        }
      }
    }

    return sides;
  }

  /**
   * Extract circle parameters from text
   * @param {string} text - Normalized text
   * @returns {Object} Circle parameters
   */
  static extractCircleParams(text) {
    const params = { radius: null, diameter: null, center: null };

    // Extract radius
    const radiusPattern = /радиус\s*(?:=|равен)?\s*(\d+(?:\.\d+)?)/gi;
    const radiusMatch = radiusPattern.exec(text);
    if (radiusMatch) {
      params.radius = parseFloat(radiusMatch[1]);
    }

    // Extract diameter
    const diameterPattern = /диаметр\s*(?:=|равен)?\s*(\d+(?:\.\d+)?)/gi;
    const diameterMatch = diameterPattern.exec(text);
    if (diameterMatch) {
      params.diameter = parseFloat(diameterMatch[1]);
      if (params.radius === null) {
        params.radius = params.diameter / 2;
      }
    }

    return params;
  }

  /**
   * Extract quadrilateral parameters from text
   * @param {string} text - Normalized text
   * @returns {Object} Quadrilateral parameters
   */
  static extractQuadrilateralParams(text) {
    const params = { sides: [], angles: [], type: null };

    // Detect specific type
    if (text.includes('квадрат') || text.includes('square')) {
      params.type = 'square';
    } else if (text.includes('прямоугольник') || text.includes('rectangle')) {
      params.type = 'rectangle';
    } else if (text.includes('параллелограмм') || text.includes('parallelogram')) {
      params.type = 'parallelogram';
    } else if (text.includes('трапеция') || text.includes('trapezoid')) {
      params.type = 'trapezoid';
    }

    // Extract dimensions
    const sidePattern = /сторона\s*(?:=|равна)?\s*(\d+(?:\.\d+)?)/gi;
    let match;
    while ((match = sidePattern.exec(text)) !== null) {
      params.sides.push(parseFloat(match[1]));
    }

    return params;
  }
}
