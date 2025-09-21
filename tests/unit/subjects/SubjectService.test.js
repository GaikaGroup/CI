/**
 * Unit tests for SubjectService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubjectService } from '../../../src/lib/modules/subjects/services/SubjectService.js';
import { createDefaultSubject } from '../../../src/lib/modules/subjects/types.js';

describe('SubjectService', () => {
  let subjectService;
  let mockSubjectsStore;
  let mockReportsStore;

  beforeEach(() => {
    mockSubjectsStore = {
      addSubject: vi.fn(),
      updateSubject: vi.fn(),
      removeSubject: vi.fn()
    };

    mockReportsStore = {
      getReportsBySubject: vi.fn(() => [])
    };

    subjectService = new SubjectService(mockSubjectsStore, mockReportsStore);
  });

  describe('createSubject', () => {
    it('should create a valid subject successfully', async () => {
      const subjectData = {
        name: 'Test Subject',
        description: 'A test subject for learning',
        language: 'English',
        level: 'Beginner',
        skills: ['Reading', 'Writing']
      };

      const result = await subjectService.createSubject(subjectData, 'user123', 'user');

      expect(result.success).toBe(true);
      expect(result.subject.name).toBe('Test Subject');
      expect(result.subject.creatorId).toBe('user123');
      expect(result.subject.creatorRole).toBe('user');
      expect(mockSubjectsStore.addSubject).toHaveBeenCalledWith(result.subject);
    });

    it('should fail with invalid creator role', async () => {
      const subjectData = {
        name: 'Test Subject',
        description: 'A test subject'
      };

      const result = await subjectService.createSubject(subjectData, 'user123', 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid creator role');
    });

    it('should fail with missing required fields', async () => {
      const subjectData = {
        description: 'Missing name'
      };

      const result = await subjectService.createSubject(subjectData, 'user123', 'user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subject validation failed');
    });
  });

  describe('updateSubject', () => {
    beforeEach(() => {
      // Mock getSubject to return a valid subject
      vi.spyOn(subjectService, 'getSubject').mockResolvedValue({
        success: true,
        subject: {
          id: 'subject123',
          name: 'Original Subject',
          creatorId: 'user123',
          creatorRole: 'user',
          agents: [],
          metadata: { createdAt: new Date() }
        }
      });
    });

    it('should update subject successfully', async () => {
      const updates = {
        name: 'Updated Subject',
        description: 'Updated description'
      };

      const result = await subjectService.updateSubject('subject123', updates, 'user123', 'user');

      expect(result.success).toBe(true);
      expect(result.subject.name).toBe('Updated Subject');
      expect(mockSubjectsStore.updateSubject).toHaveBeenCalled();
    });

    it('should fail when user lacks permission', async () => {
      const updates = { name: 'Updated Subject' };

      const result = await subjectService.updateSubject('subject123', updates, 'otheruser', 'user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('can only modify subjects you created');
    });

    it('should allow admin to update any subject', async () => {
      const updates = { name: 'Admin Updated Subject' };

      const result = await subjectService.updateSubject('subject123', updates, 'admin123', 'admin');

      expect(result.success).toBe(true);
      expect(result.subject.name).toBe('Admin Updated Subject');
    });
  });

  describe('deleteSubject', () => {
    beforeEach(() => {
      vi.spyOn(subjectService, 'getSubject').mockResolvedValue({
        success: true,
        subject: {
          id: 'subject123',
          name: 'Test Subject',
          creatorId: 'user123',
          creatorRole: 'user'
        }
      });
    });

    it('should delete subject for admin', async () => {
      const result = await subjectService.deleteSubject('subject123', 'admin123', 'admin');

      expect(result.success).toBe(true);
      expect(mockSubjectsStore.removeSubject).toHaveBeenCalledWith('subject123');
    });

    it('should mark subject as deleted for regular user', async () => {
      const result = await subjectService.deleteSubject('subject123', 'user123', 'user');

      expect(result.success).toBe(true);
      expect(mockSubjectsStore.updateSubject).toHaveBeenCalledWith(
        'subject123',
        expect.objectContaining({ status: 'deleted' })
      );
    });
  });

  describe('validateSubjectConfiguration', () => {
    it('should validate correct subject configuration', () => {
      const subjectData = createDefaultSubject({
        name: 'Test Subject',
        description: 'Test description',
        creatorId: 'user123',
        creatorRole: 'user'
      });

      const result = subjectService.validateSubjectConfiguration(subjectData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const subjectData = {
        // Missing required fields
        agents: []
      };

      const result = subjectService.validateSubjectConfiguration(subjectData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('canUserModifySubject', () => {
    it('should allow admin to modify any subject', () => {
      const subject = { creatorId: 'user123' };
      const result = subjectService.canUserModifySubject(subject, 'admin456', 'admin');

      expect(result.allowed).toBe(true);
    });

    it('should allow user to modify their own subject', () => {
      const subject = { creatorId: 'user123' };
      const result = subjectService.canUserModifySubject(subject, 'user123', 'user');

      expect(result.allowed).toBe(true);
    });

    it('should deny user from modifying others subjects', () => {
      const subject = { creatorId: 'user123' };
      const result = subjectService.canUserModifySubject(subject, 'user456', 'user');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('can only modify subjects you created');
    });
  });
});
