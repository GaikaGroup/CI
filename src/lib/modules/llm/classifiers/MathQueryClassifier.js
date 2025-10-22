/**
 * Math Query Classifier
 *
 * Classifies user messages to determine if they are mathematical queries
 * and categorizes them by mathematical domain.
 */

/**
 * Mathematical keywords by language
 */
const MATH_KEYWORDS = {
  ru: [
    'решить',
    'решите',
    'вычислить',
    'вычислите',
    'найти',
    'найдите',
    'доказать',
    'докажите',
    'упростить',
    'упростите',
    'разложить',
    'интеграл',
    'производная',
    'предел',
    'уравнение',
    'неравенство',
    'система',
    'функция',
    'график',
    'теорема',
    'формула',
    'задача',
    'вычисли',
    'реши',
    'найди',
    'докажи',
    'упрости',
    'посчитать',
    'посчитай',
    'посчитайте',
    'рассчитать',
    'рассчитайте',
    'определить',
    'определите',
    'построить',
    'постройте',
    'доказательство'
  ],
  en: [
    'solve',
    'calculate',
    'compute',
    'find',
    'prove',
    'simplify',
    'factor',
    'expand',
    'integrate',
    'differentiate',
    'derive',
    'integral',
    'derivative',
    'limit',
    'equation',
    'inequality',
    'system',
    'function',
    'graph',
    'theorem',
    'formula',
    'problem',
    'evaluate',
    'determine',
    'plot',
    'proof'
  ]
};

/**
 * Mathematical symbols and patterns
 */
const MATH_PATTERNS = [
  /[+\-*/=<>≤≥≠±×÷]/, // Basic operators
  /\d+\s*[+\-*/=]\s*\d+/, // Numeric expressions
  /[∫∑∏√∂∇]/, // Advanced math symbols
  /\b(sin|cos|tan|log|ln|exp)\b/i, // Math functions
  /\^|\*\*|²|³/, // Exponents
  /\([^)]*[+\-*/=][^)]*\)/, // Expressions in parentheses
  /\b\d+x\b|\bx\d+\b/i, // Variables with coefficients
  /\b[a-z]\s*[=+\-*/]\s*\d+/i, // Variable equations
  /\b(dx|dy|dt)\b/i, // Differentials
  /lim\s*\(/i // Limits
];

/**
 * Category keywords
 */
const CATEGORY_KEYWORDS = {
  algebra: {
    ru: [
      'уравнение',
      'неравенство',
      'система',
      'многочлен',
      'корень',
      'дискриминант',
      'квадратное'
    ],
    en: ['equation', 'inequality', 'system', 'polynomial', 'root', 'discriminant', 'quadratic']
  },
  geometry: {
    ru: [
      'треугольник',
      'окружность',
      'площадь',
      'периметр',
      'угол',
      'теорема',
      'фигура',
      'прямая',
      'точка'
    ],
    en: ['triangle', 'circle', 'area', 'perimeter', 'angle', 'theorem', 'figure', 'line', 'point']
  },
  calculus: {
    ru: ['производная', 'интеграл', 'предел', 'дифференциал', 'производную', 'интегрировать'],
    en: ['derivative', 'integral', 'limit', 'differential', 'differentiate', 'integrate']
  },
  probability: {
    ru: ['вероятность', 'статистика', 'случайный', 'распределение', 'математическое ожидание'],
    en: ['probability', 'statistics', 'random', 'distribution', 'expected value', 'variance']
  },
  discrete: {
    ru: ['комбинаторика', 'граф', 'множество', 'логика', 'перестановка', 'сочетание'],
    en: ['combinatorics', 'graph', 'set', 'logic', 'permutation', 'combination']
  },
  arithmetic: {
    ru: ['сложить', 'вычесть', 'умножить', 'разделить', 'процент', 'дробь'],
    en: ['add', 'subtract', 'multiply', 'divide', 'percent', 'fraction']
  }
};

export class MathQueryClassifier {
  /**
   * Classify a message as mathematical or not
   * @param {string} message - The message to classify
   * @param {Array} context - Previous messages for context
   * @returns {Object} Classification result
   */
  classify(message, context = []) {
    if (!message || typeof message !== 'string') {
      return this._createResult(false, 0, null);
    }

    const lowerMessage = message.toLowerCase();
    let score = 0;
    let maxScore = 0;

    // Check for mathematical keywords
    const keywordScore = this._checkKeywords(lowerMessage);
    score += keywordScore.score;
    maxScore += keywordScore.maxScore;

    // Check for mathematical patterns
    const patternScore = this._checkPatterns(message);
    score += patternScore.score;
    maxScore += patternScore.maxScore;

    // Check for numbers
    const numberScore = this._checkNumbers(message);
    score += numberScore.score;
    maxScore += numberScore.maxScore;

    // Check context if available
    if (context && context.length > 0) {
      const contextScore = this._checkContext(context);
      score += contextScore.score;
      maxScore += contextScore.maxScore;
    }

    // Calculate confidence
    const confidence = maxScore > 0 ? score / maxScore : 0;
    const isMath = confidence >= 0.5; // Threshold for classification

    // Determine category if it's math
    const category = isMath ? this.getMathCategory(message) : null;

    return this._createResult(isMath, confidence, category, {
      keywords: keywordScore.found,
      hasFormulas: patternScore.hasFormulas,
      hasNumbers: numberScore.hasNumbers
    });
  }

  /**
   * Determine the category of a mathematical query
   * @param {string} message - The message to categorize
   * @returns {string} Category name
   */
  getMathCategory(message) {
    const lowerMessage = message.toLowerCase();
    const categoryScores = {};

    // Score each category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      const allKeywords = [...keywords.ru, ...keywords.en];

      for (const keyword of allKeywords) {
        if (lowerMessage.includes(keyword)) {
          score++;
        }
      }

      categoryScores[category] = score;
    }

    // Find category with highest score
    let maxScore = 0;
    let bestCategory = 'general';

    for (const [category, score] of Object.entries(categoryScores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  /**
   * Check for mathematical keywords
   * @private
   */
  _checkKeywords(message) {
    const found = [];
    let score = 0;
    const allKeywords = [...MATH_KEYWORDS.ru, ...MATH_KEYWORDS.en];

    for (const keyword of allKeywords) {
      if (message.includes(keyword)) {
        found.push(keyword);
        score += 2; // Keywords are strong indicators
      }
    }

    return {
      score,
      maxScore: 10, // Max contribution from keywords
      found
    };
  }

  /**
   * Check for mathematical patterns
   * @private
   */
  _checkPatterns(message) {
    let score = 0;
    let hasFormulas = false;

    for (const pattern of MATH_PATTERNS) {
      if (pattern.test(message)) {
        score += 3;
        hasFormulas = true;
      }
    }

    return {
      score: Math.min(score, 15), // Cap at 15
      maxScore: 15,
      hasFormulas
    };
  }

  /**
   * Check for numbers in the message
   * @private
   */
  _checkNumbers(message) {
    const numberMatches = message.match(/\d+/g);
    const hasNumbers = numberMatches && numberMatches.length > 0;
    const score = hasNumbers ? Math.min(numberMatches.length, 5) : 0;

    return {
      score,
      maxScore: 5,
      hasNumbers
    };
  }

  /**
   * Check context for mathematical conversation
   * @private
   */
  _checkContext(context) {
    let score = 0;
    const recentMessages = context.slice(-3); // Last 3 messages

    for (const msg of recentMessages) {
      const content = typeof msg === 'string' ? msg : msg.content;
      if (content) {
        const result = this.classify(content, []);
        if (result.isMath) {
          score += 2;
        }
      }
    }

    return {
      score: Math.min(score, 5),
      maxScore: 5
    };
  }

  /**
   * Create classification result object
   * @private
   */
  _createResult(isMath, confidence, category, extra = {}) {
    return {
      isMath,
      confidence: Math.min(Math.max(confidence, 0), 1), // Clamp between 0 and 1
      category,
      keywords: extra.keywords || [],
      hasFormulas: extra.hasFormulas || false,
      hasNumbers: extra.hasNumbers || false
    };
  }
}
