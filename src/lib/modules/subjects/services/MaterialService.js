/**
 * Material Service
 *
 * This service handles material upload, processing, and assignment
 * for subjects. It integrates with document processing and will
 * integrate with GraphRAG for knowledge management.
 */

import {
  createMaterial,
  validateMaterialFile,
  updateMaterialAssignments,
  getMaterialsForAgent,
  MATERIAL_STATUS
} from '../materials.js';
import { validateMaterial } from '../types.js';

/**
 * Material Service class
 */
export class MaterialService {
  constructor(subjectService, documentProcessor = null) {
    this.subjectService = subjectService;
    this.documentProcessor = documentProcessor;
  }

  /**
   * Upload and process a material for a subject
   * @param {File} file - File to upload
   * @param {string} subjectId - Subject ID
   * @param {Object} assignmentData - Assignment configuration
   * @param {string} uploaderId - ID of user uploading the material
   * @returns {Promise<Object>} Upload result
   */
  async uploadMaterial(file, subjectId, assignmentData, uploaderId) {
    try {
      // Validate file
      const fileValidation = validateMaterialFile(file);
      if (!fileValidation.isValid) {
        throw new Error(`File validation failed: ${fileValidation.errors.join(', ')}`);
      }

      // Get subject to verify it exists
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;

      // Check if user can upload materials to this subject
      const canUpload = this.canUserUploadMaterial(subject, uploaderId);
      if (!canUpload.allowed) {
        throw new Error(canUpload.reason);
      }

      // Create material object
      const material = createMaterial({
        fileName: file.name,
        fileType: file.type,
        subjectId,
        uploaderId,
        assignments: assignmentData,
        status: MATERIAL_STATUS.PROCESSING,
        metadata: {
          fileSize: file.size,
          uploadedAt: new Date()
        }
      });

      // Validate material
      const validation = validateMaterial(material);
      if (!validation.isValid) {
        throw new Error(`Material validation failed: ${validation.errors.join(', ')}`);
      }

      // Process file content
      let content = '';
      try {
        if (this.documentProcessor) {
          const processingResult = await this.documentProcessor.processDocument(file);
          content = processingResult.text || '';
        } else {
          // Fallback: read as text if possible
          content = await this.readFileAsText(file);
        }
      } catch (processingError) {
        console.warn('Document processing failed, using fallback:', processingError);
        content = await this.readFileAsText(file);
      }

      // Update material with content
      const materialWithContent = {
        ...material,
        content,
        status: MATERIAL_STATUS.READY,
        metadata: {
          ...material.metadata,
          processedAt: new Date()
        }
      };

      // Add material to subject
      const updatedMaterials = [...subject.materials, materialWithContent];
      const updateResult = await this.subjectService.updateSubject(
        subjectId,
        { materials: updatedMaterials },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        material: materialWithContent,
        message: 'Material uploaded and processed successfully'
      };
    } catch (error) {
      console.error('Error uploading material:', error);
      return {
        success: false,
        error: error.message,
        material: null
      };
    }
  }

  /**
   * Process material with GraphRAG (placeholder for future implementation)
   * @param {string} materialId - Material ID
   * @param {string} content - Material content
   * @returns {Promise<Object>} Processing result
   */
  async processWithGraphRAG(materialId, content) {
    try {
      // This is a placeholder for GraphRAG integration
      // In the future, this will process the content through GraphRAG
      // and create knowledge graph nodes and embeddings

      const processedContent = {
        graphRAGNodes: [
          {
            id: `node_${materialId}_1`,
            type: 'document',
            content: content.substring(0, 500),
            metadata: {
              materialId,
              processedAt: new Date()
            }
          }
        ],
        embeddings: [], // Would contain vector embeddings
        metadata: {
          processingMethod: 'placeholder',
          processedAt: new Date(),
          contentLength: content.length
        }
      };

      return {
        success: true,
        processedContent,
        message: 'Material processed with GraphRAG (placeholder)'
      };
    } catch (error) {
      console.error('Error processing material with GraphRAG:', error);
      return {
        success: false,
        error: error.message,
        processedContent: null
      };
    }
  }

  /**
   * Assign material to specific agents
   * @param {string} materialId - Material ID
   * @param {string[]} agentIds - Array of agent IDs
   * @returns {Promise<Object>} Assignment result
   */
  async assignToAgents(materialId, agentIds) {
    try {
      const materialResult = await this.findMaterialById(materialId);
      if (!materialResult.success) {
        throw new Error('Material not found');
      }

      const { subject, material } = materialResult;

      // Update material assignments
      const updatedMaterial = updateMaterialAssignments(material, {
        allAgents: false,
        specificAgents: agentIds
      });

      // Update subject with modified material
      const updatedMaterials = subject.materials.map((m) =>
        m.id === materialId ? updatedMaterial : m
      );

      const updateResult = await this.subjectService.updateSubject(
        subject.id,
        { materials: updatedMaterials },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        material: updatedMaterial,
        message: 'Material assignments updated successfully'
      };
    } catch (error) {
      console.error('Error assigning material to agents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update material assignments
   * @param {string} materialId - Material ID
   * @param {Object} assignments - New assignment configuration
   * @returns {Promise<Object>} Update result
   */
  async updateMaterialAssignments(materialId, assignments) {
    try {
      const materialResult = await this.findMaterialById(materialId);
      if (!materialResult.success) {
        throw new Error('Material not found');
      }

      const { subject, material } = materialResult;

      // Update material assignments
      const updatedMaterial = updateMaterialAssignments(material, assignments);

      // Update subject with modified material
      const updatedMaterials = subject.materials.map((m) =>
        m.id === materialId ? updatedMaterial : m
      );

      const updateResult = await this.subjectService.updateSubject(
        subject.id,
        { materials: updatedMaterials },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        material: updatedMaterial,
        message: 'Material assignments updated successfully'
      };
    } catch (error) {
      console.error('Error updating material assignments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a material
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMaterial(materialId) {
    try {
      const materialResult = await this.findMaterialById(materialId);
      if (!materialResult.success) {
        throw new Error('Material not found');
      }

      const { subject } = materialResult;

      // Remove material from subject
      const updatedMaterials = subject.materials.filter((m) => m.id !== materialId);

      const updateResult = await this.subjectService.updateSubject(
        subject.id,
        { materials: updatedMaterials },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        message: 'Material deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting material:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get materials for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Materials list or error
   */
  async getMaterialsBySubject(subjectId) {
    try {
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;

      return {
        success: true,
        materials: subject.materials || [],
        total: subject.materials?.length || 0
      };
    } catch (error) {
      console.error('Error getting materials by subject:', error);
      return {
        success: false,
        error: error.message,
        materials: [],
        total: 0
      };
    }
  }

  /**
   * Get materials assigned to a specific agent
   * @param {string} subjectId - Subject ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Materials list or error
   */
  async getMaterialsForAgent(subjectId, agentId) {
    try {
      const materialsResult = await this.getMaterialsBySubject(subjectId);
      if (!materialsResult.success) {
        throw new Error(materialsResult.error);
      }

      const agentMaterials = getMaterialsForAgent(materialsResult.materials, agentId);

      return {
        success: true,
        materials: agentMaterials,
        total: agentMaterials.length
      };
    } catch (error) {
      console.error('Error getting materials for agent:', error);
      return {
        success: false,
        error: error.message,
        materials: [],
        total: 0
      };
    }
  }

  /**
   * Find material by ID across all subjects
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Subject and material or error
   */
  async findMaterialById(materialId) {
    try {
      const subjectsResult = await this.subjectService.listSubjects();
      if (!subjectsResult.success) {
        throw new Error('Failed to load subjects');
      }

      for (const subject of subjectsResult.subjects) {
        const material = subject.materials?.find((m) => m.id === materialId);
        if (material) {
          return {
            success: true,
            subject,
            material
          };
        }
      }

      return {
        success: false,
        error: 'Material not found'
      };
    } catch (error) {
      console.error('Error finding material by ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user can upload materials to a subject
   * @param {Object} subject - Subject object
   * @param {string} userId - User ID
   * @returns {Object} Permission result
   */
  canUserUploadMaterial(subject, userId) {
    // Subject creators can always upload materials
    if (subject.creatorId === userId) {
      return { allowed: true };
    }

    // For now, only subject creators can upload materials
    // This could be extended to allow other users based on permissions
    return {
      allowed: false,
      reason: 'Only the subject creator can upload materials'
    };
  }

  /**
   * Read file as text (fallback method)
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as text
   */
  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target.result || '');
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }
}
