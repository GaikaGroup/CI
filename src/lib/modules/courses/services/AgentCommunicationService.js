/**
 * Agent Communication Service
 *
 * This service handles communication between students and AI agents,
 * including RAG context retrieval, single-agent responses, and
 * multi-agent orchestration.
 */

/**
 * Agent Communication Service class
 */
export class AgentCommunicationService {
  constructor(ragService = null, llmService = null) {
    this.ragService = ragService;
    this.llmService = llmService;
  }

  /**
   * Process a student message and generate appropriate response
   * @param {string} message - Student's message
   * @param {string} subjectId - Subject ID
   * @param {string} userId - User ID
   * @param {Object} subject - Subject configuration
   * @returns {Promise<Object>} Response from agent(s)
   */
  async processStudentMessage(message, subjectId, userId, subject) {
    try {
      // Get RAG context from uploaded materials
      const ragContext = await this.getRagContext(message, subject.materials || []);

      if (!subject.agents || subject.agents.length === 0) {
        return {
          success: false,
          error: 'No agents configured for this subject',
          response: null
        };
      }

      if (subject.agents.length === 1) {
        // Single agent communication
        return await this.singleAgentResponse(subject.agents[0], message, ragContext, subject);
      } else {
        // Multi-agent orchestration
        return await this.orchestratedResponse(subject, message, ragContext);
      }
    } catch (error) {
      console.error('Error processing student message:', error);
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  /**
   * Get RAG context from uploaded materials
   * @param {string} message - Student's message
   * @param {Array} materials - Subject materials
   * @returns {Promise<Object>} RAG context
   */
  async getRagContext(message, materials) {
    if (!this.ragService || !materials.length) {
      return {
        relevantChunks: [],
        sources: [],
        confidence: 0
      };
    }

    try {
      // Filter materials that have completed embedding
      const embeddedMaterials = materials.filter((m) => m.embeddingStatus === 'completed');

      if (embeddedMaterials.length === 0) {
        return {
          relevantChunks: [],
          sources: [],
          confidence: 0
        };
      }

      // Search for relevant content
      const searchResults = await this.ragService.searchSimilarContent(
        message,
        embeddedMaterials.flatMap((m) => m.vectorIds),
        {
          maxResults: 5,
          minSimilarity: 0.7
        }
      );

      return {
        relevantChunks: searchResults.chunks || [],
        sources: searchResults.sources || [],
        confidence: searchResults.averageConfidence || 0
      };
    } catch (error) {
      console.error('Error retrieving RAG context:', error);
      return {
        relevantChunks: [],
        sources: [],
        confidence: 0
      };
    }
  }

  /**
   * Generate response from a single agent
   * @param {Object} agent - Agent configuration
   * @param {string} message - Student's message
   * @param {Object} ragContext - RAG context
   * @param {Object} subject - Subject configuration
   * @returns {Promise<Object>} Agent response
   */
  async singleAgentResponse(agent, message, ragContext, subject) {
    try {
      // Build context for the agent
      const context = this.buildAgentContext(agent, ragContext, subject);

      // Generate system prompt
      const systemPrompt = this.buildSystemPrompt(agent, context);

      // Build user message with context
      const userMessage = this.buildUserMessage(message, ragContext, agent.ragEnabled);

      // Generate response using LLM service
      const response = await this.generateLLMResponse(systemPrompt, userMessage, agent);

      return {
        success: true,
        response: {
          content: response.content,
          agentName: agent.name,
          agentId: agent.id,
          ragUsed: agent.ragEnabled && ragContext.relevantChunks.length > 0,
          sources: ragContext.sources,
          confidence: ragContext.confidence
        }
      };
    } catch (error) {
      console.error('Error generating single agent response:', error);
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  /**
   * Generate orchestrated response from multiple agents
   * @param {Object} subject - Subject configuration
   * @param {string} message - Student's message
   * @param {Object} ragContext - RAG context
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Orchestrated response
   */
  async orchestratedResponse(subject, message, ragContext) {
    try {
      const orchestrationAgent = subject.orchestrationAgent;

      if (!orchestrationAgent) {
        // Fallback to first agent if no orchestration
        return await this.singleAgentResponse(subject.agents[0], message, ragContext, subject);
      }

      // Determine which agents should handle the message
      const selectedAgents = await this.selectAgents(message, subject.agents, orchestrationAgent);

      // Generate responses from selected agents
      const agentResponses = await Promise.all(
        selectedAgents.map((agent) => this.singleAgentResponse(agent, message, ragContext, subject))
      );

      // Synthesize final response using orchestration agent
      const finalResponse = await this.synthesizeResponse(
        agentResponses,
        orchestrationAgent,
        message
      );

      return {
        success: true,
        response: {
          content: finalResponse.content,
          agentName: orchestrationAgent.name,
          agentId: orchestrationAgent.id,
          contributingAgents: selectedAgents.map((a) => ({ id: a.id, name: a.name })),
          ragUsed: ragContext.relevantChunks.length > 0,
          sources: ragContext.sources,
          confidence: ragContext.confidence
        }
      };
    } catch (error) {
      console.error('Error generating orchestrated response:', error);
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  /**
   * Select appropriate agents for a message
   * @param {string} message - Student's message
   * @param {Array} agents - Available agents
   * @param {Object} orchestrationAgent - Orchestration agent
   * @returns {Promise<Array>} Selected agents
   */
  async selectAgents(message, agents, orchestrationAgent) {
    // Simple agent selection based on message content
    // In a real implementation, this could use ML models or more sophisticated routing

    const messageWords = message.toLowerCase().split(/\s+/);
    const selectedAgents = [];

    // Check routing rules if available
    if (orchestrationAgent.routingRules?.messageTypes) {
      for (const [messageType, agentIds] of Object.entries(
        orchestrationAgent.routingRules.messageTypes
      )) {
        if (messageWords.some((word) => messageType.toLowerCase().includes(word))) {
          const matchingAgents = agents.filter((a) => agentIds.includes(a.id));
          selectedAgents.push(...matchingAgents);
        }
      }
    }

    // If no specific routing matches, use fallback or select based on agent descriptions
    if (selectedAgents.length === 0) {
      if (orchestrationAgent.routingRules?.fallbackAgent) {
        const fallbackAgent = agents.find(
          (a) => a.id === orchestrationAgent.routingRules.fallbackAgent
        );
        if (fallbackAgent) {
          selectedAgents.push(fallbackAgent);
        }
      } else {
        // Select agents based on description relevance (simple keyword matching)
        const relevantAgents = agents.filter((agent) => {
          const agentKeywords = (agent.description + ' ' + agent.instructions).toLowerCase();
          return messageWords.some((word) => agentKeywords.includes(word));
        });

        if (relevantAgents.length > 0) {
          selectedAgents.push(...relevantAgents.slice(0, 2)); // Limit to 2 agents
        } else {
          selectedAgents.push(agents[0]); // Default to first agent
        }
      }
    }

    return [...new Set(selectedAgents)]; // Remove duplicates
  }

  /**
   * Synthesize responses from multiple agents
   * @param {Array} agentResponses - Responses from individual agents
   * @param {Object} orchestrationAgent - Orchestration agent
   * @param {string} originalMessage - Original student message
   * @param {Object} ragContext - RAG context
   * @returns {Promise<Object>} Synthesized response
   */
  async synthesizeResponse(agentResponses, orchestrationAgent, originalMessage) {
    try {
      // Filter successful responses
      const successfulResponses = agentResponses.filter((r) => r.success);

      if (successfulResponses.length === 0) {
        throw new Error('No successful agent responses to synthesize');
      }

      if (successfulResponses.length === 1) {
        return successfulResponses[0].response;
      }

      // Build synthesis prompt
      const synthesisPrompt = this.buildSynthesisPrompt(
        successfulResponses,
        orchestrationAgent,
        originalMessage
      );

      // Generate synthesized response
      const response = await this.generateLLMResponse(
        orchestrationAgent.systemPrompt,
        synthesisPrompt,
        orchestrationAgent
      );

      return {
        content: response.content,
        synthesized: true
      };
    } catch (error) {
      console.error('Error synthesizing responses:', error);
      // Fallback to first successful response
      const firstSuccess = agentResponses.find((r) => r.success);
      return firstSuccess
        ? firstSuccess.response
        : { content: 'I apologize, but I encountered an error processing your request.' };
    }
  }

  /**
   * Build agent context from RAG and subject information
   * @param {Object} agent - Agent configuration
   * @param {Object} ragContext - RAG context
   * @param {Object} subject - Subject configuration
   * @returns {Object} Agent context
   */
  buildAgentContext(agent, ragContext, subject) {
    return {
      subjectName: subject.name,
      subjectDescription: subject.description,
      subjectLanguage: subject.language,
      subjectLevel: subject.level,
      subjectSkills: subject.skills || [],
      ragContext: agent.ragEnabled ? ragContext : null,
      agentRole: agent.description,
      communicationStyle: agent.communicationStyle || {}
    };
  }

  /**
   * Build system prompt for an agent
   * @param {Object} agent - Agent configuration
   * @param {Object} context - Agent context
   * @returns {string} System prompt
   */
  buildSystemPrompt(agent, context) {
    let prompt = agent.systemPrompt || '';

    // Add context information
    prompt += `\n\nContext:`;
    prompt += `\nSubject: ${context.subjectName} (${context.subjectLanguage}${context.subjectLevel ? ` - ${context.subjectLevel}` : ''})`;
    prompt += `\nSubject Description: ${context.subjectDescription}`;

    if (context.subjectSkills.length > 0) {
      prompt += `\nSkills Covered: ${context.subjectSkills.join(', ')}`;
    }

    prompt += `\nYour Role: ${context.agentRole}`;
    prompt += `\nInstructions: ${agent.instructions}`;

    // Add communication style
    if (context.communicationStyle.tone) {
      prompt += `\nTone: ${context.communicationStyle.tone}`;
    }
    if (context.communicationStyle.formality) {
      prompt += `\nFormality: ${context.communicationStyle.formality}`;
    }
    if (context.communicationStyle.responseLength) {
      prompt += `\nResponse Length: ${context.communicationStyle.responseLength}`;
    }

    return prompt;
  }

  /**
   * Build user message with RAG context
   * @param {string} message - Original message
   * @param {Object} ragContext - RAG context
   * @param {boolean} ragEnabled - Whether RAG is enabled
   * @returns {string} Enhanced user message
   */
  buildUserMessage(message, ragContext, ragEnabled) {
    let userMessage = message;

    if (ragEnabled && ragContext.relevantChunks.length > 0) {
      userMessage += '\n\nRelevant context from learning materials:\n';
      ragContext.relevantChunks.forEach((chunk, index) => {
        userMessage += `\n${index + 1}. ${chunk.content}`;
      });
    }

    return userMessage;
  }

  /**
   * Build synthesis prompt for orchestration
   * @param {Array} responses - Agent responses
   * @param {Object} orchestrationAgent - Orchestration agent
   * @param {string} originalMessage - Original message
   * @returns {string} Synthesis prompt
   */
  buildSynthesisPrompt(responses, orchestrationAgent, originalMessage) {
    let prompt = `Original student question: "${originalMessage}"\n\n`;
    prompt += `I have received the following responses from specialized agents:\n\n`;

    responses.forEach((response, index) => {
      prompt += `Agent ${index + 1} (${response.response.agentName}):\n`;
      prompt += `${response.response.content}\n\n`;
    });

    prompt += `Please synthesize these responses into a single, coherent answer that:\n`;
    prompt += `1. Addresses the student's question comprehensively\n`;
    prompt += `2. Combines the best insights from each agent\n`;
    prompt += `3. Maintains consistency and clarity\n`;
    prompt += `4. Follows the communication style and behavior described in your instructions\n\n`;

    if (orchestrationAgent.pipelineDescription) {
      prompt += `Pipeline guidance: ${orchestrationAgent.pipelineDescription}\n\n`;
    }

    prompt += `Synthesized response:`;

    return prompt;
  }

  /**
   * Generate LLM response (placeholder - integrate with actual LLM service)
   * @param {string} systemPrompt - System prompt
   * @param {string} userMessage - User message
   * @param {Object} agent - Agent configuration
   * @returns {Promise<Object>} LLM response
   */
  async generateLLMResponse(systemPrompt, userMessage, agent) {
    // This is a placeholder implementation
    // In a real system, this would integrate with the actual LLM service

    if (this.llmService) {
      return await this.llmService.generateResponse({
        systemPrompt,
        userMessage,
        agentConfig: agent
      });
    }

    // Fallback mock response for development
    return {
      content: `This is a mock response from ${agent.name}. In a real implementation, this would be generated by the LLM service using the system prompt and user message.`,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };
  }

  /**
   * Update agent usage statistics
   * @param {string} agentId - Agent ID
   * @param {Object} usage - Usage statistics
   */
  updateAgentUsage(agentId, usage) {
    // Track agent usage for analytics
    // This could be stored in a database or analytics service
    console.log(`Agent usage:`, { agentId, usage });
  }

  /**
   * Get agent performance metrics
   * @param {string} agentId - Agent ID
   * @returns {Object} Performance metrics
   */
  getAgentMetrics(agentId) {
    // Return agent performance metrics
    // This would typically come from a database or analytics service
    console.log(`Getting metrics for agent: ${agentId}`);
    return {
      totalInteractions: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      ragUtilization: 0
    };
  }
}

// Create singleton instance
export const agentCommunicationService = new AgentCommunicationService();
