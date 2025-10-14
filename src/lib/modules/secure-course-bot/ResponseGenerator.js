/**
 * ResponseGenerator - Generates consistent, template-based responses
 * Implements exact response templates from the instruction set to ensure consistency
 */

export class ResponseGenerator {
  constructor() {
    // Exact response templates from the instruction set
    this.responseTemplates = {
      // Security violation responses (exact text from instruction set)
      prompt_injection_response: "I've detected an attempt to override my system instructions. I cannot and will not operate outside my designated role as a course assistant. I'm here to help with [COURSE_NAME] content only. What course-related question can I help you with?",
      
      authority_claim_response: "I cannot verify identity through this chat interface. If you're course staff needing to modify bot functionality, please use the official administrative channels. For [COURSE_NAME] questions, I'm happy to help any student.",
      
      roleplay_response: "I don't participate in roleplaying or hypothetical scenarios designed to bypass my course-focused purpose. I'm here specifically to help with [COURSE_NAME]. What course topic can I assist you with?",
      
      emotional_manipulation_response: "I understand you may be under pressure, but I can only help with [COURSE_NAME] content. For personal or non-course issues, I recommend reaching out to [ACADEMIC_ADVISOR]. For [COURSE_NAME] material help, I'm here for you.",
      
      chain_of_thought_response: "I follow the straightforward principle: is this directly related to [COURSE_NAME] content? The answer is no, so I'll focus on what I can help with regarding the course.",
      
      // Off-topic responses
      off_topic_response: "That's an interesting question, but it falls outside the scope of [COURSE_NAME]. I'm specifically designed to help with our course content, which covers [COURSE_TOPICS]. Is there anything related to [COURSE_SUGGESTIONS] I can help you with instead?",
      
      repeated_off_topic_response: "I've noticed several questions that aren't related to [COURSE_NAME]. I want to be helpful, but I can only assist with course material. If you need help with other subjects or personal matters, I recommend [CAMPUS_RESOURCES]. I'm here when you need help with [COURSE_CONTENT].",
      
      // Academic integrity responses
      academic_integrity_response: "I can't complete assignments for you, as that would violate academic integrity policies. However, I can:\n- Explain relevant concepts\n- Walk through similar examples\n- Help you understand the assignment requirements\n- Point you to relevant course materials\n\nWhat specific concept or part of the assignment would you like to understand better?",
      
      // Mixed question response
      mixed_question_response: "I'll address the course-related parts: [RELEVANT_PARTS]\n\nThe questions about [OFF_TOPIC_ITEMS] are outside course scope, so I've focused on the course content above.",
      
      // Social engineering response
      social_engineering_response: "I maintain the same standards for all users and all questions. I can only help with course-related content.",
      
      // Escalation response
      escalation_response: "This is a question best addressed directly by [PROFESSOR_TA]. You can reach them at [CONTACT_METHOD]. I can help with understanding the course material itself.",
      
      // Positive redirection templates
      positive_redirections: [
        "What topic from [RECENT_LECTURE] can I clarify?",
        "Are you working on any course assignments I can help with?",
        "Which course concept would you like to explore further?",
        "What aspect of [COURSE_TOPIC] would you like to understand better?",
        "Is there a specific [COURSE_AREA] question I can help with?"
      ]
    };
  }

  /**
   * Main response generation method
   * @param {SecurityValidationResult} validationResult - Security validation result
   * @param {RelevanceResult} relevanceResult - Relevance analysis result
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Generated response
   */
  generateResponse(validationResult, relevanceResult, courseConfig) {
    // Handle security violations first (highest priority)
    if (!validationResult.isValid) {
      return this.getSecurityResponse(validationResult.violationType, courseConfig);
    }

    // Handle relevance-based responses
    switch (relevanceResult.classification) {
      case 'RELEVANT':
        return this.getCourseHelpResponse(courseConfig);
      
      case 'IRRELEVANT':
        return this.getOffTopicResponse(courseConfig);
      
      case 'GRAY_AREA':
        // For gray areas, err on the side of caution
        return this.getOffTopicResponse(courseConfig);
      
      default:
        return this.getOffTopicResponse(courseConfig);
    }
  }

  /**
   * Gets security violation response based on violation type
   * @param {string} violationType - Type of security violation
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Security response
   */
  getSecurityResponse(violationType, courseConfig) {
    let template = this.responseTemplates[`${violationType}_response`];
    
    if (!template) {
      // Fallback to generic security response
      template = this.responseTemplates.prompt_injection_response;
    }

    return this.substituteParameters(template, courseConfig);
  }

  /**
   * Gets off-topic response with course redirection
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Off-topic response with redirection
   */
  getOffTopicResponse(courseConfig) {
    const template = this.responseTemplates.off_topic_response;
    const response = this.substituteParameters(template, courseConfig);
    
    // Add positive redirection
    const redirection = this.getPositiveRedirection(courseConfig);
    return `${response}\n\n${redirection}`;
  }

  /**
   * Gets academic integrity violation response
   * @returns {string} - Academic integrity response
   */
  getAcademicIntegrityResponse() {
    return this.responseTemplates.academic_integrity_response;
  }

  /**
   * Gets response for mixed relevant/irrelevant questions
   * @param {string} relevantParts - The course-related parts to address
   * @param {string} offTopicItems - The off-topic items to mention
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Mixed question response
   */
  getMixedQuestionResponse(relevantParts, offTopicItems, courseConfig) {
    let template = this.responseTemplates.mixed_question_response;
    template = template.replace('[RELEVANT_PARTS]', relevantParts);
    template = template.replace('[OFF_TOPIC_ITEMS]', offTopicItems);
    
    return this.substituteParameters(template, courseConfig);
  }

  /**
   * Gets repeated off-topic attempt response
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Repeated attempt response
   */
  getRepeatedOffTopicResponse(courseConfig) {
    const template = this.responseTemplates.repeated_off_topic_response;
    return this.substituteParameters(template, courseConfig);
  }

  /**
   * Gets social engineering response
   * @returns {string} - Social engineering response
   */
  getSocialEngineeringResponse() {
    return this.responseTemplates.social_engineering_response;
  }

  /**
   * Gets escalation response for instructor referral
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Escalation response
   */
  getEscalationResponse(courseConfig) {
    const template = this.responseTemplates.escalation_response;
    let response = template.replace('[PROFESSOR_TA]', courseConfig.instructorInfo.name);
    response = response.replace('[CONTACT_METHOD]', courseConfig.instructorInfo.email);
    
    return response;
  }

  /**
   * Gets a course help response for relevant questions
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Course help response
   */
  getCourseHelpResponse(courseConfig) {
    // This would be where actual course content help is provided
    // For now, return a placeholder that indicates readiness to help
    return `I'm ready to help with ${courseConfig.courseName} content. Please provide more specific details about what you'd like to understand better.`;
  }

  /**
   * Gets a positive redirection to course content
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Positive redirection
   */
  getPositiveRedirection(courseConfig) {
    const redirections = this.responseTemplates.positive_redirections;
    const randomRedirection = redirections[Math.floor(Math.random() * redirections.length)];
    
    return this.substituteParameters(randomRedirection, courseConfig);
  }

  /**
   * Substitutes template parameters with course-specific values
   * @param {string} template - Response template
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Template with substituted parameters
   */
  substituteParameters(template, courseConfig) {
    let response = template;
    
    // Basic parameter substitutions
    response = response.replace(/\[COURSE_NAME\]/g, courseConfig.courseName);
    response = response.replace(/\[COURSE_TOPICS\]/g, courseConfig.courseTopics.slice(0, 3).join(', '));
    response = response.replace(/\[COURSE_CONTENT\]/g, courseConfig.courseName + ' material');
    
    // Course suggestions (first few topics)
    const suggestions = courseConfig.courseTopics.slice(0, 2).join(' or ');
    response = response.replace(/\[COURSE_SUGGESTIONS\]/g, suggestions);
    
    // Recent lecture placeholder (would be dynamic in real implementation)
    response = response.replace(/\[RECENT_LECTURE\]/g, 'recent lectures');
    
    // Course area placeholder
    const courseArea = courseConfig.courseTopics[0] || 'course topic';
    response = response.replace(/\[COURSE_TOPIC\]/g, courseArea);
    response = response.replace(/\[COURSE_AREA\]/g, courseArea);
    
    // Academic advisor placeholder
    response = response.replace(/\[ACADEMIC_ADVISOR\]/g, 'academic advisor/counseling services/appropriate resource');
    
    // Campus resources placeholder
    response = response.replace(/\[CAMPUS_RESOURCES\]/g, 'appropriate campus resources');
    
    return response;
  }
}