/**
 * Integration tests for session soft delete functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';
import { db } from '../../../src/lib/database/index.js';

describe('Session Soft Delete Integration', () => {
  let testUserId;
  let funSession;
  let learnSession;

  beforeEach(async () => {
    // Create a test user ID
    testUserId = 'test-user-soft-delete';

    // Create test sessions
    funSession = await SessionService.createSession(
      testUserId,
      'Test FUN Session',
      'fun',
      'en',
      'This is a test FUN session',
      false // Don't create welcome message for tests
    );

    learnSession = await SessionService.createSession(
      testUserId,
      'Test LEARN Session',
      'learn',
      'en',
      'This is a test LEARN session',
      false // Don't create welcome message for tests
    );
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.session.deleteMany({
        where: { userId: testUserId }
      });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Soft Delete FUN Sessions', () => {
    it('should soft delete a FUN session successfully', async () => {
      // Soft delete the FUN session
      const result = await SessionService.softDeleteSession(funSession.id, testUserId);
      expect(result).toBe(true);

      // Verify session is hidden from regular queries
      const sessions = await SessionService.getUserSessions(testUserId);
      expect(sessions.sessions).toHaveLength(1);
      expect(sessions.sessions[0].id).toBe(learnSession.id);

      // Verify session still exists in database but is hidden
      const hiddenSession = await db.session.findFirst({
        where: { id: funSession.id }
      });
      expect(hiddenSession).toBeTruthy();
      expect(hiddenSession.isHidden).toBe(true);
    });

    it('should include hidden sessions when explicitly requested', async () => {
      // Soft delete the FUN session
      await SessionService.softDeleteSession(funSession.id, testUserId);

      // Get sessions including hidden ones
      const sessions = await SessionService.getUserSessions(testUserId, { includeHidden: true });
      expect(sessions.sessions).toHaveLength(2);

      const hiddenSession = sessions.sessions.find(s => s.id === funSession.id);
      expect(hiddenSession).toBeTruthy();
      expect(hiddenSession.isHidden).toBe(true);
    });

    it('should not allow access to soft deleted session without includeHidden flag', async () => {
      // Soft delete the FUN session
      await SessionService.softDeleteSession(funSession.id, testUserId);

      // Try to get the session without includeHidden flag
      await expect(
        SessionService.getSession(funSession.id, testUserId, false, false)
      ).rejects.toThrow('Session not found');
    });

    it('should allow access to soft deleted session with includeHidden flag', async () => {
      // Soft delete the FUN session
      await SessionService.softDeleteSession(funSession.id, testUserId);

      // Get the session with includeHidden flag
      const session = await SessionService.getSession(funSession.id, testUserId, false, true);
      expect(session).toBeTruthy();
      expect(session.id).toBe(funSession.id);
      expect(session.isHidden).toBe(true);
    });
  });

  describe('Prevent Soft Delete of LEARN Sessions', () => {
    it('should not allow soft deletion of LEARN sessions', async () => {
      await expect(
        SessionService.softDeleteSession(learnSession.id, testUserId)
      ).rejects.toThrow('Only FUN mode sessions can be deleted');

      // Verify LEARN session is still accessible
      const sessions = await SessionService.getUserSessions(testUserId);
      expect(sessions.sessions).toHaveLength(2);
      
      const learnSessionStillExists = sessions.sessions.find(s => s.id === learnSession.id);
      expect(learnSessionStillExists).toBeTruthy();
      expect(learnSessionStillExists.isHidden).toBe(false);
    });
  });

  describe('Session Restoration', () => {
    it('should restore a soft deleted session', async () => {
      // Soft delete the FUN session
      await SessionService.softDeleteSession(funSession.id, testUserId);

      // Verify it's hidden
      const sessionsAfterDelete = await SessionService.getUserSessions(testUserId);
      expect(sessionsAfterDelete.sessions).toHaveLength(1);

      // Restore the session
      const result = await SessionService.restoreSession(funSession.id, testUserId);
      expect(result).toBe(true);

      // Verify it's visible again
      const sessionsAfterRestore = await SessionService.getUserSessions(testUserId);
      expect(sessionsAfterRestore.sessions).toHaveLength(2);
      
      const restoredSession = sessionsAfterRestore.sessions.find(s => s.id === funSession.id);
      expect(restoredSession).toBeTruthy();
      expect(restoredSession.isHidden).toBe(false);
    });

    it('should not restore a session that is not hidden', async () => {
      await expect(
        SessionService.restoreSession(funSession.id, testUserId)
      ).rejects.toThrow('Session not found');
    });
  });

  describe('Authorization', () => {
    it('should not allow soft deletion of another user\'s session', async () => {
      const otherUserId = 'other-user-id';
      
      await expect(
        SessionService.softDeleteSession(funSession.id, otherUserId)
      ).rejects.toThrow('Session not found');
    });

    it('should not allow restoration of another user\'s session', async () => {
      // Soft delete as the correct user
      await SessionService.softDeleteSession(funSession.id, testUserId);
      
      const otherUserId = 'other-user-id';
      
      await expect(
        SessionService.restoreSession(funSession.id, otherUserId)
      ).rejects.toThrow('Session not found');
    });
  });
});