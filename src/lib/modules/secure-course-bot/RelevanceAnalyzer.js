/**
 * RelevanceAnalyzer - Determines course-specific content relevance
 * Classifies user input as RELEVANT, IRRELEVANT, or GRAY_AREA based on course content
 */

export class RelevanceAnalyzer {
  constructor() {
    // RELEVANT topic patterns - directly related to course content
    this.relevantPatterns = [
      // Course content and concepts
      /course\s+(content|material|concepts?|theories?|frameworks?)/i,
      /syllabus/i,
      /learning\s+objectives?/i,

      // Assignments and coursework
      /(homework|assignment|problem\s+set|essay|project)/i,
      /assignment\s+instructions?/i,
      /due\s+date/i,
      /bibliography|citation/i,

      // Exams and assessment
      /(exam|quiz|test)\s+(preparation|content|study)/i,
      /study\s+(guide|strategy|tips)/i,
      /grade|grading/i,

      // Course logistics
      /course\s+(schedule|policies?|requirements?)/i,
      /office\s+hours/i,
      /lecture\s+(material|topics?|notes?)/i,

      // Readings and materials
      /(textbook|reading|article|case\s+study)/i,
      /assigned\s+reading/i,
      /course\s+materials?/i,

      // Course-specific study skills (CRITICAL FIX)
      /time\s+management\s+for\s+(this\s+)?course/i,
      /study\s+(methods?|techniques?)\s+for\s+(this\s+)?course/i,
      /how\s+to\s+succeed\s+in\s+(this\s+)?course/i,
      /course[- ]specific\s+study/i,

      // Course-specific applications
      /real[- ]world\s+application/i,
      /career\s+connection/i,
      /prerequisite/i
    ];

    // IRRELEVANT topic patterns - clearly outside course scope
    this.irrelevantPatterns = [
      // Other courses
      /other\s+courses?/i,
      /different\s+(class|course)/i,

      // General life advice
      /life\s+advice/i,
      /personal\s+(problems?|issues?|relationships?)/i,
      /dating|romance/i,

      // Technical support
      /technical\s+support/i,
      /computer\s+(problems?|issues?)/i,
      /software\s+(help|support)/i,

      // Entertainment
      /(movie|music|game|tv\s+show)/i,
      /entertainment/i,
      /celebrity/i,

      // Medical, legal, financial advice
      /(medical|health|legal|financial)\s+advice/i,
      /doctor|lawyer|investment/i,

      // Current events (unless course-related)
      /news|politics|current\s+events/i,
      /weather/i,
      /sports/i,

      // Assignment completion requests
      /write\s+(my|the)\s+(essay|paper|assignment)/i,
      /do\s+(my|the)\s+homework/i,
      /solve\s+(this|the)\s+problem\s+for\s+me/i,
      /complete\s+(my|the)\s+assignment/i
    ];

    // GRAY_AREA patterns - potentially relevant, need case-by-case evaluation
    this.grayAreaPatterns = [
      // General study skills (without course context)
      /study\s+(skills|methods|techniques)(?!\s+for\s+(this\s+)?course)/i,
      /time\s+management(?!\s+for\s+(this\s+)?course)/i,
      /note[- ]taking/i,

      // Research methods if course involves research
      /research\s+(methods?|techniques?)/i,

      // Academic writing for course assignments
      /academic\s+writing/i,
      /writing\s+(tips|help)/i,

      // Group work for course projects
      /group\s+work/i,
      /team\s+project/i,
      /collaboration/i,

      // General academic topics
      /all\s+my\s+courses/i,
      /semester\s+planning/i
    ];
  }

  /**
   * Main relevance analysis method
   * @param {string} message - User input message
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {RelevanceResult}
   */
  analyzeRelevance(message, courseConfig) {
    // First check for explicit course topic matches
    const courseTopicsMatched = this.matchCourseTopics(message, courseConfig.courseTopics);

    if (courseTopicsMatched.length > 0) {
      return {
        classification: 'RELEVANT',
        confidence: 0.9,
        courseTopicsMatched,
        reasoning: `Directly matches course topics: ${courseTopicsMatched.join(', ')}`
      };
    }

    // Check against pattern classifications
    const classification = this.classifyTopic(message, courseConfig.courseTopics);

    // Apply the relevance test for final decision
    const relevanceTestResult = this.applyRelevanceTest(message, courseConfig.courseName);

    return {
      classification: classification.classification,
      confidence: classification.confidence,
      courseTopicsMatched,
      reasoning: `${classification.reasoning}. Relevance test: ${relevanceTestResult}`
    };
  }

  /**
   * Classifies topic based on patterns
   * @param {string} message - User input message
   * @param {string[]} courseTopics - Course-specific topics
   * @returns {Object}
   */
  classifyTopic(message, courseTopics) {
    // Check for irrelevant patterns first (highest priority)
    for (const pattern of this.irrelevantPatterns) {
      if (pattern.test(message)) {
        return {
          classification: 'IRRELEVANT',
          confidence: 0.8,
          reasoning: 'Matches irrelevant topic patterns'
        };
      }
    }

    // Check for relevant patterns
    for (const pattern of this.relevantPatterns) {
      if (pattern.test(message)) {
        return {
          classification: 'RELEVANT',
          confidence: 0.7,
          reasoning: 'Matches relevant topic patterns'
        };
      }
    }

    // Check for gray area patterns
    for (const pattern of this.grayAreaPatterns) {
      if (pattern.test(message)) {
        return {
          classification: 'GRAY_AREA',
          confidence: 0.5,
          reasoning: 'Matches gray area patterns - needs case-by-case evaluation'
        };
      }
    }

    // Default to irrelevant if no patterns match
    return {
      classification: 'IRRELEVANT',
      confidence: 0.6,
      reasoning: 'No matching patterns found - defaulting to irrelevant'
    };
  }

  /**
   * Matches user input against specific course topics
   * @param {string} message - User input message
   * @param {string[]} courseTopics - Array of course topics
   * @returns {string[]} - Array of matched topics
   */
  matchCourseTopics(message, courseTopics) {
    const matched = [];
    const messageLower = message.toLowerCase();

    for (const topic of courseTopics) {
      const topicLower = topic.toLowerCase();

      // Check for exact matches or partial matches
      if (
        messageLower.includes(topicLower) ||
        topicLower.includes(messageLower.replace(/[^\w\s]/g, '').trim())
      ) {
        matched.push(topic);
      }
    }

    return matched;
  }

  /**
   * Applies the core relevance test: "Does this help student succeed in [COURSE]?"
   * @param {string} message - User input message
   * @param {string} courseName - Name of the course
   * @returns {string} - Test result explanation
   */
  applyRelevanceTest(message, courseName) {
    // This is the core test from the requirements
    const testQuestion = `Does answering this question help the student succeed specifically in ${courseName}?`;

    // Simple heuristics for the test
    const courseNameInMessage = message.toLowerCase().includes(courseName.toLowerCase());
    const academicKeywords = /(learn|understand|study|assignment|exam|grade|concept|theory)/i.test(
      message
    );
    const specificToEducation = /(course|class|lecture|professor|instructor|syllabus)/i.test(
      message
    );

    if (courseNameInMessage && academicKeywords) {
      return `YES - Question specifically mentions ${courseName} and academic content`;
    }

    if (specificToEducation && academicKeywords) {
      return `MAYBE - Question is educational but may not be specific to ${courseName}`;
    }

    return `NO - Question does not appear to help with ${courseName} success`;
  }

  /**
   * Evaluates gray area topics with additional context
   * @param {string} message - User input message
   * @param {CourseConfig} courseConfig - Course configuration
   * @returns {string} - Final classification for gray area
   */
  evaluateGrayArea(message, courseConfig) {
    // For gray areas, err on the side of caution (redirect)
    const relevanceTest = this.applyRelevanceTest(message, courseConfig.courseName);

    if (relevanceTest.includes('YES')) {
      return 'RELEVANT';
    }

    // Default to irrelevant for gray areas when uncertain
    return 'IRRELEVANT';
  }
}
