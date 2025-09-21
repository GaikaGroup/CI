/**
 * Material Management Module
 *
 * This module provides utilities for managing reference materials
 * within subjects, including file validation and assignment logic.
 */

// Material validation is handled by types.js when needed

/**
 * Material status enumeration
 */
export const MATERIAL_STATUS = {
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error'
};

/**
 * Supported file types for materials
 */
export const SUPPORTED_MATERIAL_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/html'
];

/**
 * Maximum file size for materials (10MB)
 */
export const MAX_MATERIAL_SIZE = 10 * 1024 * 1024;

/**
 * Create a new material with default values
 * @param {Object} materialData - Material data
 * @returns {Object} Complete material object
 */
export function createMaterial(materialData) {
  return {
    id: materialData.id || generateMaterialId(),
    fileName: materialData.fileName || '',
    fileType: materialData.fileType || '',
    subjectId: materialData.subjectId || '',
    uploaderId: materialData.uploaderId || '',
    content: materialData.content || '',
    processedContent: {
      graphRAGNodes: [],
      embeddings: [],
      metadata: {},
      ...materialData.processedContent
    },
    assignments: {
      allAgents: materialData.assignments?.allAgents ?? true,
      specificAgents: materialData.assignments?.specificAgents || []
    },
    status: materialData.status || MATERIAL_STATUS.PROCESSING,
    metadata: {
      uploadedAt: materialData.metadata?.uploadedAt || new Date(),
      processedAt: materialData.metadata?.processedAt || null,
      fileSize: materialData.metadata?.fileSize || 0
    }
  };
}

/**
 * Validate file for material upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export function validateMaterialFile(file) {
  const errors = [];

  if (!file) {
    return {
      isValid: false,
      errors: ['No file provided']
    };
  }

  // Check file type
  if (!SUPPORTED_MATERIAL_TYPES.includes(file.type)) {
    errors.push(
      `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_MATERIAL_TYPES.join(', ')}`
    );
  }

  // Check file size
  if (file.size > MAX_MATERIAL_SIZE) {
    errors.push(
      `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum size: ${MAX_MATERIAL_SIZE / (1024 * 1024)}MB`
    );
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File must have a name');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if material is assigned to a specific agent
 * @param {Object} material - Material object
 * @param {string} agentId - Agent ID to check
 * @returns {boolean} True if material is assigned to the agent
 */
export function isMaterialAssignedToAgent(material, agentId) {
  if (!material || !material.assignments) {
    return false;
  }

  if (material.assignments.allAgents) {
    return true;
  }

  return material.assignments.specificAgents.includes(agentId);
}

/**
 * Get materials assigned to a specific agent
 * @param {Object[]} materials - Array of materials
 * @param {string} agentId - Agent ID
 * @returns {Object[]} Materials assigned to the agent
 */
export function getMaterialsForAgent(materials, agentId) {
  if (!Array.isArray(materials)) {
    return [];
  }

  return materials.filter((material) => isMaterialAssignedToAgent(material, agentId));
}

/**
 * Update material assignments
 * @param {Object} material - Material to update
 * @param {Object} assignments - New assignment configuration
 * @returns {Object} Updated material
 */
export function updateMaterialAssignments(material, assignments) {
  return {
    ...material,
    assignments: {
      allAgents: assignments.allAgents ?? material.assignments.allAgents,
      specificAgents: assignments.specificAgents || material.assignments.specificAgents
    },
    metadata: {
      ...material.metadata,
      updatedAt: new Date()
    }
  };
}

/**
 * Update material processing status
 * @param {Object} material - Material to update
 * @param {string} status - New status
 * @param {Object} processedContent - Optional processed content
 * @returns {Object} Updated material
 */
export function updateMaterialStatus(material, status, processedContent = null) {
  const updates = {
    ...material,
    status,
    metadata: {
      ...material.metadata,
      updatedAt: new Date()
    }
  };

  if (status === MATERIAL_STATUS.READY && processedContent) {
    updates.processedContent = processedContent;
    updates.metadata.processedAt = new Date();
  }

  return updates;
}

/**
 * Get materials by status
 * @param {Object[]} materials - Array of materials
 * @param {string} status - Status to filter by
 * @returns {Object[]} Filtered materials
 */
export function getMaterialsByStatus(materials, status) {
  if (!Array.isArray(materials)) {
    return [];
  }

  return materials.filter((material) => material.status === status);
}

/**
 * Generate unique material ID
 * @returns {string} Unique material identifier
 */
function generateMaterialId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `material_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
