/**
 * Input Validator
 *
 * Validates and sanitizes inputs for GraphRAG operations.
 */
export class InputValidator {
  /**
   * Validate search query
   * @param {string} query - Search query
   * @throws {Error} If validation fails
   * @returns {string} Sanitized query
   */
  static validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query: must be non-empty string');
    }

    if (query.length > 10000) {
      throw new Error('Query too long: maximum 10,000 characters');
    }

    // Sanitize: trim whitespace
    return query.trim();
  }

  /**
   * Validate node content
   * @param {string} content - Node content
   * @throws {Error} If validation fails
   * @returns {string} Sanitized content
   */
  static validateNodeContent(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content: must be non-empty string');
    }

    if (content.length > 100000) {
      throw new Error('Content too long: maximum 100,000 characters');
    }

    // Sanitize: trim whitespace
    return content.trim();
  }

  /**
   * Validate embedding vector
   * @param {number[]} embedding - Embedding vector
   * @throws {Error} If validation fails
   * @returns {number[]} Validated embedding
   */
  static validateEmbedding(embedding) {
    if (!Array.isArray(embedding)) {
      throw new Error('Invalid embedding: must be array');
    }

    const validDimensions = [512, 1536, 3072];
    if (!validDimensions.includes(embedding.length)) {
      throw new Error(`Invalid embedding dimensions: must be one of ${validDimensions.join(', ')}`);
    }

    if (!embedding.every((n) => typeof n === 'number' && !isNaN(n))) {
      throw new Error('Invalid embedding: must contain only numbers');
    }

    return embedding;
  }

  /**
   * Validate material ID
   * @param {string} materialId - Material ID
   * @throws {Error} If validation fails
   * @returns {string} Sanitized material ID
   */
  static validateMaterialId(materialId) {
    if (!materialId || typeof materialId !== 'string') {
      throw new Error('Invalid material ID: must be non-empty string');
    }

    if (materialId.length > 255) {
      throw new Error('Material ID too long: maximum 255 characters');
    }

    return materialId.trim();
  }

  /**
   * Validate course ID
   * @param {string} courseId - Course ID
   * @throws {Error} If validation fails
   * @returns {string} Sanitized course ID
   */
  static validateCourseId(courseId) {
    if (!courseId || typeof courseId !== 'string') {
      throw new Error('Invalid course ID: must be non-empty string');
    }

    if (courseId.length > 255) {
      throw new Error('Course ID too long: maximum 255 characters');
    }

    return courseId.trim();
  }

  /**
   * Validate search options
   * @param {Object} options - Search options
   * @throws {Error} If validation fails
   * @returns {Object} Validated options
   */
  static validateSearchOptions(options = {}) {
    const validated = {};

    if (options.limit !== undefined) {
      const limit = parseInt(options.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new Error('Invalid limit: must be between 1 and 100');
      }
      validated.limit = limit;
    }

    if (options.similarityThreshold !== undefined) {
      const threshold = parseFloat(options.similarityThreshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        throw new Error('Invalid similarity threshold: must be between 0 and 1');
      }
      validated.similarityThreshold = threshold;
    }

    if (options.materialId !== undefined) {
      validated.materialId = this.validateMaterialId(options.materialId);
    }

    if (options.courseId !== undefined) {
      validated.courseId = this.validateCourseId(options.courseId);
    }

    return validated;
  }

  /**
   * Sanitize string for SQL (additional safety layer)
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return '';

    // Remove null bytes and control characters
    return (
      str
        .replace(/\0/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
    );
  }
}
