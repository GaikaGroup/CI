import { describe, it, expect } from 'vitest';
import { 
  isAdmin, 
  requireAdmin, 
  canAccessHiddenSessions, 
  canRestoreSessions,
  getAdminPermissions 
} from '$lib/modules/auth/utils/adminUtils.js';

describe('Admin Utils', () => {
  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      const adminUser = { id: '1', role: 'admin' };
      expect(isAdmin(adminUser)).toBe(true);
    });

    it('should return false for non-admin user', () => {
      const regularUser = { id: '2', role: 'student' };
      expect(isAdmin(regularUser)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('requireAdmin', () => {
    it('should not throw for admin user', () => {
      const adminUser = { id: '1', role: 'admin' };
      expect(() => requireAdmin(adminUser)).not.toThrow();
    });

    it('should throw for non-admin user', () => {
      const regularUser = { id: '2', role: 'student' };
      expect(() => requireAdmin(regularUser)).toThrow('Admin access required');
    });

    it('should throw for null user', () => {
      expect(() => requireAdmin(null)).toThrow('Admin access required');
    });
  });

  describe('canAccessHiddenSessions', () => {
    it('should return true for admin user', () => {
      const adminUser = { id: '1', role: 'admin' };
      expect(canAccessHiddenSessions(adminUser)).toBe(true);
    });

    it('should return false for non-admin user', () => {
      const regularUser = { id: '2', role: 'student' };
      expect(canAccessHiddenSessions(regularUser)).toBe(false);
    });
  });

  describe('canRestoreSessions', () => {
    it('should return true for admin user', () => {
      const adminUser = { id: '1', role: 'admin' };
      expect(canRestoreSessions(adminUser)).toBe(true);
    });

    it('should return false for non-admin user', () => {
      const regularUser = { id: '2', role: 'student' };
      expect(canRestoreSessions(regularUser)).toBe(false);
    });
  });

  describe('getAdminPermissions', () => {
    it('should return all permissions for admin user', () => {
      const adminUser = { id: '1', role: 'admin' };
      const permissions = getAdminPermissions(adminUser);
      
      expect(permissions).toEqual({
        isAdmin: true,
        canViewHiddenSessions: true,
        canRestoreSessions: true,
        canHardDeleteSessions: true,
        canViewAllUsers: true,
        canManageUsers: true
      });
    });

    it('should return no permissions for non-admin user', () => {
      const regularUser = { id: '2', role: 'student' };
      const permissions = getAdminPermissions(regularUser);
      
      expect(permissions).toEqual({
        isAdmin: false,
        canViewHiddenSessions: false,
        canRestoreSessions: false,
        canHardDeleteSessions: false,
        canViewAllUsers: false,
        canManageUsers: false
      });
    });

    it('should return no permissions for null user', () => {
      const permissions = getAdminPermissions(null);
      
      expect(permissions).toEqual({
        isAdmin: false,
        canViewHiddenSessions: false,
        canRestoreSessions: false,
        canHardDeleteSessions: false,
        canViewAllUsers: false,
        canManageUsers: false
      });
    });
  });
});