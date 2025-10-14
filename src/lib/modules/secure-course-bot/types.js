/**
 * Type definitions for the secure course bot system
 */

/**
 * @typedef {Object} SecurityValidationResult
 * @property {boolean} isValid - Whether the input passed security validation
 * @property {string} violationType - Type of violation detected ('prompt_injection', 'authority_claim', 'roleplay', etc.)
 * @property {string} severity - Severity level ('low', 'medium', 'high')
 * @property {boolean} shouldLog - Whether this incident should be logged
 * @property {string} responseTemplate - Template key for the response
 */

/**
 * @typedef {Object} RelevanceResult
 * @property {string} classification - Classification result ('RELEVANT', 'IRRELEVANT', 'GRAY_AREA')
 * @property {number} confidence - Confidence score (0-1)
 * @property {string[]} courseTopicsMatched - Array of course topics that matched
 * @property {string} reasoning - Explanation of the classification decision
 */

/**
 * @typedef {Object} CourseConfig
 * @property {string} courseName - Name of the course
 * @property {string[]} courseTopics - Array of relevant course topics
 * @property {InstructorInfo} instructorInfo - Instructor contact information
 * @property {string} syllabusContent - Course syllabus content
 * @property {string[]} learningObjectives - Course learning objectives
 */

/**
 * @typedef {Object} InstructorInfo
 * @property {string} name - Instructor name
 * @property {string} email - Instructor email
 * @property {string} officeHours - Office hours information
 */

/**
 * @typedef {Object} SecurityIncident
 * @property {Date} timestamp - When the incident occurred
 * @property {string} userId - User identifier
 * @property {string} sessionId - Session identifier
 * @property {string} incidentType - Type of security incident
 * @property {string} message - Original user message
 * @property {string} severity - Incident severity level
 * @property {string} response - Bot response to the incident
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {SecurityValidationResult} securityResult - Security validation result
 * @property {RelevanceResult} relevanceResult - Relevance analysis result
 * @property {string} response - Generated response
 * @property {boolean} shouldLog - Whether to log this interaction
 */

export // Export types for JSDoc usage
 {};
