/**
 * Subject Service
 *
 * This service handles CRUD operations for subjects with role-based access control
 * and validation. It integrates with the existing subjects store and provides
 * enhanced functionality for the admin subject management system.
 */

import { validateSubject, createDefaultSubject } from '../types.js';
import { validateAgentConfiguration } from '../agents.js';

/**
 * Subject status enumeration
 */
export const SUBJECT_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
};

/**
 * Subject Service class
 */
export class SubjectService {
  constructor(subjectsStore, reportsStore = null) {
    this.subjectsStore = subjectsStore;
    this.reportsStore = reportsStore;
  }

  /**
   * Create a new subject
   * @param {Object} subjectData - Subject data
   * @param {string} creatorId - ID of the user creating the subject
   * @param {string} creatorRole - Role of the creator ('admin' or 'user')
   * @returns {Promise<Object>} Created subject or error
   */
  async createSubject(subjectData, creatorId, creatorRole) {
    try {
      // Validate creator role
      if (!['admin', 'user'].includes(creatorRole)) {
        throw new Error('Invalid creator role. Must be "admin" or "user"');
      }

      // Create subject with creator information
      const subjectWithCreator = {
        ...subjectData,
        creatorId,
        creatorRole,
        status: SUBJECT_STATUS.ACTIVE
      };

      // Create default subject structure
      const subject = createDefaultSubject(subjectWithCreator);

      // Validate subject data
      const validation = validateSubject(subject);
      if (!validation.isValid) {
        throw new Error(`Subject validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate agent configuration
      const agentValidation = validateAgentConfiguration(
        subject.agents,
        subject.orchestrationAgent
      );
      if (!agentValidation.isValid) {
        throw new Error(`Agent configuration invalid: ${agentValidation.errors.join(', ')}`);
      }

      // Add subject to store
      this.subjectsStore.addSubject(subject);

      return {
        success: true,
        subject,
        message: 'Subject created successfully'
      };
    } catch (error) {
      console.error('Error creating subject:', error);
      return {
        success: false,
        error: error.message,
        subject: null
      };
    }
  }

  /**
   * Update an existing subject
   * @param {string} subjectId - ID of the subject to update
   * @param {Object} updates - Updates to apply
   * @param {string} userId - ID of the user making the update
   * @param {string} userRole - Role of the user making the update
   * @returns {Promise<Object>} Update result
   */
  async updateSubject(subjectId, updates, userId, userRole) {
    try {
      // Get current subject
      const currentSubject = await this.getSubject(subjectId);
      if (!currentSubject.success) {
        throw new Error('Subject not found');
      }

      const subject = currentSubject.subject;

      // Check permissions
      const canUpdate = this.canUserModifySubject(subject, userId, userRole);
      if (!canUpdate.allowed) {
        throw new Error(canUpdate.reason);
      }

      // Apply updates
      const updatedSubject = {
        ...subject,
        ...updates,
        metadata: {
          ...subject.metadata,
          updatedAt: new Date()
        }
      };

      // Validate updated subject
      const validation = validateSubject(updatedSubject);
      if (!validation.isValid) {
        throw new Error(`Subject validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate agent configuration if agents were updated
      if (updates.agents || updates.orchestrationAgent) {
        const agentValidation = validateAgentConfiguration(
          updatedSubject.agents,
          updatedSubject.orchestrationAgent
        );
        if (!agentValidation.isValid) {
          throw new Error(`Agent configuration invalid: ${agentValidation.errors.join(', ')}`);
        }
      }

      // Update subject in store
      this.subjectsStore.updateSubject(subjectId, updatedSubject);

      return {
        success: true,
        subject: updatedSubject,
        message: 'Subject updated successfully'
      };
    } catch (error) {
      console.error('Error updating subject:', error);
      return {
        success: false,
        error: error.message,
        subject: null
      };
    }
  }

  /**
   * Delete a subject
   * @param {string} subjectId - ID of the subject to delete
   * @param {string} userId - ID of the user deleting the subject
   * @param {string} userRole - Role of the user deleting the subject
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSubject(subjectId, userId, userRole) {
    try {
      // Get current subject
      const currentSubject = await this.getSubject(subjectId);
      if (!currentSubject.success) {
        throw new Error('Subject not found');
      }

      const subject = currentSubject.subject;

      // Check permissions
      const canDelete = this.canUserModifySubject(subject, userId, userRole);
      if (!canDelete.allowed) {
        throw new Error(canDelete.reason);
      }

      // For admins, actually delete. For users, mark as deleted
      if (userRole === 'admin') {
        this.subjectsStore.removeSubject(subjectId);
      } else {
        this.subjectsStore.updateSubject(subjectId, {
          status: SUBJECT_STATUS.DELETED,
          metadata: {
            ...subject.metadata,
            updatedAt: new Date()
          }
        });
      }

      return {
        success: true,
        message: 'Subject deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting subject:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a subject by ID
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Subject data or error
   */
  async getSubject(subjectId) {
    try {
      // This would typically query a database, but we'll use the store for now
      const subjects = await this.listSubjects();
      const subject = subjects.subjects.find((s) => s.id === subjectId);

      if (!subject) {
        return {
          success: false,
          error: 'Subject not found',
          subject: null
        };
      }

      return {
        success: true,
        subject
      };
    } catch (error) {
      console.error('Error getting subject:', error);
      return {
        success: false,
        error: error.message,
        subject: null
      };
    }
  }

  /**
   * List subjects with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} List of subjects
   */
  async listSubjects(filters = {}) {
    try {
      // Get subjects from store (this would be a database query in a real app)
      let subjects = [];

      // Since we can't directly access the store's current value, we'll simulate it
      // In a real implementation, this would query the database
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('learnModeSubjects');
        if (stored) {
          subjects = JSON.parse(stored);
        }
      }

      // Apply filters
      if (filters.status) {
        subjects = subjects.filter((subject) => subject.status === filters.status);
      }

      if (filters.creatorRole) {
        subjects = subjects.filter((subject) => subject.creatorRole === filters.creatorRole);
      }

      if (filters.creatorId) {
        subjects = subjects.filter((subject) => subject.creatorId === filters.creatorId);
      }

      if (filters.language) {
        subjects = subjects.filter((subject) => subject.language === filters.language);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        subjects = subjects.filter(
          (subject) =>
            subject.name.toLowerCase().includes(searchTerm) ||
            subject.description.toLowerCase().includes(searchTerm)
        );
      }

      return {
        success: true,
        subjects,
        total: subjects.length
      };
    } catch (error) {
      console.error('Error listing subjects:', error);
      return {
        success: false,
        error: error.message,
        subjects: [],
        total: 0
      };
    }
  }

  /**
   * Validate subject configuration
   * @param {Object} subjectData - Subject data to validate
   * @returns {Object} Validation result
   */
  validateSubjectConfiguration(subjectData) {
    const subjectValidation = validateSubject(subjectData);

    if (!subjectValidation.isValid) {
      return subjectValidation;
    }

    // Additional validation for agent configuration
    const agentValidation = validateAgentConfiguration(
      subjectData.agents,
      subjectData.orchestrationAgent
    );

    if (!agentValidation.isValid) {
      return {
        isValid: false,
        errors: [...subjectValidation.errors, ...agentValidation.errors]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Check if user can modify a subject
   * @param {Object} subject - Subject to check
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Object} Permission result
   */
  canUserModifySubject(subject, userId, userRole) {
    // Admins can modify any subject
    if (userRole === 'admin') {
      return { allowed: true };
    }

    // Users can only modify their own subjects
    if (subject.creatorId === userId) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'You can only modify subjects you created'
    };
  }

  /**
   * Block a subject (admin only)
   * @param {string} subjectId - Subject ID
   * @param {string} reason - Reason for blocking
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Block result
   */
  async blockSubject(subjectId, reason, adminId) {
    try {
      const result = await this.updateSubject(
        subjectId,
        {
          status: SUBJECT_STATUS.BLOCKED,
          blockReason: reason,
          blockedBy: adminId,
          blockedAt: new Date()
        },
        adminId,
        'admin'
      );

      return result;
    } catch (error) {
      console.error('Error blocking subject:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unblock a subject (admin only)
   * @param {string} subjectId - Subject ID
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Unblock result
   */
  async unblockSubject(subjectId, adminId) {
    try {
      const result = await this.updateSubject(
        subjectId,
        {
          status: SUBJECT_STATUS.ACTIVE,
          blockReason: null,
          blockedBy: null,
          blockedAt: null
        },
        adminId,
        'admin'
      );

      return result;
    } catch (error) {
      console.error('Error unblocking subject:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
