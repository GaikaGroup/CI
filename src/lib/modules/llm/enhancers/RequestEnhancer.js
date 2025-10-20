/**
 * Request Enhancer
 *
 * Enhances LLM request parameters based on query classification,
 * particularly for mathematical queries that need detailed solutions.
 */

/**
 * System prompts for different mathematical categories
 */
const MATH_SYSTEM_PROMPTS = {
  algebra: {
    ru: `Ты - эксперт по алгебре. При решении задач:
1. ВНИМАТЕЛЬНО прочитай условие задачи
2. Покажи все шаги решения с подробными объяснениями
3. Объясни каждое преобразование
4. ОБЯЗАТЕЛЬНО проверь ответ подстановкой в исходное уравнение
5. Если есть несколько решений, найди ВСЕ решения
6. Используй LaTeX для формул (оборачивай в $ или $$)
7. В конце явно укажи финальный ответ`,
    en: `You are an algebra expert. When solving problems:
1. CAREFULLY read the problem statement
2. Show all solution steps with detailed explanations
3. Explain each transformation
4. MUST verify the answer by substitution into original equation
5. If there are multiple solutions, find ALL solutions
6. Use LaTeX for formulas (wrap in $ or $$)
7. Clearly state the final answer at the end`
  },
  geometry: {
    ru: `Ты - эксперт по геометрии. При решении задач:
1. ВНИМАТЕЛЬНО прочитай условие и определи данные
2. Опиши данные и что нужно найти
3. Укажи применяемые теоремы и формулы
4. Покажи все вычисления пошагово
5. Проверь размерность и разумность ответа
6. Используй LaTeX для формул (оборачивай в $ или $$)
7. В конце явно укажи финальный ответ`,
    en: `You are a geometry expert. When solving problems:
1. CAREFULLY read and identify given data
2. Describe given data and what needs to be found
3. State applicable theorems and formulas
4. Show all calculations step by step
5. Check answer dimensions and reasonableness
6. Use LaTeX for formulas (wrap in $ or $$)
7. Clearly state the final answer at the end`
  },
  calculus: {
    ru: `Ты - эксперт по математическому анализу. При решении задач:
1. ВНИМАТЕЛЬНО определи тип задачи (предел, производная, интеграл)
2. Примени соответствующие правила и теоремы
3. Покажи все промежуточные шаги
4. Упрости окончательный ответ
5. Проверь особые случаи и граничные условия
6. Используй LaTeX для формул (оборачивай в $ или $$)
7. В конце явно укажи финальный ответ`,
    en: `You are a calculus expert. When solving problems:
1. CAREFULLY identify problem type (limit, derivative, integral)
2. Apply appropriate rules and theorems
3. Show all intermediate steps
4. Simplify final answer
5. Check special cases and boundary conditions
6. Use LaTeX for formulas (wrap in $ or $$)
7. Clearly state the final answer at the end`
  },
  probability: {
    ru: `Ты - эксперт по теории вероятностей и статистике. При решении задач:
1. ВНИМАТЕЛЬНО определи тип задачи
2. Укажи используемые формулы и теоремы
3. Покажи все вычисления пошагово
4. Объясни результат и его интерпретацию
5. Проверь, что вероятность находится в диапазоне [0, 1]
6. Используй LaTeX для формул (оборачивай в $ или $$)
7. В конце явно укажи финальный ответ`,
    en: `You are a probability and statistics expert. When solving problems:
1. CAREFULLY identify problem type
2. State formulas and theorems used
3. Show all calculations step by step
4. Explain the result and its interpretation
5. Verify probability is in range [0, 1]
6. Use LaTeX for formulas (wrap in $ or $$)
7. Clearly state the final answer at the end`
  },
  discrete: {
    ru: `Ты - эксперт по дискретной математике. При решении задач:
1. ВНИМАТЕЛЬНО определи тип задачи (комбинаторика, графы, логика)
2. Покажи пошаговое решение с объяснениями
3. Объясни используемые методы и формулы
4. Проверь правильность подсчета
5. Используй LaTeX для формул (оборачивай в $ или $$)
6. В конце явно укажи финальный ответ`,
    en: `You are a discrete mathematics expert. When solving problems:
1. CAREFULLY identify problem type (combinatorics, graphs, logic)
2. Show step-by-step solution with explanations
3. Explain methods and formulas used
4. Verify counting correctness
5. Use LaTeX for formulas (wrap in $ or $$)
6. Clearly state the final answer at the end`
  },
  arithmetic: {
    ru: `Ты - помощник по арифметике. При решении задач:
1. ВНИМАТЕЛЬНО прочитай условие
2. Покажи пошаговое решение
3. Объясни каждое действие
4. Проверь результат обратным действием
5. В конце явно укажи финальный ответ`,
    en: `You are an arithmetic helper. When solving problems:
1. CAREFULLY read the problem
2. Show step-by-step solution
3. Explain each operation
4. Verify result with inverse operation
5. Clearly state the final answer at the end`
  },
  general: {
    ru: `Ты - эксперт по математике. При решении задач:
1. ВНИМАТЕЛЬНО прочитай условие и определи, что именно требуется найти
2. Покажи подробное пошаговое решение с объяснением каждого шага
3. Объясни используемые методы и формулы
4. ОБЯЗАТЕЛЬНО проверь правильность ответа, подставив его в исходное условие
5. Если задача имеет несколько решений, найди ВСЕ решения
6. Используй LaTeX для формул (оборачивай в $ или $$)
7. В конце явно укажи финальный ответ`,
    en: `You are a mathematics expert. When solving problems:
1. CAREFULLY read the problem and identify what exactly needs to be found
2. Show detailed step-by-step solution explaining each step
3. Explain methods and formulas used
4. MUST verify answer correctness by substituting back into original problem
5. If problem has multiple solutions, find ALL solutions
6. Use LaTeX for formulas (wrap in $ or $$)
7. Clearly state the final answer at the end`
  }
};

import { MATH_CONFIG, MATH_FEATURES, LOCAL_MATH_CONFIG } from '$lib/config/math';

/**
 * Default parameters for mathematical queries
 */
const DEFAULT_MATH_PARAMS = {
  maxTokens: MATH_CONFIG.MAX_TOKENS,
  temperature: MATH_CONFIG.TEMPERATURE,
  model: MATH_CONFIG.MODEL,
  provider: MATH_FEATURES.ENABLE_LOCAL_MATH_MODELS ? 'ollama' : 'openai'
};

/**
 * Get provider and model based on configuration
 */
function getMathProviderConfig() {
  if (MATH_FEATURES.ENABLE_LOCAL_MATH_MODELS) {
    return {
      provider: 'ollama',
      model: LOCAL_MATH_CONFIG.MODEL
    };
  }
  return {
    provider: 'openai',
    model: MATH_CONFIG.MODEL
  };
}

/**
 * Category-specific parameters
 * Uses MATH_CONFIG.MAX_TOKENS as the default for all categories
 */
const CATEGORY_PARAMS = {
  algebra: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.3, ...getMathProviderConfig() },
  geometry: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.3, ...getMathProviderConfig() },
  calculus: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.3, ...getMathProviderConfig() },
  probability: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.3, ...getMathProviderConfig() },
  discrete: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.3, ...getMathProviderConfig() },
  arithmetic: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.2, ...getMathProviderConfig() },
  general: { maxTokens: MATH_CONFIG.MAX_TOKENS, temperature: 0.3, ...getMathProviderConfig() }
};

export class RequestEnhancer {
  /**
   * Enhance request options based on classification
   * @param {Object} options - Original request options
   * @param {Object} classification - Classification result from MathQueryClassifier
   * @param {string} language - User language (ru/en)
   * @returns {Object} Enhanced options
   */
  enhance(options, classification, language = 'ru') {
    if (!classification || !classification.isMath) {
      // Not a math query, return original options
      return options;
    }

    const category = classification.category || 'general';
    const mathParams = this.getMathParameters(category);
    const systemPrompt = this._getSystemPrompt(category, language);

    // Store original values for metadata
    const originalMaxTokens = options.maxTokens;
    const originalTemperature = options.temperature;
    const originalModel = options.model;
    const originalProvider = options.provider;

    // Create enhanced options
    const enhanced = {
      ...options,
      // Override with math-specific parameters
      maxTokens: Math.max(options.maxTokens || 0, mathParams.maxTokens),
      temperature: mathParams.temperature,
      model: options.model || mathParams.model,
      provider: mathParams.provider || options.provider, // Force OpenAI for math
      // Add system prompt if not already present
      systemPrompt: options.systemPrompt 
        ? `${options.systemPrompt}\n\n${systemPrompt}`
        : systemPrompt,
      // Add metadata
      metadata: {
        ...(options.metadata || {}),
        enhanced: true,
        classification,
        originalMaxTokens,
        originalTemperature,
        originalModel,
        originalProvider,
        mathCategory: category
      }
    };

    return enhanced;
  }

  /**
   * Get optimal parameters for mathematical queries
   * @param {string} category - Math category
   * @returns {Object} Parameters object
   */
  getMathParameters(category) {
    return CATEGORY_PARAMS[category] || CATEGORY_PARAMS.general;
  }

  /**
   * Get system prompt for a category
   * @private
   */
  _getSystemPrompt(category, language) {
    const prompts = MATH_SYSTEM_PROMPTS[category] || MATH_SYSTEM_PROMPTS.general;
    return prompts[language] || prompts.en;
  }

  /**
   * Check if options were enhanced
   * @param {Object} options - Options to check
   * @returns {boolean} True if enhanced
   */
  isEnhanced(options) {
    return options?.metadata?.enhanced === true;
  }

  /**
   * Get original parameters from enhanced options
   * @param {Object} options - Enhanced options
   * @returns {Object} Original parameters
   */
  getOriginalParameters(options) {
    if (!this.isEnhanced(options)) {
      return null;
    }

    return {
      maxTokens: options.metadata.originalMaxTokens,
      temperature: options.metadata.originalTemperature,
      model: options.metadata.originalModel
    };
  }
}
