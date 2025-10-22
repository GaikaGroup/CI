/**
 * User Preference Service
 *
 * Handles user preferences and settings storage in database
 */

import { prisma } from '../database/client.js';

export class UserPreferenceService {
  /**
   * Get user preference by key
   */
  static async getUserPreference(userId, key) {
    try {
      const preference = await prisma.userPreference.findUnique({
        where: {
          userId_key: {
            userId,
            key
          }
        }
      });

      if (!preference) {
        return { success: false, error: 'Preference not found' };
      }

      return { success: true, preference };
    } catch (error) {
      console.error('Error getting user preference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set user preference
   */
  static async setUserPreference(userId, key, value) {
    try {
      const preference = await prisma.userPreference.upsert({
        where: {
          userId_key: {
            userId,
            key
          }
        },
        update: {
          value,
          updatedAt: new Date()
        },
        create: {
          userId,
          key,
          value
        }
      });

      return { success: true, preference };
    } catch (error) {
      console.error('Error setting user preference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all user preferences
   */
  static async getUserPreferences(userId) {
    try {
      const preferences = await prisma.userPreference.findMany({
        where: { userId },
        orderBy: { key: 'asc' }
      });

      // Convert to key-value object for easier use
      const preferencesObj = preferences.reduce((acc, pref) => {
        acc[pref.key] = pref.value;
        return acc;
      }, {});

      return { success: true, preferences: preferencesObj, raw: preferences };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set multiple user preferences
   */
  static async setUserPreferences(userId, preferences) {
    try {
      const operations = Object.entries(preferences).map(([key, value]) =>
        prisma.userPreference.upsert({
          where: {
            userId_key: {
              userId,
              key
            }
          },
          update: {
            value,
            updatedAt: new Date()
          },
          create: {
            userId,
            key,
            value
          }
        })
      );

      const results = await Promise.all(operations);

      return { success: true, preferences: results };
    } catch (error) {
      console.error('Error setting user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user preference
   */
  static async deleteUserPreference(userId, key) {
    try {
      await prisma.userPreference.delete({
        where: {
          userId_key: {
            userId,
            key
          }
        }
      });

      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        return { success: false, error: 'Preference not found' };
      }
      console.error('Error deleting user preference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get theme preference
   */
  static async getTheme(userId) {
    const result = await this.getUserPreference(userId, 'theme');
    return result.success ? result.preference.value : 'light';
  }

  /**
   * Set theme preference
   */
  static async setTheme(userId, theme) {
    const validThemes = ['light', 'dark', 'auto'];
    if (!validThemes.includes(theme)) {
      return { success: false, error: 'Invalid theme' };
    }

    return this.setUserPreference(userId, 'theme', theme);
  }

  /**
   * Get language preference
   */
  static async getLanguage(userId) {
    const result = await this.getUserPreference(userId, 'language');
    return result.success ? result.preference.value : 'en';
  }

  /**
   * Set language preference
   */
  static async setLanguage(userId, language) {
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
    if (!validLanguages.includes(language)) {
      return { success: false, error: 'Invalid language' };
    }

    return this.setUserPreference(userId, 'language', language);
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(userId) {
    const result = await this.getUserPreference(userId, 'notifications');

    // Default notification settings
    const defaultNotifications = {
      email: true,
      push: true,
      courseUpdates: true,
      enrollmentUpdates: true,
      systemAlerts: true,
      marketing: false
    };

    return result.success ? result.preference.value : defaultNotifications;
  }

  /**
   * Set notification preferences
   */
  static async setNotificationPreferences(userId, notifications) {
    return this.setUserPreference(userId, 'notifications', notifications);
  }

  /**
   * Get accessibility preferences
   */
  static async getAccessibilityPreferences(userId) {
    const result = await this.getUserPreference(userId, 'accessibility');

    // Default accessibility settings
    const defaultAccessibility = {
      fontSize: 'medium',
      highContrast: false,
      reduceMotion: false,
      screenReader: false,
      keyboardNavigation: false
    };

    return result.success ? result.preference.value : defaultAccessibility;
  }

  /**
   * Set accessibility preferences
   */
  static async setAccessibilityPreferences(userId, accessibility) {
    return this.setUserPreference(userId, 'accessibility', accessibility);
  }

  /**
   * Get learning preferences
   */
  static async getLearningPreferences(userId) {
    const result = await this.getUserPreference(userId, 'learning');

    // Default learning settings
    const defaultLearning = {
      preferredMode: 'fun',
      difficulty: 'medium',
      sessionLength: 30, // minutes
      reminderFrequency: 'daily',
      autoSave: true,
      voiceEnabled: true
    };

    return result.success ? result.preference.value : defaultLearning;
  }

  /**
   * Set learning preferences
   */
  static async setLearningPreferences(userId, learning) {
    return this.setUserPreference(userId, 'learning', learning);
  }

  /**
   * Sync preferences with localStorage (for migration)
   */
  static async syncWithLocalStorage(userId, localStorageData) {
    try {
      const preferencesToSync = {};

      // Map localStorage keys to preference keys
      if (localStorageData.theme) {
        preferencesToSync.theme = localStorageData.theme;
      }

      if (localStorageData.language) {
        preferencesToSync.language = localStorageData.language;
      }

      if (localStorageData.adminDashboardData) {
        preferencesToSync.adminDashboard = localStorageData.adminDashboardData;
      }

      // Add any other localStorage data that should be preserved
      if (Object.keys(preferencesToSync).length > 0) {
        await this.setUserPreferences(userId, preferencesToSync);
      }

      return { success: true, synced: Object.keys(preferencesToSync) };
    } catch (error) {
      console.error('Error syncing with localStorage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export user preferences
   */
  static async exportUserPreferences(userId) {
    try {
      const result = await this.getUserPreferences(userId);

      if (!result.success) {
        return result;
      }

      const exportData = {
        userId,
        preferences: result.preferences,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return { success: true, exportData };
    } catch (error) {
      console.error('Error exporting preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import user preferences
   */
  static async importUserPreferences(userId, importData) {
    try {
      if (!importData.preferences || typeof importData.preferences !== 'object') {
        return { success: false, error: 'Invalid import data' };
      }

      const result = await this.setUserPreferences(userId, importData.preferences);

      return result;
    } catch (error) {
      console.error('Error importing preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset user preferences to defaults
   */
  static async resetUserPreferences(userId) {
    try {
      // Delete all existing preferences
      await prisma.userPreference.deleteMany({
        where: { userId }
      });

      // Set default preferences
      const defaultPreferences = {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          courseUpdates: true,
          enrollmentUpdates: true,
          systemAlerts: true,
          marketing: false
        },
        accessibility: {
          fontSize: 'medium',
          highContrast: false,
          reduceMotion: false,
          screenReader: false,
          keyboardNavigation: false
        },
        learning: {
          preferredMode: 'fun',
          difficulty: 'medium',
          sessionLength: 30,
          reminderFrequency: 'daily',
          autoSave: true,
          voiceEnabled: true
        }
      };

      await this.setUserPreferences(userId, defaultPreferences);

      return { success: true };
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return { success: false, error: error.message };
    }
  }
}

export default UserPreferenceService;
