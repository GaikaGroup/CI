/**
 * Subject Management Types and Interfaces
 *
 * This file contains TypeScript-style interfaces and validation functions
 * for the subject management system.
 */

/**
 * @typedef {Object} Agent
 * @property {string} id - Unique identifier for the agent
 * @property {string} name - Display name for the agent
 * @property {'subject'|'orchestration'} type - Type of agent
 * @property {string} instructions - Textual instructions defining agent behavior
 * @property {string} subjectId - ID of the subject this agent belongs to
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
 * @property {string} subjectId - ID of the subject this material belongs to
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
 * @property {string} subjectId - ID of the reported subject
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
 * @typedef {Object} Subject
 * @property {string} id - Unique identifier for the subject
 * @property {string} name - Subject name
 * @property {string} description - Subject description
 * @property {string} creatorId - ID of the user who created the subject
 * @property {'admin'|'user'} creatorRole - Role of the creator
 * @property {'active'|'blocked'|'deleted'} status - Subject status
 * @property {string} language - Primary language of the subject
 * @property {string} level - Difficulty level
 * @property {string[]} skills - Array of skills covered
 * @property {Agent[]} agents - Array of agents assigned to this subject
 * @property {Agent|null} orchestrationAgent - Orchestration agent for multi-agent subjects
 * @property {Material[]} materials - Array of reference materials
 * @property {Object} llmSettings - LLM provider settings
 * @property {boolean} llmSettings.allowOpenAI - Whether OpenAI usage is allowed
 * @property {string} llmSettings.preferredProvider - Preferred LLM provider
 * @property {boolean} llmSettings.fallbackEnabled - Whether fallback is enabled
 * @property {Object} metadata - Subject metadata
 * @property {Date} metadata.createdAt - Creation timestamp
 * @property {Date} metadata.updatedAt - Last update timestamp
 * @property {number} metadata.reportCount - Number of reports against this subject
 * @property {number} metadata.userCount - Number of users who have used this subject
 */

/**
 * Validation functions
 */

/**
 * Validate subject data
 * @param {Object} subjectData - Subject data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
export function validateSubject(subjectData) {
  const errors = [];

  // Required fields
  if (
    !subjectData.name ||
    typeof subjectData.name !== 'string' ||
    subjectData.name.trim().length === 0
  ) {
    errors.push('Subject name is required');
  }

  if (
    !subjectData.description ||
    typeof subjectData.description !== 'string' ||
    subjectData.description.trim().length === 0
  ) {
    errors.push('Subject description is required');
  }

  if (!subjectData.creatorId || typeof subjectData.creatorId !== 'string') {
    errors.push('Creator ID is required');
  }

  if (!subjectData.creatorRole || !['admin', 'user'].includes(subjectData.creatorRole)) {
    errors.push('Creator role must be either "admin" or "user"');
  }

  // Optional fields validation
  if (subjectData.language && typeof subjectData.language !== 'string') {
    errors.push('Language must be a string');
  }

  if (subjectData.level && typeof subjectData.level !== 'string') {
    errors.push('Level must be a string');
  }

  if (subjectData.skills && !Array.isArray(subjectData.skills)) {
    errors.push('Skills must be an array');
  }

  // Agents validation
  if (subjectData.agents && Array.isArray(subjectData.agents)) {
    subjectData.agents.forEach((agent, index) => {
      const agentValidation = validateAgent(agent);
      if (!agentValidation.isValid) {
        errors.push(`Agent ${index + 1}: ${agentValidation.errors.join(', ')}`);
      }
    });

    // Check orchestration requirement
    if (subjectData.agents.length > 1) {
      const hasOrchestrationAgent =
        subjectData.agents.some((agent) => agent.type === 'orchestration') ||
        (subjectData.orchestrationAgent && subjectData.orchestrationAgent.type === 'orchestration');
      if (!hasOrchestrationAgent) {
        errors.push('Subjects with multiple agents require an orchestration agent');
      }
    }
  }

  // LLM settings validation
  if (subjectData.llmSettings) {
    if (typeof subjectData.llmSettings.allowOpenAI !== 'boolean') {
      errors.push('LLM settings allowOpenAI must be a boolean');
    }
    if (
      subjectData.llmSettings.preferredProvider &&
      typeof subjectData.llmSettings.preferredProvider !== 'string'
    ) {
      errors.push('LLM settings preferredProvider must be a string');
    }
    if (typeof subjectData.llmSettings.fallbackEnabled !== 'boolean') {
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

  if (!agentData.type || !['subject', 'orchestration'].includes(agentData.type)) {
    errors.push('Agent type must be either "subject" or "orchestration"');
  }

  if (
    !agentData.instructions ||
    typeof agentData.instructions !== 'string' ||
    agentData.instructions.trim().length === 0
  ) {
    errors.push('Agent instructions are required');
  }

  if (!agentData.subjectId || typeof agentData.subjectId !== 'string') {
    errors.push('Subject ID is required');
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

  if (!materialData.subjectId || typeof materialData.subjectId !== 'string') {
    errors.push('Subject ID is required');
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
  if (!reportData.subjectId || typeof reportData.subjectId !== 'string') {
    errors.push('Subject ID is required');
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
 * Create default subject configuration
 * @param {Object} baseData - Base subject data
 * @returns {Subject} Complete subject object with defaults
 */
export function createDefaultSubject(baseData) {
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
