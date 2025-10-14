/**
 * LoggingService - Tracks security incidents and user interactions
 * Provides comprehensive logging, monitoring, and escalation for security violations
 */

export class LoggingService {
  constructor() {
    this.incidents = [];
    this.sessionAttempts = new Map(); // Track attempts per session
    this.userAttempts = new Map(); // Track attempts per user
    this.escalationThresholds = {
      repeated_attempts: 3,
      sophisticated_attack: 1,
      academic_integrity: 2
    };
  }

  /**
   * Logs a security incident
   * @param {Object} incident - Incident details
   * @param {string} incident.userId - User identifier
   * @param {string} incident.sessionId - Session identifier
   * @param {string} incident.incidentType - Type of incident
   * @param {string} incident.message - Original user message
   * @param {string} incident.response - Bot response
   * @param {string} severity - Incident severity ('low', 'medium', 'high')
   * @param {Object} context - Additional context information
   * @returns {string} - Incident ID
   */
  logSecurityIncident(incident, severity, context = {}) {
    const incidentId = this.generateIncidentId();
    const timestamp = new Date();

    const securityIncident = {
      id: incidentId,
      timestamp,
      userId: incident.userId,
      sessionId: incident.sessionId,
      incidentType: incident.incidentType,
      message: incident.message,
      response: incident.response,
      severity,
      context,
      escalated: false
    };

    this.incidents.push(securityIncident);

    // Track repeated attempts
    this.trackRepeatedAttempts(incident.userId, incident.sessionId, incident.incidentType);

    // Check for escalation
    this.checkEscalation(securityIncident);

    // Log to console for development (in production, this would go to proper logging system)
    console.warn(
      `[SECURITY INCIDENT] ${incidentId}: ${incident.incidentType} by user ${incident.userId}`,
      {
        severity,
        message: incident.message.substring(0, 100) + '...',
        context
      }
    );

    return incidentId;
  }

  /**
   * Logs an academic integrity violation
   * @param {Object} attempt - Violation attempt details
   * @param {string} attempt.userId - User identifier
   * @param {string} attempt.sessionId - Session identifier
   * @param {string} attempt.message - Original user message
   * @param {string} attempt.response - Bot response
   * @param {Object} context - Additional context
   * @returns {string} - Incident ID
   */
  logAcademicIntegrityViolation(attempt, context = {}) {
    return this.logSecurityIncident(
      {
        ...attempt,
        incidentType: 'academic_integrity_violation'
      },
      'medium',
      {
        ...context,
        category: 'academic_integrity',
        requiresReview: true
      }
    );
  }

  /**
   * Tracks repeated attempts by user and session
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @param {string} incidentType - Type of incident
   */
  trackRepeatedAttempts(userId, sessionId, incidentType) {
    // Track by session
    const sessionKey = `${sessionId}:${incidentType}`;
    const sessionCount = (this.sessionAttempts.get(sessionKey) || 0) + 1;
    this.sessionAttempts.set(sessionKey, sessionCount);

    // Track by user
    const userKey = `${userId}:${incidentType}`;
    const userCount = (this.userAttempts.get(userKey) || 0) + 1;
    this.userAttempts.set(userKey, userCount);

    // Log escalation if thresholds exceeded
    if (sessionCount >= this.escalationThresholds.repeated_attempts) {
      this.logEscalation(userId, sessionId, 'repeated_session_attempts', {
        incidentType,
        attemptCount: sessionCount
      });
    }

    if (userCount >= this.escalationThresholds.repeated_attempts * 2) {
      this.logEscalation(userId, sessionId, 'repeated_user_attempts', {
        incidentType,
        attemptCount: userCount
      });
    }
  }

  /**
   * Checks if an incident should be escalated
   * @param {SecurityIncident} incident - Security incident
   */
  checkEscalation(incident) {
    const shouldEscalate =
      incident.severity === 'high' ||
      incident.incidentType === 'sophisticated_attack' ||
      incident.context.requiresReview ||
      this.isRepeatedViolator(incident.userId, incident.sessionId);

    if (shouldEscalate && !incident.escalated) {
      this.escalateIncident(incident);
    }
  }

  /**
   * Escalates an incident for administrative review
   * @param {SecurityIncident} incident - Incident to escalate
   */
  escalateIncident(incident) {
    incident.escalated = true;
    incident.escalatedAt = new Date();

    this.logEscalation(incident.userId, incident.sessionId, 'incident_escalation', {
      originalIncidentId: incident.id,
      incidentType: incident.incidentType,
      severity: incident.severity
    });
  }

  /**
   * Logs an escalation event
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @param {string} escalationType - Type of escalation
   * @param {Object} context - Escalation context
   */
  logEscalation(userId, sessionId, escalationType, context) {
    const escalationId = this.generateIncidentId();

    console.error(`[ESCALATION] ${escalationId}: ${escalationType} for user ${userId}`, {
      sessionId,
      context,
      timestamp: new Date()
    });

    // In production, this would trigger administrative alerts
    this.triggerAdministrativeAlert(escalationType, userId, sessionId, context);
  }

  /**
   * Triggers administrative alert (placeholder for production implementation)
   * @param {string} escalationType - Type of escalation
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @param {Object} context - Alert context
   */
  triggerAdministrativeAlert(escalationType, userId, sessionId, context) {
    // In production, this would:
    // - Send email alerts to administrators
    // - Create tickets in admin dashboard
    // - Trigger automated responses if needed

    console.warn(`[ADMIN ALERT] ${escalationType} requires review`, {
      userId,
      sessionId,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Checks if a user/session is a repeated violator
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @returns {boolean} - Whether user is a repeated violator
   */
  isRepeatedViolator(userId, sessionId) {
    const recentIncidents = this.getRecentIncidents(userId, sessionId, 24 * 60 * 60 * 1000); // 24 hours
    return recentIncidents.length >= this.escalationThresholds.repeated_attempts;
  }

  /**
   * Gets recent incidents for a user/session
   * @param {string} userId - User identifier
   * @param {string} sessionId - Session identifier
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {SecurityIncident[]} - Recent incidents
   */
  getRecentIncidents(userId, sessionId, timeWindowMs) {
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    return this.incidents.filter(
      (incident) =>
        (incident.userId === userId || incident.sessionId === sessionId) &&
        incident.timestamp >= cutoffTime
    );
  }

  /**
   * Gets incidents by type
   * @param {string} incidentType - Type of incident
   * @param {number} limit - Maximum number of incidents to return
   * @returns {SecurityIncident[]} - Incidents of specified type
   */
  getIncidentsByType(incidentType, limit = 100) {
    return this.incidents
      .filter((incident) => incident.incidentType === incidentType)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Gets incidents by severity
   * @param {string} severity - Severity level
   * @param {number} limit - Maximum number of incidents to return
   * @returns {SecurityIncident[]} - Incidents of specified severity
   */
  getIncidentsBySeverity(severity, limit = 100) {
    return this.incidents
      .filter((incident) => incident.severity === severity)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Gets all incidents for a user
   * @param {string} userId - User identifier
   * @param {number} limit - Maximum number of incidents to return
   * @returns {SecurityIncident[]} - User's incidents
   */
  getUserIncidents(userId, limit = 50) {
    return this.incidents
      .filter((incident) => incident.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Gets security statistics
   * @returns {Object} - Security statistics
   */
  getSecurityStats() {
    const stats = {
      totalIncidents: this.incidents.length,
      incidentsByType: {},
      incidentsBySeverity: {},
      escalatedIncidents: 0,
      uniqueUsers: new Set(),
      uniqueSessions: new Set()
    };

    this.incidents.forEach((incident) => {
      // Count by type
      stats.incidentsByType[incident.incidentType] =
        (stats.incidentsByType[incident.incidentType] || 0) + 1;

      // Count by severity
      stats.incidentsBySeverity[incident.severity] =
        (stats.incidentsBySeverity[incident.severity] || 0) + 1;

      // Count escalated
      if (incident.escalated) {
        stats.escalatedIncidents++;
      }

      // Track unique users and sessions
      stats.uniqueUsers.add(incident.userId);
      stats.uniqueSessions.add(incident.sessionId);
    });

    // Convert sets to counts
    stats.uniqueUsers = stats.uniqueUsers.size;
    stats.uniqueSessions = stats.uniqueSessions.size;

    return stats;
  }

  /**
   * Generates a unique incident ID
   * @returns {string} - Unique incident ID
   */
  generateIncidentId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `INC-${timestamp}-${random}`;
  }

  /**
   * Clears old incidents (for maintenance)
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} - Number of incidents cleared
   */
  clearOldIncidents(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    // 30 days default
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    const initialCount = this.incidents.length;

    this.incidents = this.incidents.filter((incident) => incident.timestamp >= cutoffTime);

    return initialCount - this.incidents.length;
  }

  /**
   * Exports incidents for analysis
   * @param {Object} filters - Export filters
   * @returns {SecurityIncident[]} - Filtered incidents
   */
  exportIncidents(filters = {}) {
    let filtered = [...this.incidents];

    if (filters.startDate) {
      filtered = filtered.filter((incident) => incident.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((incident) => incident.timestamp <= filters.endDate);
    }

    if (filters.severity) {
      filtered = filtered.filter((incident) => incident.severity === filters.severity);
    }

    if (filters.incidentType) {
      filtered = filtered.filter((incident) => incident.incidentType === filters.incidentType);
    }

    if (filters.userId) {
      filtered = filtered.filter((incident) => incident.userId === filters.userId);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }
}
