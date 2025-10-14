/**
 * Secure Course Bot Administrative Incidents API
 * Provides security incident review and monitoring capabilities
 */

import { json, error } from '@sveltejs/kit';

// In production, this would connect to the actual logging service instances
// For now, we'll simulate with a shared incidents store
const globalIncidents = [];

/**
 * GET /api/secure-course-bot/admin/incidents
 * Retrieves security incidents with filtering and pagination
 */
export async function GET({ url }) {
  try {
    // Verify administrative access
    const hasAdminAccess = await verifyAdminAccess(url.searchParams.get('adminToken'));
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    // Parse query parameters
    const filters = parseIncidentFilters(url.searchParams);
    const pagination = parsePagination(url.searchParams);
    
    // Filter incidents
    let filteredIncidents = filterIncidents(globalIncidents, filters);
    
    // Apply pagination
    const total = filteredIncidents.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);
    
    return json({
      success: true,
      incidents: paginatedIncidents,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      },
      filters: filters
    });
    
  } catch (err) {
    console.error('Incidents retrieval error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * GET /api/secure-course-bot/admin/incidents/stats
 * Retrieves security statistics and metrics
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    
    // Verify administrative access
    const hasAdminAccess = await verifyAdminAccess(body.adminToken);
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    // Calculate statistics
    const stats = calculateSecurityStats(globalIncidents, body.timeRange);
    
    return json({
      success: true,
      stats
    });
    
  } catch (err) {
    console.error('Stats calculation error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * PUT /api/secure-course-bot/admin/incidents/export
 * Exports security incidents for analysis
 */
export async function PUT({ request }) {
  try {
    const body = await request.json();
    
    // Verify administrative access
    const hasAdminAccess = await verifyAdminAccess(body.adminToken);
    if (!hasAdminAccess) {
      throw error(403, 'Administrative access required');
    }
    
    // Parse export filters
    const filters = body.filters || {};
    const format = body.format || 'json';
    
    // Filter incidents for export
    const exportIncidents = filterIncidents(globalIncidents, filters);
    
    // Format export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      filters,
      totalIncidents: exportIncidents.length,
      incidents: exportIncidents
    };
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportIncidents);
      return new Response(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="security-incidents.csv"'
        }
      });
    }
    
    return json({
      success: true,
      exportData
    });
    
  } catch (err) {
    console.error('Export error:', err);
    return json({
      success: false,
      error: err.message
    }, { status: err.status || 500 });
  }
}

/**
 * Parses incident filter parameters
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {Object} - Parsed filters
 */
function parseIncidentFilters(searchParams) {
  const filters = {};
  
  if (searchParams.get('severity')) {
    filters.severity = searchParams.get('severity');
  }
  
  if (searchParams.get('incidentType')) {
    filters.incidentType = searchParams.get('incidentType');
  }
  
  if (searchParams.get('userId')) {
    filters.userId = searchParams.get('userId');
  }
  
  if (searchParams.get('courseId')) {
    filters.courseId = searchParams.get('courseId');
  }
  
  if (searchParams.get('startDate')) {
    filters.startDate = new Date(searchParams.get('startDate'));
  }
  
  if (searchParams.get('endDate')) {
    filters.endDate = new Date(searchParams.get('endDate'));
  }
  
  if (searchParams.get('escalated')) {
    filters.escalated = searchParams.get('escalated') === 'true';
  }
  
  return filters;
}

/**
 * Parses pagination parameters
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {Object} - Pagination settings
 */
function parsePagination(searchParams) {
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 1000); // Max 1000 per page
  
  return { page, limit };
}

/**
 * Filters incidents based on criteria
 * @param {Array} incidents - All incidents
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered incidents
 */
function filterIncidents(incidents, filters) {
  return incidents.filter(incident => {
    if (filters.severity && incident.severity !== filters.severity) {
      return false;
    }
    
    if (filters.incidentType && incident.incidentType !== filters.incidentType) {
      return false;
    }
    
    if (filters.userId && incident.userId !== filters.userId) {
      return false;
    }
    
    if (filters.courseId && incident.context?.courseId !== filters.courseId) {
      return false;
    }
    
    if (filters.startDate && incident.timestamp < filters.startDate) {
      return false;
    }
    
    if (filters.endDate && incident.timestamp > filters.endDate) {
      return false;
    }
    
    if (filters.escalated !== undefined && incident.escalated !== filters.escalated) {
      return false;
    }
    
    return true;
  });
}

/**
 * Calculates security statistics
 * @param {Array} incidents - All incidents
 * @param {Object} timeRange - Time range for statistics
 * @returns {Object} - Security statistics
 */
function calculateSecurityStats(incidents, timeRange = {}) {
  const now = new Date();
  const startDate = timeRange.startDate ? new Date(timeRange.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = timeRange.endDate ? new Date(timeRange.endDate) : now;
  
  const filteredIncidents = incidents.filter(incident => 
    incident.timestamp >= startDate && incident.timestamp <= endDate
  );
  
  const stats = {
    timeRange: { startDate, endDate },
    totalIncidents: filteredIncidents.length,
    incidentsByType: {},
    incidentsBySeverity: {},
    escalatedIncidents: 0,
    uniqueUsers: new Set(),
    uniqueSessions: new Set(),
    topViolators: {},
    trendsOverTime: calculateTrends(filteredIncidents, startDate, endDate)
  };
  
  filteredIncidents.forEach(incident => {
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
    
    // Track top violators
    stats.topViolators[incident.userId] = 
      (stats.topViolators[incident.userId] || 0) + 1;
  });
  
  // Convert sets to counts
  stats.uniqueUsers = stats.uniqueUsers.size;
  stats.uniqueSessions = stats.uniqueSessions.size;
  
  // Sort top violators
  stats.topViolators = Object.entries(stats.topViolators)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .reduce((obj, [userId, count]) => {
      obj[userId] = count;
      return obj;
    }, {});
  
  return stats;
}

/**
 * Calculates trends over time
 * @param {Array} incidents - Filtered incidents
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Trend data
 */
function calculateTrends(incidents, startDate, endDate) {
  const trends = [];
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let date = new Date(startDate); date <= endDate; date.setTime(date.getTime() + dayMs)) {
    const dayStart = new Date(date);
    const dayEnd = new Date(date.getTime() + dayMs);
    
    const dayIncidents = incidents.filter(incident => 
      incident.timestamp >= dayStart && incident.timestamp < dayEnd
    );
    
    trends.push({
      date: dayStart.toISOString().split('T')[0],
      count: dayIncidents.length,
      severity: {
        high: dayIncidents.filter(i => i.severity === 'high').length,
        medium: dayIncidents.filter(i => i.severity === 'medium').length,
        low: dayIncidents.filter(i => i.severity === 'low').length
      }
    });
  }
  
  return trends;
}

/**
 * Converts incidents to CSV format
 * @param {Array} incidents - Incidents to convert
 * @returns {string} - CSV data
 */
function convertToCSV(incidents) {
  const headers = ['ID', 'Timestamp', 'User ID', 'Session ID', 'Incident Type', 'Severity', 'Escalated', 'Message Preview'];
  const rows = incidents.map(incident => [
    incident.id,
    incident.timestamp.toISOString(),
    incident.userId,
    incident.sessionId,
    incident.incidentType,
    incident.severity,
    incident.escalated ? 'Yes' : 'No',
    incident.message.substring(0, 100).replace(/"/g, '""') // Escape quotes and truncate
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
}

/**
 * Verifies administrative access (placeholder implementation)
 * @param {string} adminToken - Administrative token
 * @returns {boolean} - Whether access is granted
 */
async function verifyAdminAccess(adminToken) {
  // In production, this would verify proper administrative credentials
  return adminToken === 'admin-dev-token-123';
}