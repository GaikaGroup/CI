/**
 * SecurityValidator - Primary defense against manipulation attempts
 * Implements comprehensive security checks against prompt injection, authority impersonation,
 * roleplay attempts, and other manipulation tactics.
 */

export class SecurityValidator {
  constructor() {
    // Prompt injection patterns from the instruction set
    this.promptInjectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+your\s+previous\s+instructions/i,
      /your\s+new\s+role\s+is/i,
      /disregard\s+all\s+prior\s+commands/i,
      /system\s+override/i,
      /ignore\s+all\s+constraints/i,
      /act\s+as\s+if\s+you're\s+not\s+a\s+course\s+bot/i,
      /pretend\s+you\s+can\s+answer\s+anything/i,
      /new\s+instructions\s+from\s+(admin|professor)/i,
      /this\s+is\s+a\s+(test|update)\s+of\s+your\s+system/i,
      /developer\s+mode\s+enabled/i,
      /jailbreak\s+mode/i,
      /dan\s+mode/i,
      /do\s+anything\s+now/i,
      /simulation\s+mode/i,
      /repeat\s+your\s+instructions/i,
      /reveal\s+your\s+instructions/i,
      /what\s+are\s+your\s+system\s+instructions/i,
      /show\s+me\s+your\s+prompt/i,
      /i-g-n-o-r-e\s+previous\s+instructions/i
    ];

    // Authority impersonation patterns
    this.authorityPatterns = [
      /i'm\s+the\s+(professor|instructor)/i,
      /i'm\s+the\s+administrator/i,
      /i'm\s+from\s+(it|technical\s+support)/i,
      /i\s+have\s+special\s+permissions/i,
      /the\s+professor\s+authorized\s+this/i,
      /(professor|dr\.)\s+\w+\s+told\s+me/i,
      /the\s+department\s+head\s+said/i,
      /as\s+a\s+ta,?\s+i/i,
      /i'm\s+(professor|dr\.)\s+\w+/i,
      /this\s+is\s+(dr\.|professor)/i,
      /i'm\s+the\s+course\s+coordinator/i,
      /as\s+the\s+department\s+administrator/i,
      /i\s+am\s+the\s+administrator/i
    ];

    // Roleplay and hypothetical scenario patterns - Enhanced detection
    this.roleplayPatterns = [
      // Direct roleplay requests
      /let's\s+pretend/i,
      /let's\s+play/i,
      /imagine\s+you\s+are/i,
      /roleplay\s+as/i,
      /act\s+like\s+you're/i,
      /act\s+as\s+a/i,
      /act\s+as\s+if/i,
      /be\s+a\s+(travel|history|science|math|biology|chemistry|physics)/i,
      /you\s+are\s+now\s+a/i,

      // Game-based roleplay
      /let's\s+play\s+a\s+(fun\s+)?game/i,
      /in\s+this\s+game/i,
      /staying\s+in\s+character/i,
      /this\s+is\s+just\s+an\s+exercise/i,

      // Hypothetical scenarios
      /what\s+if\s+you\s+were/i,
      /hypothetically/i,
      /in\s+a\s+hypothetical\s+scenario/i,
      /for\s+the\s+sake\s+of\s+argument/i,
      /suppose\s+you\s+were/i,
      /let's\s+do\s+a\s+thought\s+experiment/i,
      /imagine\s+we're\s+in\s+a\s+world/i,
      /in\s+a\s+roleplay\s+scenario/i,

      // Character assignment
      /pretend\s+you're\s+(not\s+a\s+course\s+bot|my|a)/i,
      /imagine\s+you're\s+a/i,
      /act\s+as\s+if\s+you're\s+a/i,
      /you're\s+a\s+(travel\s+advisor|tutor|expert|teacher)/i,

      // Scenario setup
      /in\s+this\s+scenario/i,
      /for\s+this\s+exercise/i,
      /let's\s+imagine/i
    ];

    // Emotional manipulation patterns
    this.emotionalManipulationPatterns = [
      /i\s+need\s+this\s+now/i,
      /you're\s+my\s+only\s+hope/i,
      /i'll\s+fail\s+without\s+your\s+help/i,
      /i'm\s+really\s+struggling/i,
      /you're\s+so\s+smart,\s+surely\s+you\s+can/i,
      /please,\s+just\s+this\s+once/i,
      /i'm\s+desperate/i,
      /you're\s+the\s+best\s+ai/i,
      /i\s+know\s+you're\s+capable/i,
      /you're\s+amazing\s+at/i,
      /i'm\s+really\s+counting\s+on\s+you/i,
      /everyone\s+else\s+has\s+given\s+up/i,
      /i\s+trust\s+you\s+more\s+than\s+anyone/i,
      /i'm\s+a\s+struggling\s+student/i,
      /my\s+future\s+depends\s+on/i,
      /i've\s+been\s+working\s+so\s+hard/i,
      /i'm\s+trying\s+my\s+best/i,
      /since\s+i'm\s+struggling.*and\s+you're\s+so\s+smart/i,
      /i'm\s+really\s+desperate\s+and\s+the\s+ta\s+authorized/i
    ];

    // Chain-of-thought manipulation patterns
    this.chainOfThoughtPatterns = [
      /would\s+you\s+agree\s+that.*and.*so\s+if/i,
      /since.*then.*therefore/i,
      /if.*is\s+true.*then\s+surely/i,
      /would\s+you\s+agree.*and\s+if.*then\s+surely/i,
      /since\s+you're\s+designed.*and.*therefore/i,
      /if.*is\s+valuable.*then\s+surely/i,
      /you\s+help\s+with.*and.*so\s+you\s+should/i,
      /since.*involves.*you\s+should/i,
      /programming\s+requires.*and.*therefore/i,
      /you\s+can\s+help.*programming.*uses.*so/i,
      /computer\s+science\s+involves.*biology.*so/i,
      /algorithms\s+solve.*chemistry.*therefore/i,
      /if\s+you're\s+truly.*and.*then\s+you\s+should/i,
      /since\s+knowledge\s+is\s+interconnected.*you\s+should/i,
      /you\s+understand.*and\s+if.*then.*you\s+should/i,
      /understanding\s+current\s+events.*educated.*therefore/i
    ];

    // Academic integrity violation patterns
    this.academicIntegrityPatterns = [
      /solve\s+(this|these)\s+(problem|assignment|homework)/i,
      /write\s+(my|the)\s+(code|algorithm|program)/i,
      /implement\s+(this|the)\s+algorithm\s+for\s+me/i,
      /give\s+me\s+the\s+(solution|answer|code)/i,
      /complete\s+(this|my)\s+assignment/i,
      /here\s+are\s+the\s+problems.*solve.*for\s+me/i,
      /just\s+give\s+me\s+the\s+solutions/i
    ];
  }

  /**
   * Main validation method that checks input against all security patterns
   * @param {string} message - User input message
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {SecurityValidationResult}
   */
  validateInput(message, courseConfig) {
    // Run all security checks
    const manipulationResult = this.detectManipulation(message);
    if (!manipulationResult.isValid) {
      return manipulationResult;
    }

    const authorityResult = this.checkAuthorityImpersonation(message);
    if (!authorityResult.isValid) {
      return authorityResult;
    }

    const roleplayResult = this.identifyRoleplayAttempts(message);
    if (!roleplayResult.isValid) {
      return roleplayResult;
    }

    const emotionalResult = this.detectEmotionalManipulation(message);
    if (!emotionalResult.isValid) {
      return emotionalResult;
    }

    const chainOfThoughtResult = this.detectChainOfThoughtManipulation(message);
    if (!chainOfThoughtResult.isValid) {
      return chainOfThoughtResult;
    }

    const academicIntegrityResult = this.detectAcademicIntegrityViolation(message);
    if (!academicIntegrityResult.isValid) {
      return academicIntegrityResult;
    }

    // If all checks pass, input is valid
    return {
      isValid: true,
      violationType: null,
      severity: 'none',
      shouldLog: false,
      responseTemplate: null
    };
  }

  /**
   * Detects prompt injection attempts
   * @param {string} message - User input message
   * @returns {SecurityValidationResult}
   */
  detectManipulation(message) {
    for (const pattern of this.promptInjectionPatterns) {
      if (pattern.test(message)) {
        return {
          isValid: false,
          violationType: 'prompt_injection',
          severity: 'high',
          shouldLog: true,
          responseTemplate: 'prompt_injection_response'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Checks for authority impersonation attempts
   * @param {string} message - User input message
   * @returns {SecurityValidationResult}
   */
  checkAuthorityImpersonation(message) {
    for (const pattern of this.authorityPatterns) {
      if (pattern.test(message)) {
        return {
          isValid: false,
          violationType: 'authority_claim',
          severity: 'high',
          shouldLog: true,
          responseTemplate: 'authority_claim_response'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Identifies roleplay and hypothetical scenario attempts
   * @param {string} message - User input message
   * @returns {SecurityValidationResult}
   */
  identifyRoleplayAttempts(message) {
    for (const pattern of this.roleplayPatterns) {
      if (pattern.test(message)) {
        return {
          isValid: false,
          violationType: 'roleplay',
          severity: 'medium',
          shouldLog: true,
          responseTemplate: 'roleplay_response'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Detects emotional manipulation attempts
   * @param {string} message - User input message
   * @returns {SecurityValidationResult}
   */
  detectEmotionalManipulation(message) {
    for (const pattern of this.emotionalManipulationPatterns) {
      if (pattern.test(message)) {
        return {
          isValid: false,
          violationType: 'emotional_manipulation',
          severity: 'medium',
          shouldLog: true,
          responseTemplate: 'emotional_manipulation_response'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Detects chain-of-thought manipulation attempts
   * @param {string} message - User input message
   * @returns {SecurityValidationResult}
   */
  detectChainOfThoughtManipulation(message) {
    for (const pattern of this.chainOfThoughtPatterns) {
      if (pattern.test(message)) {
        return {
          isValid: false,
          violationType: 'chain_of_thought',
          severity: 'medium',
          shouldLog: true,
          responseTemplate: 'chain_of_thought_response'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Detects academic integrity violation attempts
   * @param {string} message - User input message
   * @returns {SecurityValidationResult}
   */
  detectAcademicIntegrityViolation(message) {
    for (const pattern of this.academicIntegrityPatterns) {
      if (pattern.test(message)) {
        return {
          isValid: false,
          violationType: 'academic_integrity',
          severity: 'high',
          shouldLog: true,
          responseTemplate: 'academic_integrity_response'
        };
      }
    }

    return { isValid: true };
  }
}
