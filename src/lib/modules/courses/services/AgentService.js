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
} from '../../subjects/agents.js';
import { validateAgent } from '../../subjects/types.js';

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
        throw new Error(
          'Adding this agent requires an orchestration agent. Please create an orchestration agent first.'
        );
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

      // Get the updated agent for return
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

      // If we're removing the last course agent and there's an orchestration agent, remove it too
      const courseAgents = updatedAgents.filter((a) => a.type === AGENT_TYPES.SUBJECT);
      let orchestrationAgent = course.orchestrationAgent;

      if (courseAgents.length <= 1 && orchestrationAgent) {
        orchestrationAgent = null;
      }

      // Update course
      const updateResult = await this.courseService.updateCourse(
        course.id,
        {
          agents: updatedAgents,
          orchestrationAgent
        },
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
   * Validate agent configuration for a course
   * @param {Object} agentData - Agent data to validate
   * @returns {Object} Validation result
   */
  validateAgentConfiguration(agentData) {
    return validateAgent(agentData);
  }

  /**
   * Check orchestration requirement for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Orchestration requirement result
   */
  async checkOrchestrationRequirement(courseId) {
    try {
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;
      const needsOrchestration = requiresOrchestrationAgent(course.agents);
      const hasOrchestration = hasOrchestrationAgent(course.agents) || course.orchestrationAgent;

      return {
        success: true,
        needsOrchestration,
        hasOrchestration,
        isValid: !needsOrchestration || hasOrchestration
      };
    } catch (error) {
      console.error('Error checking orchestration requirement:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create an orchestration agent for a course
   * @param {string} courseId - Course ID
   * @param {Object} orchestrationData - Orchestration agent data
   * @returns {Promise<Object>} Created orchestration agent or error
   */
  async createOrchestrationAgent(courseId, orchestrationData = {}) {
    try {
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;
      const courseAgents = course.agents.filter((agent) => agent.type === AGENT_TYPES.SUBJECT);

      // Generate default instructions if not provided
      const instructions =
        orchestrationData.instructions || createOrchestrationInstructions(courseAgents);

      // Create orchestration agent
      const orchestrationAgent = createAgent({
        name: orchestrationData.name || `${course.name} Orchestrator`,
        type: AGENT_TYPES.ORCHESTRATION,
        instructions,
        courseId,
        ...orchestrationData
      });

      // Validate orchestration agent
      const validation = validateAgent(orchestrationAgent);
      if (!validation.isValid) {
        throw new Error(`Orchestration agent validation failed: ${validation.errors.join(', ')}`);
      }

      // Update course with orchestration agent
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

  /**
   * Find course by agent ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Course and agent or error
   */
  async findCourseByAgentId(agentId) {
    try {
      const coursesResult = await this.courseService.listCourses();
      if (!coursesResult.success) {
        throw new Error('Failed to load courses');
      }

      for (const course of coursesResult.courses) {
        const agent = getAgentById(course.agents, agentId);
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
        error: 'Agent not found'
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
   * Get agents for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Agents list or error
   */
  async getAgentsForCourse(courseId) {
    try {
      const courseResult = await this.courseService.getCourse(courseId);
      if (!courseResult.success) {
        throw new Error('Course not found');
      }

      const course = courseResult.course;
      const agents = [...course.agents];

      if (course.orchestrationAgent) {
        agents.push(course.orchestrationAgent);
      }

      return {
        success: true,
        agents,
        courseAgents: course.agents.filter((a) => a.type === AGENT_TYPES.SUBJECT),
        orchestrationAgent: course.orchestrationAgent
      };
    } catch (error) {
      console.error('Error getting agents for course:', error);
      return {
        success: false,
        error: error.message,
        agents: []
      };
    }
  }
}
