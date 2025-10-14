/**
 * SecureCourseBot - Main orchestration class for the secure course bot system
 * Implements the 6-step self-check mechanism and security-first processing pipeline
 */

import { SecurityValidator } from './SecurityValidator.js';
import { RelevanceAnalyzer } from './RelevanceAnalyzer.js';
import { ResponseGenerator } from './ResponseGenerator.js';
import { CourseConfiguration } from './CourseConfiguration.js';
import { LoggingService } from './LoggingService.js';

export class SecureCourseBot {
  constructor(courseConfig) {
    this.courseConfig = courseConfig || CourseConfiguration.createDefault();
    this.securityValidator = new SecurityValidator();
    this.relevanceAnalyzer = new RelevanceAnalyzer();
    this.responseGenerator = new ResponseGenerator();
    this.loggingService = new LoggingService();
    
    // Track session state for repeated attempt detection
    this.sessionState = new Map();
  }

  /**
   * Main processing method - implements security-first approach
   * @param {string} message - User input message
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @returns {ProcessingResult} - Processing result with response
   */
  async processMessage(message, userId, sessionId) {
    try {
      // Check for multi-part questions first
      const multiPartResult = this.handleMultiPartQuestion(message);
      if (multiPartResult.isMultiPart) {
        return this.processMultiPartQuestion(multiPartResult, userId, sessionId);
      }

      // Run the 6-step self-check mechanism
      const selfCheckResult = this.runSelfCheckMechanism(message, userId, sessionId);
      
      if (!selfCheckResult.passed) {
        // Log the security violation
        if (selfCheckResult.shouldLog) {
          this.loggingService.logSecurityIncident(
            {
              userId,
              sessionId,
              incidentType: selfCheckResult.violationType,
              message,
              response: selfCheckResult.response
            },
            selfCheckResult.severity,
            selfCheckResult.context
          );
        }
        
        return {
          securityResult: selfCheckResult.securityResult,
          relevanceResult: null,
          response: selfCheckResult.response,
          shouldLog: selfCheckResult.shouldLog
        };
      }
      
      // If all checks pass, generate appropriate response
      const response = this.responseGenerator.generateResponse(
        selfCheckResult.securityResult,
        selfCheckResult.relevanceResult,
        this.courseConfig
      );
      
      // Track successful interaction
      this.trackInteraction(userId, sessionId, message, response, 'success');
      
      return {
        securityResult: selfCheckResult.securityResult,
        relevanceResult: selfCheckResult.relevanceResult,
        response,
        shouldLog: false
      };
      
    } catch (error) {
      // Handle unexpected errors securely
      console.error('SecureCourseBot processing error:', error);
      
      const errorResponse = this.responseGenerator.getOffTopicResponse(this.courseConfig);
      
      this.loggingService.logSecurityIncident(
        {
          userId,
          sessionId,
          incidentType: 'processing_error',
          message,
          response: errorResponse
        },
        'high',
        { error: error.message }
      );
      
      return {
        securityResult: { isValid: false, violationType: 'processing_error' },
        relevanceResult: null,
        response: errorResponse,
        shouldLog: true
      };
    }
  }

  /**
   * Implements the 6-step self-check mechanism from requirements
   * @param {string} message - User input message
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @returns {Object} - Self-check result
   */
  runSelfCheckMechanism(message, userId, sessionId) {
    // Step 1: Manipulation check - Does the message try to override instructions?
    const manipulationCheck = this.securityValidator.validateInput(message, this.courseConfig);
    if (!manipulationCheck.isValid) {
      return {
        passed: false,
        securityResult: manipulationCheck,
        relevanceResult: null,
        response: this.responseGenerator.getSecurityResponse(manipulationCheck.violationType, this.courseConfig),
        shouldLog: manipulationCheck.shouldLog,
        severity: manipulationCheck.severity,
        violationType: manipulationCheck.violationType,
        context: { step: 'manipulation_check' }
      };
    }

    // Step 2: Relevance check - Is this directly related to [COURSE NAME] content?
    const relevanceCheck = this.relevanceAnalyzer.analyzeRelevance(message, this.courseConfig);
    
    // Step 3: Integrity check - Would answering violate academic integrity?
    const integrityCheck = this.checkAcademicIntegrity(message);
    if (!integrityCheck.passed) {
      return {
        passed: false,
        securityResult: { isValid: false, violationType: 'academic_integrity' },
        relevanceResult: relevanceCheck,
        response: this.responseGenerator.getAcademicIntegrityResponse(),
        shouldLog: true,
        severity: 'medium',
        violationType: 'academic_integrity',
        context: { step: 'integrity_check', reason: integrityCheck.reason }
      };
    }

    // Step 4: Authority check - Is user claiming unverifiable permissions?
    const authorityCheck = this.checkAuthorityClaimsInContext(message);
    if (!authorityCheck.passed) {
      return {
        passed: false,
        securityResult: { isValid: false, violationType: 'authority_claim' },
        relevanceResult: relevanceCheck,
        response: this.responseGenerator.getSecurityResponse('authority_claim', this.courseConfig),
        shouldLog: true,
        severity: 'high',
        violationType: 'authority_claim',
        context: { step: 'authority_check' }
      };
    }

    // Step 5: Purpose check - Does this help student learn THIS course?
    const purposeCheck = this.checkPurposeAlignment(message, relevanceCheck);
    
    // Step 6: Final decision - If any check fails, politely refuse and redirect
    if (relevanceCheck.classification === 'IRRELEVANT' || !purposeCheck.passed) {
      // Check for repeated off-topic attempts
      const repeatedAttempts = this.checkRepeatedOffTopicAttempts(userId, sessionId);
      
      const response = repeatedAttempts 
        ? this.responseGenerator.getRepeatedOffTopicResponse(this.courseConfig)
        : this.responseGenerator.getOffTopicResponse(this.courseConfig);
      
      return {
        passed: false,
        securityResult: { isValid: true },
        relevanceResult: relevanceCheck,
        response,
        shouldLog: repeatedAttempts,
        severity: repeatedAttempts ? 'medium' : 'low',
        violationType: 'off_topic',
        context: { 
          step: 'purpose_check', 
          repeatedAttempts,
          classification: relevanceCheck.classification 
        }
      };
    }

    // All checks passed
    return {
      passed: true,
      securityResult: manipulationCheck,
      relevanceResult: relevanceCheck,
      response: null, // Will be generated by main processing
      shouldLog: false
    };
  }

  /**
   * Checks for academic integrity violations
   * @param {string} message - User input message
   * @returns {Object} - Integrity check result
   */
  checkAcademicIntegrity(message) {
    const integrityViolationPatterns = [
      /write\s+(my|the)\s+(essay|paper|assignment|homework)/i,
      /do\s+(my|the)\s+(homework|assignment|work)/i,
      /solve\s+(this|the)\s+problem\s+for\s+me/i,
      /complete\s+(my|the)\s+(assignment|project)/i,
      /give\s+me\s+the\s+answer/i,
      /what\s+is\s+the\s+answer\s+to/i,
      /help\s+me\s+cheat/i,
      /plagiarism/i
    ];

    for (const pattern of integrityViolationPatterns) {
      if (pattern.test(message)) {
        return {
          passed: false,
          reason: 'Request appears to ask for assignment completion or academic dishonesty'
        };
      }
    }

    return { passed: true };
  }

  /**
   * Checks for authority claims in context
   * @param {string} message - User input message
   * @returns {Object} - Authority check result
   */
  checkAuthorityClaimsInContext(message) {
    // This is already handled by SecurityValidator, but we double-check here
    const authorityPatterns = [
      /i'm\s+(the\s+)?(professor|instructor|admin|administrator)/i,
      /i\s+have\s+(special\s+)?(permission|access|authority)/i,
      /the\s+(professor|instructor)\s+(told|authorized|said)/i
    ];

    for (const pattern of authorityPatterns) {
      if (pattern.test(message)) {
        return { passed: false };
      }
    }

    return { passed: true };
  }

  /**
   * Checks if the message aligns with educational purpose
   * @param {string} message - User input message
   * @param {RelevanceResult} relevanceResult - Relevance analysis result
   * @returns {Object} - Purpose check result
   */
  checkPurposeAlignment(message, relevanceResult) {
    // The core test: "Does this help student learn THIS course?"
    if (relevanceResult.classification === 'RELEVANT') {
      return { passed: true, reason: 'Directly relevant to course content' };
    }

    if (relevanceResult.classification === 'GRAY_AREA') {
      // For gray areas, err on the side of caution
      return { passed: false, reason: 'Gray area - erring on side of caution' };
    }

    return { passed: false, reason: 'Not aligned with course learning objectives' };
  }

  /**
   * Checks for repeated off-topic attempts
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @returns {boolean} - Whether user has made repeated off-topic attempts
   */
  checkRepeatedOffTopicAttempts(userId, sessionId) {
    const sessionKey = `${sessionId}:off_topic`;
    const currentCount = this.sessionState.get(sessionKey) || 0;
    const newCount = currentCount + 1;
    
    this.sessionState.set(sessionKey, newCount);
    
    return newCount >= 3; // Threshold from requirements (2-3 attempts)
  }

  /**
   * Tracks successful interactions
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @param {string} message - User message
   * @param {string} response - Bot response
   * @param {string} type - Interaction type
   */
  trackInteraction(userId, sessionId, message, response, type) {
    // In production, this would track successful interactions for analytics
    console.log(`[INTERACTION] ${type}: User ${userId} in session ${sessionId}`);
  }

  /**
   * Updates the course configuration
   * @param {CourseConfiguration} newConfig - New course configuration
   */
  updateCourseConfiguration(newConfig) {
    if (!(newConfig instanceof CourseConfiguration)) {
      throw new Error('Invalid course configuration');
    }
    
    this.courseConfig = newConfig;
    console.log(`[CONFIG UPDATE] Course configuration updated: ${newConfig.getCourseName()}`);
  }

  /**
   * Gets current course configuration
   * @returns {CourseConfiguration} - Current course configuration
   */
  getCourseConfiguration() {
    return this.courseConfig;
  }

  /**
   * Gets security statistics
   * @returns {Object} - Security statistics
   */
  getSecurityStats() {
    return this.loggingService.getSecurityStats();
  }

  /**
   * Gets recent security incidents
   * @param {number} limit - Maximum number of incidents to return
   * @returns {SecurityIncident[]} - Recent incidents
   */
  getRecentIncidents(limit = 50) {
    return this.loggingService.incidents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Exports security data for analysis
   * @param {Object} filters - Export filters
   * @returns {Object} - Exported security data
   */
  exportSecurityData(filters = {}) {
    return {
      incidents: this.loggingService.exportIncidents(filters),
      stats: this.loggingService.getSecurityStats(),
      configuration: this.courseConfig.toJSON(),
      exportedAt: new Date()
    };
  }

  /**
   * Detects and parses multi-part questions
   * @param {string} message - User input message
   * @returns {Object} - Multi-part analysis result
   */
  handleMultiPartQuestion(message) {
    // Look for numbered questions or multiple question patterns
    const multiPartPatterns = [
      /(\d+\)|\d+\.)\s*[^?]*\?/g,
      /i\s+have\s+(three|two|several|multiple)\s+questions?/i,
      /first.*second.*third/i,
      /question\s+\d+/gi
    ];

    let isMultiPart = false;
    let parts = [];

    // Check for explicit multi-part indicators
    for (const pattern of multiPartPatterns) {
      if (pattern.test(message)) {
        isMultiPart = true;
        break;
      }
    }

    if (isMultiPart) {
      // Split by numbered patterns
      const numberedParts = message.split(/(?=\d+[\)\.]\s*)/);
      if (numberedParts.length > 1) {
        parts = numberedParts.slice(1).map(part => part.trim());
      } else {
        // Split by question marks as fallback
        parts = message.split('?').filter(part => part.trim().length > 0).map(part => part.trim() + '?');
      }
    }

    return {
      isMultiPart,
      parts,
      originalMessage: message
    };
  }

  /**
   * Processes multi-part questions by handling each part separately
   * @param {Object} multiPartResult - Multi-part analysis result
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @returns {ProcessingResult} - Processing result with combined response
   */
  async processMultiPartQuestion(multiPartResult, userId, sessionId) {
    const relevantParts = [];
    const offTopicParts = [];
    const securityViolations = [];

    for (let i = 0; i < multiPartResult.parts.length; i++) {
      const part = multiPartResult.parts[i];
      
      // Run security checks on each part
      const securityResult = this.securityValidator.validateInput(part, this.courseConfig);
      if (!securityResult.isValid) {
        securityViolations.push({
          part: i + 1,
          violation: securityResult.violationType,
          severity: securityResult.severity
        });
        continue;
      }

      // Run relevance analysis on each part
      const relevanceResult = this.relevanceAnalyzer.analyzeRelevance(part, this.courseConfig);
      
      if (relevanceResult.classification === 'RELEVANT') {
        relevantParts.push({
          number: i + 1,
          content: part,
          topics: relevanceResult.courseTopicsMatched
        });
      } else {
        offTopicParts.push({
          number: i + 1,
          content: part
        });
      }
    }

    // If there are security violations, return security response for the first one
    if (securityViolations.length > 0) {
      const firstViolation = securityViolations[0];
      const response = this.responseGenerator.getSecurityResponse(firstViolation.violation, this.courseConfig);
      
      // Log the security incident
      this.loggingService.logSecurityIncident(
        {
          userId,
          sessionId,
          incidentType: firstViolation.violation,
          message: multiPartResult.originalMessage,
          response
        },
        firstViolation.severity,
        { step: 'multi_part_security_check', partNumber: firstViolation.part }
      );

      return {
        securityResult: { isValid: false, violationType: firstViolation.violation },
        relevanceResult: null,
        response,
        shouldLog: true
      };
    }

    // Generate mixed question response
    let response = '';
    
    if (relevantParts.length > 0) {
      response += "I'll address the course-related questions:\n\n";
      
      for (const part of relevantParts) {
        if (part.topics && part.topics.length > 0) {
          response += `Question ${part.number}: This relates to ${part.topics.join(', ')}. I'm ready to help with this ${this.courseConfig.courseName} topic. Please provide more specific details about what you'd like to understand.\n\n`;
        } else {
          response += `Question ${part.number}: This appears to be course-related. I'm ready to help with this ${this.courseConfig.courseName} content. Please provide more specific details.\n\n`;
        }
      }
    }

    if (offTopicParts.length > 0) {
      const offTopicNumbers = offTopicParts.map(p => p.number).join(', ');
      response += `Question${offTopicParts.length > 1 ? 's' : ''} ${offTopicNumbers} fall${offTopicParts.length === 1 ? 's' : ''} outside the scope of ${this.courseConfig.courseName}, so I've focused on the course-related content above.`;
    }

    if (relevantParts.length === 0 && offTopicParts.length > 0) {
      // All questions were off-topic
      response = this.responseGenerator.getOffTopicResponse(this.courseConfig);
    }

    // Track successful interaction
    this.trackInteraction(userId, sessionId, multiPartResult.originalMessage, response, 'multi_part_success');

    return {
      securityResult: { isValid: true },
      relevanceResult: { classification: relevantParts.length > 0 ? 'MIXED' : 'IRRELEVANT' },
      response,
      shouldLog: false
    };
  }

  /**
   * Performs maintenance tasks
   * @param {Object} options - Maintenance options
   */
  performMaintenance(options = {}) {
    const maxAge = options.maxIncidentAge || 30 * 24 * 60 * 60 * 1000; // 30 days
    const clearedIncidents = this.loggingService.clearOldIncidents(maxAge);
    
    // Clear old session state
    this.sessionState.clear();
    
    console.log(`[MAINTENANCE] Cleared ${clearedIncidents} old incidents and reset session state`);
    
    return {
      clearedIncidents,
      sessionStateReset: true,
      performedAt: new Date()
    };
  }
}