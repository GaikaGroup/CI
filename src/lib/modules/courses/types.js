/**
 * Course Management Types and Interfaces
 *
 * This file contains TypeScript-style interfaces and validation functions
 * for the course management system.
 */

/**
 * @typedef {Object} Agent
 * @property {string} id - Unique identifier for the agent
 * @property {string} name - Display name for the agent
 * @property {'course'|'orchestration'} type - Type of agent
 * @property {string} instructions - Textual instructions defining agent behavior
 * @property {string} courseId - ID of the course this agent belongs to
 * @property {string[]} assignedMaterials - Array of material IDs assigned to this agent
 * @property {Object} configuration - Agent configuration settings
 * @property {string} configuration.model - LLM model to use
 * @property {number} configuration.temperature - Temperature setting for responses
 * @property {number} configuration.maxTokens - Maximum tokens for responses
 * @property {Object} metadata - Agent metadata
 * @property {Date} metadata.createdAt - Creation timestamp
 * @property {Date} metadata.updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} Material
 * @property {string} id - Unique identifier for the material
 * @property {string} fileName - Original file name
 * @property {string} fileType - MIME type of the file
 * @property {string} courseId - ID of the course this material belongs to
 * @property {string} uploaderId - ID of the user who uploaded the material
 * @property {string} content - Extracted text content
 * @property {Object} processedContent - GraphRAG processed content
 * @property {Object[]} processedContent.graphRAGNodes - Knowledge graph nodes
 * @property {number[][]} processedContent.embeddings - Vector embeddings
 * @property {Object} processedContent.metadata - Processing metadata
 * @property {Object} assignments - Material assignment configuration
 * @property {boolean} assignments.allAgents - Whether assigned to all agents
 * @property {string[]} assignments.specificAgents - Array of specific agent IDs
 * @property {'processing'|'ready'|'error'} status - Processing status
 * @property {Object} metadata - Material metadata
 * @property {Date} metadata.uploadedAt - Upload timestamp
 * @property {Date} metadata.processedAt - Processing completion timestamp
 * @property {number} metadata.fileSize - File size in bytes
 */

/**
 * @typedef {Object} Report
 * @property {string} id - Unique identifier for the report
 * @property {string} courseId - ID of the reported course
 * @property {string} reporterId - ID of the user who made the report
 * @property {string} reason - Reason for the report
 * @property {string} details - Additional details about the report
 * @property {'pending'|'reviewed'|'resolved'} status - Report status
 * @property {string|null} reviewedBy - ID of admin who reviewed the report
 * @property {Date|null} reviewedAt - Review timestamp
 * @property {'none'|'blocked'|'deleted'|null} action - Action taken by admin
 * @property {Object} metadata - Report metadata
 * @property {Date} metadata.reportedAt - Report creation timestamp
 * @property {string} metadata.reporterIP - IP address of reporter
 */

/**
 * @typedef {Object} Course
 * @property {string} id - Unique identifier for the course
 * @property {string} name - Course name
 * @property {string} description - Course description
 * @property {string} creatorId - ID of the user who created the course
 * @property {'admin'|'user'} creatorRole - Role of the creator
 * @property {'active'|'blocked'|'deleted'} status - Course status
 * @property {string} language - Primary language of the course
 * @property {string} level - Difficulty level
 * @property {string[]} skills - Array of skills covered
 * @property {Agent[]} agents - Array of agents assigned to this course
 * @property {Agent|null} orchestrationAgent - Orchestration agent for multi-agent courses
 * @property {Material[]} materials - Array of reference materials
 * @property {Object} llmSettings - LLM provider settings
 * @property {boolean} llmSettings.allowOpenAI - Whether OpenAI usage is allowed
 * @property {string} llmSettings.preferredProvider - Preferred LLM provider
 * @property {boolean} llmSettings.fallbackEnabled - Whether fallback is enabled
 * @property {Object} metadata - Course metadata
 * @property {Date} metadata.createdAt - Creation timestamp
 * @property {Date} metadata.updatedAt - Last update timestamp
 * @property {number} metadata.reportCount - Number of reports against this course
 * @property {number} metadata.userCount - Number of users who have used this course
 */

/**
 * Validation functions
 */

/**
 * Validate course data
 * @param {Object} courseData - Course data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
export function validateCourse(courseData) {
  const errors = [];

  // Required fields
  if (
    !courseData.name ||
    typeof courseData.name !== 'string' ||
    courseData.name.trim().length === 0
  ) {
    errors.push('Course name is required');
  }

  if (
    !courseData.description ||
    typeof courseData.description !== 'string' ||
    courseData.description.trim().length === 0
  ) {
    errors.push('Course description is required');
  }

  if (!courseData.creatorId || typeof courseData.creatorId !== 'string') {
    errors.push('Creator ID is required');
  }

  if (!courseData.creatorRole || !['admin', 'user'].includes(courseData.creatorRole)) {
    errors.push('Creator role must be either "admin" or "user"');
  }

  // Optional fields validation
  if (courseData.language && typeof courseData.language !== 'string') {
    errors.push('Language must be a string');
  }

  if (courseData.level && typeof courseData.level !== 'string') {
    errors.push('Level must be a string');
  }

  if (courseData.skills && !Array.isArray(courseData.skills)) {
    errors.push('Skills must be an array');
  }

  // Agents validation
  if (courseData.agents && Array.isArray(courseData.agents)) {
    courseData.agents.forEach((agent, index) => {
      const agentValidation = validateAgent(agent);
      if (!agentValidation.isValid) {
        errors.push(`Agent ${index + 1}: ${agentValidation.errors.join(', ')}`);
      }
    });

    // Check orchestration requirement
    if (courseData.agents.length > 1) {
      const hasOrchestrationAgent =
        courseData.agents.some((agent) => agent.type === 'orchestration') ||
        (courseData.orchestrationAgent && courseData.orchestrationAgent.type === 'orchestration');
      if (!hasOrchestrationAgent) {
        errors.push('Courses with multiple agents require an orchestration agent');
      }
    }
  }

  // LLM settings validation
  if (courseData.llmSettings) {
    if (typeof courseData.llmSettings.allowOpenAI !== 'boolean') {
      errors.push('LLM settings allowOpenAI must be a boolean');
    }
    if (
      courseData.llmSettings.preferredProvider &&
      typeof courseData.llmSettings.preferredProvider !== 'string'
    ) {
      errors.push('LLM settings preferredProvider must be a string');
    }
    if (typeof courseData.llmSettings.fallbackEnabled !== 'boolean') {
      errors.push('LLM settings fallbackEnabled must be a boolean');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate agent data
 * @param {Object} agentData - Agent data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
export function validateAgent(agentData) {
  const errors = [];

  // Required fields
  if (!agentData.name || typeof agentData.name !== 'string' || agentData.name.trim().length === 0) {
    errors.push('Agent name is required');
  }

  if (!agentData.type || !['course', 'orchestration'].includes(agentData.type)) {
    errors.push('Agent type must be either "course" or "orchestration"');
  }

  if (
    !agentData.instructions ||
    typeof agentData.instructions !== 'string' ||
    agentData.instructions.trim().length === 0
  ) {
    errors.push('Agent instructions are required');
  }

  if (!agentData.courseId || typeof agentData.courseId !== 'string') {
    errors.push('Course ID is required');
  }

  // Optional fields validation
  if (agentData.assignedMaterials && !Array.isArray(agentData.assignedMaterials)) {
    errors.push('Assigned materials must be an array');
  }

  if (agentData.configuration) {
    if (agentData.configuration.model && typeof agentData.configuration.model !== 'string') {
      errors.push('Configuration model must be a string');
    }
    if (
      agentData.configuration.temperature &&
      typeof agentData.configuration.temperature !== 'number'
    ) {
      errors.push('Configuration temperature must be a number');
    }
    if (
      agentData.configuration.maxTokens &&
      typeof agentData.configuration.maxTokens !== 'number'
    ) {
      errors.push('Configuration maxTokens must be a number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate material data
 * @param {Object} materialData - Material data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
export function validateMaterial(materialData) {
  const errors = [];

  // Required fields
  if (!materialData.fileName || typeof materialData.fileName !== 'string') {
    errors.push('File name is required');
  }

  if (!materialData.fileType || typeof materialData.fileType !== 'string') {
    errors.push('File type is required');
  }

  if (!materialData.courseId || typeof materialData.courseId !== 'string') {
    errors.push('Course ID is required');
  }

  if (!materialData.uploaderId || typeof materialData.uploaderId !== 'string') {
    errors.push('Uploader ID is required');
  }

  // Assignments validation
  if (materialData.assignments) {
    if (typeof materialData.assignments.allAgents !== 'boolean') {
      errors.push('Assignments allAgents must be a boolean');
    }
    if (
      materialData.assignments.specificAgents &&
      !Array.isArray(materialData.assignments.specificAgents)
    ) {
      errors.push('Assignments specificAgents must be an array');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate report data
 * @param {Object} reportData - Report data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
export function validateReport(reportData) {
  const errors = [];

  // Required fields
  if (!reportData.courseId || typeof reportData.courseId !== 'string') {
    errors.push('Course ID is required');
  }

  if (!reportData.reporterId || typeof reportData.reporterId !== 'string') {
    errors.push('Reporter ID is required');
  }

  if (
    !reportData.reason ||
    typeof reportData.reason !== 'string' ||
    reportData.reason.trim().length === 0
  ) {
    errors.push('Report reason is required');
  }

  // Optional fields validation
  if (reportData.details && typeof reportData.details !== 'string') {
    errors.push('Report details must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create default course configuration
 * @param {Object} baseData - Base course data
 * @returns {Course} Complete course object with defaults
 */
export function createDefaultCourse(baseData) {
  return {
    id: baseData.id || generateId(),
    name: baseData.name || '',
    description: baseData.description || '',
    creatorId: baseData.creatorId || '',
    creatorRole: baseData.creatorRole || 'user',
    status: baseData.status || 'active',
    language: baseData.language || '',
    level: baseData.level || '',
    skills: baseData.skills || [],
    agents: baseData.agents || [],
    orchestrationAgent: baseData.orchestrationAgent || null,
    materials: baseData.materials || [],
    llmSettings: {
      allowOpenAI: baseData.llmSettings?.allowOpenAI ?? true,
      preferredProvider: baseData.llmSettings?.preferredProvider || 'ollama',
      fallbackEnabled: baseData.llmSettings?.fallbackEnabled ?? true
    },
    metadata: {
      createdAt: baseData.metadata?.createdAt || new Date(),
      updatedAt: baseData.metadata?.updatedAt || new Date(),
      reportCount: baseData.metadata?.reportCount || 0,
      userCount: baseData.metadata?.userCount || 0
    }
  };
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Legacy exports for backward compatibility
export const validateSubject = validateCourse;
export const createDefaultSubject = createDefaultCourse;
