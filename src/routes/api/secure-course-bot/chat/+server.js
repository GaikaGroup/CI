/**
 * Secure Course Bot Chat API Endpoint
 * Handles secure bot conversations with comprehensive validation
 */

import { json, error } from '@sveltejs/kit';
import { SecureCourseBot, CourseConfiguration } from '$lib/modules/secure-course-bot/index.js';

// In-memory bot instances (in production, this would be managed differently)
const botInstances = new Map();

/**
 * POST /api/secure-course-bot/chat
 * Processes secure course bot interactions
 */
export async function POST({ request, url }) {
  try {
    const body = await request.json();
    
    // Validate request structure
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      throw error(400, validation.error);
    }
    
    const { message, userId, sessionId, courseId } = body;
    
    // Get or create bot instance for the course
    const bot = await getBotInstance(courseId);
    
    // Process the message through the secure pipeline
    const result = await bot.processMessage(message, userId, sessionId);
    
    // Return structured response
    return json({
      success: true,
      response: result.response,
      metadata: {
        securityCheck: result.securityResult?.isValid ?? true,
        relevanceClassification: result.relevanceResult?.classification,
        shouldLog: result.shouldLog,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('Secure course bot chat error:', err);
    
    // Return secure error response
    return json({
      success: false,
      response: "I'm experiencing technical difficulties. Please try again or contact your instructor for assistance.",
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * Validates incoming chat request
 * @param {Object} body - Request body
 * @returns {Object} - Validation result
 */
function validateChatRequest(body) {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }
  
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }
  
  if (body.message.length > 5000) {
    return { valid: false, error: 'Message is too long (max 5000 characters)' };
  }
  
  if (!body.userId || typeof body.userId !== 'string') {
    return { valid: false, error: 'User ID is required and must be a string' };
  }
  
  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return { valid: false, error: 'Session ID is required and must be a string' };
  }
  
  if (!body.courseId || typeof body.courseId !== 'string') {
    return { valid: false, error: 'Course ID is required and must be a string' };
  }
  
  return { valid: true };
}

/**
 * Gets or creates a bot instance for a course
 * @param {string} courseId - Course identifier
 * @returns {SecureCourseBot} - Bot instance
 */
async function getBotInstance(courseId) {
  if (botInstances.has(courseId)) {
    return botInstances.get(courseId);
  }
  
  // Load course configuration (in production, this would come from database)
  const courseConfig = await loadCourseConfiguration(courseId);
  
  // Create new bot instance
  const bot = new SecureCourseBot(courseConfig);
  botInstances.set(courseId, bot);
  
  return bot;
}

/**
 * Loads course configuration (placeholder for database integration)
 * @param {string} courseId - Course identifier
 * @returns {CourseConfiguration} - Course configuration
 */
async function loadCourseConfiguration(courseId) {
  // In production, this would load from database
  // For now, return a default configuration with course-specific data
  
  const courseConfigs = {
    'cs101': new CourseConfiguration(
      'Introduction to Computer Science',
      ['Programming Basics', 'Data Structures', 'Algorithms', 'Software Development'],
      {
        name: 'Dr. Smith',
        email: 'dr.smith@university.edu',
        officeHours: 'Monday 2-4 PM, Wednesday 10-12 PM'
      },
      'This course introduces fundamental concepts in computer science...',
      ['Understand basic programming concepts', 'Implement data structures', 'Analyze algorithms']
    ),
    'math201': new CourseConfiguration(
      'Calculus II',
      ['Integration', 'Series', 'Differential Equations', 'Applications'],
      {
        name: 'Prof. Johnson',
        email: 'prof.johnson@university.edu',
        officeHours: 'Tuesday 1-3 PM, Thursday 3-5 PM'
      },
      'Advanced calculus covering integration techniques and applications...',
      ['Master integration techniques', 'Understand infinite series', 'Solve differential equations']
    )
  };
  
  return courseConfigs[courseId] || CourseConfiguration.createDefault(`Course ${courseId}`);
}