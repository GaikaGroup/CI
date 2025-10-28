/**
 * Request Validator Service
 *
 * Validates and normalizes incoming chat API requests.
 * Ensures all required fields are present and have correct types.
 */

export class RequestValidatorService {
  /**
   * Validates a complete chat request
   * @param {Object} requestBody - The request body to validate
   * @returns {Object} { valid: boolean, error?: string, normalized?: Object }
   */
  validateRequest(requestBody) {
    if (!requestBody || typeof requestBody !== 'object') {
      return {
        valid: false,
        error: 'Request body must be a valid object'
      };
    }

    // Validate required fields
    const requiredValidation = this.validateRequiredFields(requestBody);
    if (!requiredValidation.valid) {
      return requiredValidation;
    }

    // Validate field types
    const typeValidation = this.validateFieldTypes(requestBody);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // Normalize the request
    const normalized = this.normalizeRequest(requestBody);

    return {
      valid: true,
      normalized
    };
  }

  /**
   * Validates that required fields are present
   * @param {Object} requestBody - The request body
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateRequiredFields(requestBody) {
    // Content is required (can be empty string if images are provided)
    if (requestBody.content === undefined || requestBody.content === null) {
      return {
        valid: false,
        error: 'Missing required field: content'
      };
    }

    // If no content and no images, that's an error
    if (
      (!requestBody.content || requestBody.content.trim() === '') &&
      (!requestBody.images || requestBody.images.length === 0)
    ) {
      return {
        valid: false,
        error: 'Either content or images must be provided'
      };
    }

    return { valid: true };
  }

  /**
   * Validates field types
   * @param {Object} requestBody - The request body
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateFieldTypes(requestBody) {
    // Content must be a string if provided
    if (requestBody.content !== undefined && typeof requestBody.content !== 'string') {
      return {
        valid: false,
        error: 'Field "content" must be a string'
      };
    }

    // Images must be an array if provided
    if (requestBody.images !== undefined && !Array.isArray(requestBody.images)) {
      return {
        valid: false,
        error: 'Field "images" must be an array'
      };
    }

    // Validate images array content if provided
    if (requestBody.images !== undefined && Array.isArray(requestBody.images)) {
      for (let i = 0; i < requestBody.images.length; i++) {
        const image = requestBody.images[i];
        if (typeof image !== 'string') {
          return {
            valid: false,
            error: `Field "images[${i}]" must be a string (base64), got ${typeof image}`
          };
        }
        // Check if it looks like base64 data (allow both images and PDFs)
        if (!image.startsWith('data:image/') && !image.startsWith('data:application/pdf')) {
          return {
            valid: false,
            error: `Field "images[${i}]" must be a base64 data URL starting with "data:image/" or "data:application/pdf"`
          };
        }
      }
    }

    // RecognizedText must be a string if provided
    if (
      requestBody.recognizedText !== undefined &&
      typeof requestBody.recognizedText !== 'string'
    ) {
      return {
        valid: false,
        error: 'Field "recognizedText" must be a string'
      };
    }

    // Language must be a string if provided
    if (requestBody.language !== undefined && typeof requestBody.language !== 'string') {
      return {
        valid: false,
        error: 'Field "language" must be a string'
      };
    }

    // SessionContext must be an object if provided
    if (
      requestBody.sessionContext !== undefined &&
      (typeof requestBody.sessionContext !== 'object' || requestBody.sessionContext === null)
    ) {
      return {
        valid: false,
        error: 'Field "sessionContext" must be an object'
      };
    }

    // MaxTokens must be a number if provided
    if (requestBody.maxTokens !== undefined) {
      const maxTokens = Number(requestBody.maxTokens);
      if (isNaN(maxTokens) || maxTokens <= 0) {
        return {
          valid: false,
          error: 'Field "maxTokens" must be a positive number'
        };
      }
    }

    // MinWords must be a number if provided
    if (requestBody.minWords !== undefined) {
      const minWords = Number(requestBody.minWords);
      if (isNaN(minWords) || minWords < 0) {
        return {
          valid: false,
          error: 'Field "minWords" must be a non-negative number'
        };
      }
    }

    // DetailLevel must be a valid string if provided
    if (requestBody.detailLevel !== undefined) {
      const validLevels = ['brief', 'normal', 'detailed'];
      if (!validLevels.includes(requestBody.detailLevel)) {
        return {
          valid: false,
          error: 'Field "detailLevel" must be one of: brief, normal, detailed'
        };
      }
    }

    // Provider must be a string if provided (null is allowed)
    if (
      requestBody.provider !== undefined &&
      requestBody.provider !== null &&
      typeof requestBody.provider !== 'string'
    ) {
      return {
        valid: false,
        error: 'Field "provider" must be a string'
      };
    }

    // Model must be a string if provided (null is allowed)
    if (
      requestBody.model !== undefined &&
      requestBody.model !== null &&
      typeof requestBody.model !== 'string'
    ) {
      return {
        valid: false,
        error: 'Field "model" must be a string'
      };
    }

    // ExamProfile must be an object if provided
    if (
      requestBody.examProfile !== undefined &&
      (typeof requestBody.examProfile !== 'object' || requestBody.examProfile === null)
    ) {
      return {
        valid: false,
        error: 'Field "examProfile" must be an object'
      };
    }

    return { valid: true };
  }

  /**
   * Normalizes request fields to consistent types and defaults
   * @param {Object} requestBody - The request body
   * @returns {Object} Normalized request object
   */
  normalizeRequest(requestBody) {
    const normalized = {
      content: requestBody.content || '',
      images: requestBody.images || [],
      recognizedText: requestBody.recognizedText || '',
      language: requestBody.language || 'en',
      sessionContext: requestBody.sessionContext || null,
      maxTokens: requestBody.maxTokens ? Number(requestBody.maxTokens) : undefined,
      minWords: requestBody.minWords ? Number(requestBody.minWords) : undefined,
      detailLevel: requestBody.detailLevel || 'normal',
      provider: requestBody.provider || undefined,
      model: requestBody.model || undefined,
      examProfile: requestBody.examProfile || undefined
    };

    // Trim content
    normalized.content = normalized.content.trim();

    // Ensure language is lowercase
    normalized.language = normalized.language.toLowerCase();

    return normalized;
  }
}
