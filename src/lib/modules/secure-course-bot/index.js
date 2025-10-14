/**
 * Secure Course Bot Module
 * Main entry point for the security-hardened course assistance bot system
 */

export { SecureCourseBot } from './SecureCourseBot.js';
export { SecurityValidator } from './SecurityValidator.js';
export { RelevanceAnalyzer } from './RelevanceAnalyzer.js';
export { ResponseGenerator } from './ResponseGenerator.js';
export { CourseConfiguration } from './CourseConfiguration.js';
export { LoggingService } from './LoggingService.js';

// Re-export types for convenience (JSDoc types are available through imports)
export * from './types.js';