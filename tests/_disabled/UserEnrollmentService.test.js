import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UserEnrollmentService,
  ENROLLMENT_STATUS
} from '$lib/modules/subjects/services/UserEnrollmentService.js';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
vi.stubGlobal('localStorage', localStorageMock);

describe('UserEnrollmentService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = new UserEnrollmentService();
  });

  describe('enrollUser', () => {
    it('successfully enrolls a user', () => {
      const result = service.enrollUser('user1', 'subject1');

      expect(result.success).toBe(true);
      expect(result.enrollment.userId).toBe('user1');
      expect(result.enrollment.subjectId).toBe('subject1');
      expect(result.enrollment.status).toBe(ENROLLMENT_STATUS.ACTIVE);
    });

    it('prevents duplicate enrollment', () => {
      // First enrollment
      service.enrollUser('user1', 'subject1');

      // Second enrollment attempt
      const result = service.enrollUser('user1', 'subject1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is already enrolled in this subject');
    });

    it('saves enrollment to localStorage', () => {
      service.enrollUser('user1', 'subject1');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('userEnrollments', expect.any(String));
    });
  });

  describe('getUserEnrollments', () => {
    it('returns user enrollments', () => {
      service.enrollUser('user1', 'subject1');
      service.enrollUser('user1', 'subject2');
      service.enrollUser('user2', 'subject1');

      const enrollments = service.getUserEnrollments('user1');

      expect(enrollments).toHaveLength(2);
      expect(enrollments[0].subjectId).toBe('subject2'); // Most recent first
      expect(enrollments[1].subjectId).toBe('subject1');
    });

    it('filters by status', () => {
      service.enrollUser('user1', 'subject1');
      service.enrollUser('user1', 'subject2');
      service.updateEnrollmentStatus('user1', 'subject2', ENROLLMENT_STATUS.COMPLETED);

      const activeEnrollments = service.getUserEnrollments('user1', ENROLLMENT_STATUS.ACTIVE);
      const completedEnrollments = service.getUserEnrollments('user1', ENROLLMENT_STATUS.COMPLETED);

      expect(activeEnrollments).toHaveLength(1);
      expect(completedEnrollments).toHaveLength(1);
    });
  });

  describe('isUserEnrolled', () => {
    it('returns true for enrolled user', () => {
      service.enrollUser('user1', 'subject1');

      expect(service.isUserEnrolled('user1', 'subject1')).toBe(true);
    });

    it('returns false for non-enrolled user', () => {
      expect(service.isUserEnrolled('user1', 'subject1')).toBe(false);
    });

    it('returns false for dropped enrollment', () => {
      service.enrollUser('user1', 'subject1');
      service.updateEnrollmentStatus('user1', 'subject1', ENROLLMENT_STATUS.DROPPED);

      expect(service.isUserEnrolled('user1', 'subject1')).toBe(false);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('updates enrollment status', () => {
      service.enrollUser('user1', 'subject1');

      const result = service.updateEnrollmentStatus(
        'user1',
        'subject1',
        ENROLLMENT_STATUS.COMPLETED
      );

      expect(result.success).toBe(true);
      expect(result.enrollment.status).toBe(ENROLLMENT_STATUS.COMPLETED);
    });

    it('returns error for non-existent enrollment', () => {
      const result = service.updateEnrollmentStatus(
        'user1',
        'subject1',
        ENROLLMENT_STATUS.COMPLETED
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Enrollment not found');
    });
  });

  describe('updateProgress', () => {
    it('updates user progress', () => {
      service.enrollUser('user1', 'subject1');

      const result = service.updateProgress('user1', 'subject1', {
        lessonsCompleted: 5,
        assessmentsTaken: 2
      });

      expect(result.success).toBe(true);
      expect(result.enrollment.progress.lessonsCompleted).toBe(5);
      expect(result.enrollment.progress.assessmentsTaken).toBe(2);
    });
  });

  describe('getUserStats', () => {
    it('calculates user statistics', () => {
      service.enrollUser('user1', 'subject1');
      service.enrollUser('user1', 'subject2');
      service.updateEnrollmentStatus('user1', 'subject2', ENROLLMENT_STATUS.COMPLETED);
      service.updateProgress('user1', 'subject1', { lessonsCompleted: 3, assessmentsTaken: 1 });

      const stats = service.getUserStats('user1');

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.totalLessons).toBe(3);
      expect(stats.totalAssessments).toBe(1);
    });
  });

  describe('loadFromStorage', () => {
    it('loads enrollments from localStorage', () => {
      const mockData = JSON.stringify([
        [
          'user1-subject1',
          {
            userId: 'user1',
            subjectId: 'subject1',
            status: ENROLLMENT_STATUS.ACTIVE,
            enrolledAt: new Date().toISOString(),
            progress: { lessonsCompleted: 0, assessmentsTaken: 0 }
          }
        ]
      ]);

      localStorageMock.getItem.mockReturnValue(mockData);

      const newService = new UserEnrollmentService();
      const enrollments = newService.getUserEnrollments('user1');

      expect(enrollments).toHaveLength(1);
      expect(enrollments[0].subjectId).toBe('subject1');
    });

    it('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      // Should not throw error
      expect(() => new UserEnrollmentService()).not.toThrow();
    });
  });
});
