/**
 * Secure Course Bot Configuration API Endpoint
 * Handles course configuration management with administrative authentication
 */

import { json, error } from '@sveltejs/kit';
import { CourseConfiguration } from '$lib/modules/secure-course-bot/index.js';

// In-memory configuration storage (in production, this would be a database)
const courseConfigurations = new Map();

/**
 * GET /api/secure-course-bot/config
 * Retrieves course configuration
 */
export async function GET({ url }) {
  try {
    const courseId = url.searchParams.get('courseId');
    
    if (!courseId) {
      throw error(400, 'Course ID is required');
    }
    
    // Verify administrative access (placeholder - in production, check JWT/session)
    const hasAdminAccess = await verifyAdminAccess(url.searchParams.get('adminToken'));
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    const config = courseConfigurations.get(courseId);
    if (!config) {
      throw error(404, 'Course configuration not found');
    }
    
    return json({
      success: true,
      configuration: config.toJSON()
    });
    
  } catch (err) {
    console.error('Configuration retrieval error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * POST /api/secure-course-bot/config
 * Creates new course configuration
 */
export async function POST({ request, url }) {
  try {
    const body = await request.json();
    
    // Verify administrative access
    const hasAdminAccess = await verifyAdminAccess(body.adminToken);
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    // Validate configuration data
    const validation = validateConfigurationData(body);
    if (!validation.valid) {
      throw error(400, validation.error);
    }
    
    const { courseId, courseName, courseTopics, instructorInfo, syllabusContent, learningObjectives } = body;
    
    // Check if configuration already exists
    if (courseConfigurations.has(courseId)) {
      throw error(409, 'Course configuration already exists');
    }
    
    // Create new configuration
    const config = new CourseConfiguration(
      courseName,
      courseTopics,
      instructorInfo,
      syllabusContent,
      learningObjectives
    );
    
    courseConfigurations.set(courseId, config);
    
    return json({
      success: true,
      message: 'Course configuration created successfully',
      configuration: config.toJSON()
    });
    
  } catch (err) {
    console.error('Configuration creation error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * PUT /api/secure-course-bot/config
 * Updates existing course configuration
 */
export async function PUT({ request, url }) {
  try {
    const body = await request.json();
    
    // Verify administrative access
    const hasAdminAccess = await verifyAdminAccess(body.adminToken);
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    const { courseId } = body;
    if (!courseId) {
      throw error(400, 'Course ID is required');
    }
    
    const config = courseConfigurations.get(courseId);
    if (!config) {
      throw error(404, 'Course configuration not found');
    }
    
    // Validate update data
    const validation = validateConfigurationUpdate(body);
    if (!validation.valid) {
      throw error(400, validation.error);
    }
    
    // Update configuration
    config.updateCourseContent({
      courseName: body.courseName,
      courseTopics: body.courseTopics,
      instructorInfo: body.instructorInfo,
      syllabusContent: body.syllabusContent,
      learningObjectives: body.learningObjectives
    });
    
    return json({
      success: true,
      message: 'Course configuration updated successfully',
      configuration: config.toJSON()
    });
    
  } catch (err) {
    console.error('Configuration update error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * DELETE /api/secure-course-bot/config
 * Deletes course configuration
 */
export async function DELETE({ url }) {
  try {
    const courseId = url.searchParams.get('courseId');
    const adminToken = url.searchParams.get('adminToken');
    
    if (!courseId) {
      throw error(400, 'Course ID is required');
    }
    
    // Verify administrative access
    const hasAdminAccess = await verifyAdminAccess(adminToken);
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    const deleted = courseConfigurations.delete(courseId);
    if (!deleted) {
      throw error(404, 'Course configuration not found');
    }
    
    return json({
      success: true,
      message: 'Course configuration deleted successfully'
    });
    
  } catch (err) {
    console.error('Configuration deletion error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * Validates configuration data for creation
 * @param {Object} data - Configuration data
 * @returns {Object} - Validation result
 */
function validateConfigurationData(data) {
  if (!data.courseId || typeof data.courseId !== 'string') {
    return { valid: false, error: 'Course ID is required and must be a string' };
  }
  
  if (!data.courseName || typeof data.courseName !== 'string') {
    return { valid: false, error: 'Course name is required and must be a string' };
  }
  
  if (!Array.isArray(data.courseTopics)) {
    return { valid: false, error: 'Course topics must be an array' };
  }
  
  if (data.instructorInfo && typeof data.instructorInfo !== 'object') {
    return { valid: false, error: 'Instructor info must be an object' };
  }
  
  if (data.syllabusContent && typeof data.syllabusContent !== 'string') {
    return { valid: false, error: 'Syllabus content must be a string' };
  }
  
  if (data.learningObjectives && !Array.isArray(data.learningObjectives)) {
    return { valid: false, error: 'Learning objectives must be an array' };
  }
  
  return { valid: true };
}

/**
 * Validates configuration update data
 * @param {Object} data - Update data
 * @returns {Object} - Validation result
 */
function validateConfigurationUpdate(data) {
  // Similar validation but fields are optional for updates
  if (data.courseName && typeof data.courseName !== 'string') {
    return { valid: false, error: 'Course name must be a string' };
  }
  
  if (data.courseTopics && !Array.isArray(data.courseTopics)) {
    return { valid: false, error: 'Course topics must be an array' };
  }
  
  if (data.instructorInfo && typeof data.instructorInfo !== 'object') {
    return { valid: false, error: 'Instructor info must be an object' };
  }
  
  if (data.syllabusContent && typeof data.syllabusContent !== 'string') {
    return { valid: false, error: 'Syllabus content must be a string' };
  }
  
  if (data.learningObjectives && !Array.isArray(data.learningObjectives)) {
    return { valid: false, error: 'Learning objectives must be an array' };
  }
  
  return { valid: true };
}

/**
 * Verifies administrative access (placeholder implementation)
 * @param {string} adminToken - Administrative token
 * @returns {boolean} - Whether access is granted
 */
async function verifyAdminAccess(adminToken) {
  // In production, this would:
  // - Verify JWT tokens
  // - Check user roles in database
  // - Validate session authentication
  // - Check permissions for specific courses
  
  // For development, accept a simple token
  return adminToken === 'admin-dev-token-123';
}