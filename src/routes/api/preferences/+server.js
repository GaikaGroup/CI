/**
 * User Preferences API Endpoints
 * 
 * GET /api/preferences - Get user preferences
 * POST /api/preferences - Set user preferences
 * PUT /api/preferences - Update user preferences
 */

import { json } from '@sveltejs/kit';
import UserPreferenceService from '$lib/services/UserPreferenceService.js';

/**
 * GET /api/preferences
 * 
 * Query parameters:
 * - key: Get specific preference by key
 */
export async function GET({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const key = url.searchParams.get('key');

    if (key) {
      // Get specific preference
      const result = await UserPreferenceService.getUserPreference(locals.user.id, key);

      if (!result.success) {
        return json({ message: result.error }, { status: 404 });
      }

      return json({
        key: result.preference.key,
        value: result.preference.value
      });
    } else {
      // Get all preferences
      const result = await UserPreferenceService.getUserPreferences(locals.user.id);

      if (!result.success) {
        return json({ message: result.error }, { status: 400 });
      }

      return json({
        preferences: result.preferences
      });
    }

  } catch (error) {
    console.error('Error in GET /api/preferences:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/preferences
 * 
 * Body: {
 *   key: string,
 *   value: any
 * } | {
 *   preferences: { [key: string]: any }
 * }
 */
export async function POST({ request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    if (body.key && body.value !== undefined) {
      // Set single preference
      const result = await UserPreferenceService.setUserPreference(
        locals.user.id,
        body.key,
        body.value
      );

      if (!result.success) {
        return json({ message: result.error }, { status: 400 });
      }

      return json({
        message: 'Preference saved successfully',
        preference: {
          key: result.preference.key,
          value: result.preference.value
        }
      });

    } else if (body.preferences && typeof body.preferences === 'object') {
      // Set multiple preferences
      const result = await UserPreferenceService.setUserPreferences(
        locals.user.id,
        body.preferences
      );

      if (!result.success) {
        return json({ message: result.error }, { status: 400 });
      }

      return json({
        message: 'Preferences saved successfully',
        count: result.preferences.length
      });

    } else {
      return json({ message: 'Invalid request body' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in POST /api/preferences:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/preferences
 * 
 * Body: {
 *   key: string,
 *   value: any
 * }
 */
export async function PUT({ request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { key, value } = await request.json();

    if (!key) {
      return json({ message: 'Preference key is required' }, { status: 400 });
    }

    const result = await UserPreferenceService.setUserPreference(
      locals.user.id,
      key,
      value
    );

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({
      message: 'Preference updated successfully',
      preference: {
        key: result.preference.key,
        value: result.preference.value
      }
    });

  } catch (error) {
    console.error('Error in PUT /api/preferences:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/preferences
 * 
 * Query parameters:
 * - key: Preference key to delete
 */
export async function DELETE({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const key = url.searchParams.get('key');

    if (!key) {
      return json({ message: 'Preference key is required' }, { status: 400 });
    }

    const result = await UserPreferenceService.deleteUserPreference(locals.user.id, key);

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({
      message: 'Preference deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/preferences:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}