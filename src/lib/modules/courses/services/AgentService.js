/**
 * Agent Service
 *
 * This service handles CRUD operations for agents within courses,
 * including validation and orchestration requirement management.
 */

import {
  createAgent,
  validateAgentConfiguration,
  requiresOrchestrationAgent,
  hasOrchestrationAgent,
  createOrchestrationInstructions,
  AGENT_TYPES,
  getAgentById,
  updateAgent,
  removeAgent
} from '../agents.js';
import { validateAgent } from '../types.js';

/**
 * Agent Service class
 */
export class AgentService {
  constructor(courseService) {
    this.courseService = courseService;
  }

  /**
   * Create a new agent for a course
   * @param {Object} agentData - Agent data
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Created agent or error
   */
  async createAgent(agentData, courseId) {
    try {
      // Get the course
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;

      // Create agent with course ID
      const agent = createAgent({
        ...agentData,
        courseId
      });

      // Validate agent
      const validation = validateAgent(agent);
      if (!validation.isValid) {
        throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`);
      }

      // Add agent to course
      const updatedAgents = [...course.agents, agent];

      // Check if orchestration agent is needed
      const needsOrchestration = requiresOrchestrationAgent(updatedAgents);
      const hasOrchestration = hasOrchestrationAgent(updatedAgents) || course.orchestrationAgent;

      if (needsOrchestration && !hasOrchestration) {
        // Auto-create orchestration agent
        // const orchestrationInstructions = createOrchestrationInstructions(updatedAgents);
        // This would be handled by the course service
      }

      // Update course with new agent
      const updateResult = await this.courseService.updateCourse(
        courseId,
        { agents: updatedAgents },
        course.creatorId,
        course.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        agent,
        message: 'Agent created successfully'
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }

  /**
   * Update an existing agent
   * @param {string} agentId - Agent ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async updateAgent(agentId, updates) {
    try {
      // Find the course containing this agent
      const courseResult = await this.findCourseByAgentId(agentId);
      if (!courseResult.success) {
        throw new Error('Agent not found');
      }

      const { course } = courseResult;

      // Update agent in course's agents array
      const updatedAgents = updateAgent(course.agents, agentId, updates);

      // Validate agent configuration
      const agentValidation = validateAgentConfiguration(updatedAgents, course.orchestrationAgent);
      if (!agentValidation.isValid) {
        throw new Error(`Agent configuration invalid: ${agentValidation.errors.join(', ')}`);
      }

      const updatedAgent = updatedAgents.find((a) => a.id === agentId);

      // Update course
      const updateResult = await this.courseService.updateCourse(
        course.id,
        { agents: updatedAgents },
        course.creatorId,
        course.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        agent: updatedAgent,
        message: 'Agent updated successfully'
      };
    } catch (error) {
      console.error('Error updating agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }

  /**
   * Delete an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAgent(agentId) {
    try {
      // Find the course containing this agent
      const courseResult = await this.findCourseByAgentId(agentId);
      if (!courseResult.success) {
        throw new Error('Agent not found');
      }

      const { course } = courseResult;

      // Remove agent from course's agents array
      const updatedAgents = removeAgent(course.agents, agentId);

      // Update course
      const updateResult = await this.courseService.updateCourse(
        course.id,
        { agents: updatedAgents },
        course.creatorId,
        course.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        message: 'Agent deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get an agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Agent data or error
   */
  async getAgent(agentId) {
    try {
      const courseResult = await this.findCourseByAgentId(agentId);
      if (!courseResult.success) {
        return {
          success: false,
          error: 'Agent not found',
          agent: null
        };
      }

      const { course } = courseResult;
      const agent = getAgentById(course.agents, agentId);

      return {
        success: true,
        agent,
        course: course
      };
    } catch (error) {
      console.error('Error getting agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }

  /**
   * List agents for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} List of agents
   */
  async listAgentsForCourse(courseId) {
    try {
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;

      return {
        success: true,
        agents: course.agents || [],
        orchestrationAgent: course.orchestrationAgent || null,
        total: (course.agents || []).length + (course.orchestrationAgent ? 1 : 0)
      };
    } catch (error) {
      console.error('Error listing agents:', error);
      return {
        success: false,
        error: error.message,
        agents: [],
        total: 0
      };
    }
  }

  /**
   * Find course by agent ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Course containing the agent
   */
  async findCourseByAgentId(agentId) {
    try {
      const coursesResult = await this.courseService.listCourses();
      if (!coursesResult.success) {
        throw new Error('Failed to list courses');
      }

      for (const course of coursesResult.courses) {
        const agent = getAgentById(course.agents || [], agentId);
        if (agent) {
          return {
            success: true,
            course,
            agent
          };
        }

        // Check orchestration agent
        if (course.orchestrationAgent && course.orchestrationAgent.id === agentId) {
          return {
            success: true,
            course,
            agent: course.orchestrationAgent
          };
        }
      }

      return {
        success: false,
        error: 'Agent not found in any course'
      };
    } catch (error) {
      console.error('Error finding course by agent ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate agent configuration for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Validation result
   */
  async validateCourseAgentConfiguration(courseId) {
    try {
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;
      const validation = validateAgentConfiguration(course.agents, course.orchestrationAgent);

      return {
        success: true,
        validation
      };
    } catch (error) {
      console.error('Error validating agent configuration:', error);
      return {
        success: false,
        error: error.message,
        validation: { isValid: false, errors: [error.message] }
      };
    }
  }

  /**
   * Create orchestration agent for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Creation result
   */
  async createOrchestrationAgent(courseId) {
    try {
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;

      // Check if orchestration agent is needed
      const needsOrchestration = requiresOrchestrationAgent(course.agents || []);
      if (!needsOrchestration) {
        return {
          success: false,
          error: 'Orchestration agent not needed for this course'
        };
      }

      // Create orchestration agent
      const instructions = createOrchestrationInstructions(course.agents || []);
      const orchestrationAgent = createAgent({
        name: `${course.name} Orchestrator`,
        type: AGENT_TYPES.ORCHESTRATION,
        instructions,
        courseId
      });

      // Update course
      const updateResult = await this.courseService.updateCourse(
        courseId,
        { orchestrationAgent },
        course.creatorId,
        course.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        agent: orchestrationAgent,
        message: 'Orchestration agent created successfully'
      };
    } catch (error) {
      console.error('Error creating orchestration agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }
}
