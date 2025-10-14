/**
 * CourseConfiguration - Manages course-specific settings and content
 * Handles course parameters, validation, and updates while maintaining security protocols
 */

export class CourseConfiguration {
  /**
   * Creates a new course configuration
   * @param {string} courseName - Name of the course
   * @param {string[]} courseTopics - Array of relevant course topics
   * @param {InstructorInfo} instructorInfo - Instructor contact information
   * @param {string} syllabusContent - Course syllabus content
   * @param {string[]} learningObjectives - Course learning objectives
   */
  constructor(
    courseName,
    courseTopics = [],
    instructorInfo = {},
    syllabusContent = '',
    learningObjectives = []
  ) {
    this.courseName = courseName;
    this.courseTopics = courseTopics;
    this.instructorInfo = {
      name: instructorInfo.name || 'Professor/TA',
      email: instructorInfo.email || 'contact method',
      officeHours: instructorInfo.officeHours || 'See syllabus'
    };
    this.syllabusContent = syllabusContent;
    this.learningObjectives = learningObjectives;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Validate the configuration
    this.validate();
  }

  /**
   * Gets the course topics array
   * @returns {string[]} - Array of course topics
   */
  getCourseTopics() {
    return [...this.courseTopics]; // Return copy to prevent mutation
  }

  /**
   * Gets instructor contact information
   * @returns {InstructorInfo} - Instructor information
   */
  getInstructorContact() {
    return { ...this.instructorInfo }; // Return copy to prevent mutation
  }

  /**
   * Gets the course name
   * @returns {string} - Course name
   */
  getCourseName() {
    return this.courseName;
  }

  /**
   * Gets the syllabus content
   * @returns {string} - Syllabus content
   */
  getSyllabusContent() {
    return this.syllabusContent;
  }

  /**
   * Gets the learning objectives
   * @returns {string[]} - Learning objectives array
   */
  getLearningObjectives() {
    return [...this.learningObjectives]; // Return copy to prevent mutation
  }

  /**
   * Updates course content with validation
   * @param {Object} newContent - New content to update
   * @param {string} newContent.courseName - Updated course name
   * @param {string[]} newContent.courseTopics - Updated course topics
   * @param {InstructorInfo} newContent.instructorInfo - Updated instructor info
   * @param {string} newContent.syllabusContent - Updated syllabus content
   * @param {string[]} newContent.learningObjectives - Updated learning objectives
   * @returns {boolean} - Success status
   */
  updateCourseContent(newContent) {
    // Create a backup of current state
    const backup = this.createBackup();

    try {
      // Update fields if provided
      if (newContent.courseName !== undefined) {
        this.courseName = newContent.courseName;
      }

      if (newContent.courseTopics !== undefined) {
        this.courseTopics = [...newContent.courseTopics];
      }

      if (newContent.instructorInfo !== undefined) {
        this.instructorInfo = {
          ...this.instructorInfo,
          ...newContent.instructorInfo
        };
      }

      if (newContent.syllabusContent !== undefined) {
        this.syllabusContent = newContent.syllabusContent;
      }

      if (newContent.learningObjectives !== undefined) {
        this.learningObjectives = [...newContent.learningObjectives];
      }

      this.updatedAt = new Date();

      // Validate the updated configuration
      this.validate();

      return true;
    } catch (error) {
      // Restore from backup if validation fails
      this.restoreFromBackup(backup);
      throw new Error(`Configuration update failed: ${error.message}`);
    }
  }

  /**
   * Adds a new course topic
   * @param {string} topic - Topic to add
   * @returns {boolean} - Success status
   */
  addCourseTopic(topic) {
    if (!topic || typeof topic !== 'string') {
      throw new Error('Topic must be a non-empty string');
    }

    const trimmedTopic = topic.trim();
    if (trimmedTopic.length === 0) {
      throw new Error('Topic cannot be empty');
    }

    if (this.courseTopics.includes(trimmedTopic)) {
      return false; // Topic already exists
    }

    this.courseTopics.push(trimmedTopic);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Removes a course topic
   * @param {string} topic - Topic to remove
   * @returns {boolean} - Success status
   */
  removeCourseTopic(topic) {
    const index = this.courseTopics.indexOf(topic);
    if (index === -1) {
      return false; // Topic not found
    }

    this.courseTopics.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Updates instructor information
   * @param {InstructorInfo} newInstructorInfo - New instructor information
   * @returns {boolean} - Success status
   */
  updateInstructorInfo(newInstructorInfo) {
    if (!newInstructorInfo || typeof newInstructorInfo !== 'object') {
      throw new Error('Instructor info must be an object');
    }

    this.instructorInfo = {
      ...this.instructorInfo,
      ...newInstructorInfo
    };

    this.updatedAt = new Date();
    return true;
  }

  /**
   * Validates the course configuration
   * @throws {Error} - If configuration is invalid
   */
  validate() {
    const errors = [];

    // Validate course name
    if (
      !this.courseName ||
      typeof this.courseName !== 'string' ||
      this.courseName.trim().length === 0
    ) {
      errors.push('Course name is required and must be a non-empty string');
    }

    // Validate course topics
    if (!Array.isArray(this.courseTopics)) {
      errors.push('Course topics must be an array');
    } else {
      for (let i = 0; i < this.courseTopics.length; i++) {
        if (typeof this.courseTopics[i] !== 'string' || this.courseTopics[i].trim().length === 0) {
          errors.push(`Course topic at index ${i} must be a non-empty string`);
        }
      }
    }

    // Validate instructor info
    if (!this.instructorInfo || typeof this.instructorInfo !== 'object') {
      errors.push('Instructor info must be an object');
    } else {
      if (this.instructorInfo.name && typeof this.instructorInfo.name !== 'string') {
        errors.push('Instructor name must be a string');
      }
      if (this.instructorInfo.email && typeof this.instructorInfo.email !== 'string') {
        errors.push('Instructor email must be a string');
      }
      if (this.instructorInfo.officeHours && typeof this.instructorInfo.officeHours !== 'string') {
        errors.push('Office hours must be a string');
      }
    }

    // Validate syllabus content
    if (this.syllabusContent && typeof this.syllabusContent !== 'string') {
      errors.push('Syllabus content must be a string');
    }

    // Validate learning objectives
    if (!Array.isArray(this.learningObjectives)) {
      errors.push('Learning objectives must be an array');
    } else {
      for (let i = 0; i < this.learningObjectives.length; i++) {
        if (
          typeof this.learningObjectives[i] !== 'string' ||
          this.learningObjectives[i].trim().length === 0
        ) {
          errors.push(`Learning objective at index ${i} must be a non-empty string`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Creates a backup of the current configuration
   * @returns {Object} - Backup object
   */
  createBackup() {
    return {
      courseName: this.courseName,
      courseTopics: [...this.courseTopics],
      instructorInfo: { ...this.instructorInfo },
      syllabusContent: this.syllabusContent,
      learningObjectives: [...this.learningObjectives],
      updatedAt: this.updatedAt
    };
  }

  /**
   * Restores configuration from backup
   * @param {Object} backup - Backup object
   */
  restoreFromBackup(backup) {
    this.courseName = backup.courseName;
    this.courseTopics = backup.courseTopics;
    this.instructorInfo = backup.instructorInfo;
    this.syllabusContent = backup.syllabusContent;
    this.learningObjectives = backup.learningObjectives;
    this.updatedAt = backup.updatedAt;
  }

  /**
   * Exports configuration to JSON
   * @returns {Object} - Configuration as JSON object
   */
  toJSON() {
    return {
      courseName: this.courseName,
      courseTopics: this.courseTopics,
      instructorInfo: this.instructorInfo,
      syllabusContent: this.syllabusContent,
      learningObjectives: this.learningObjectives,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Creates configuration from JSON
   * @param {Object} json - JSON object
   * @returns {CourseConfiguration} - New configuration instance
   */
  static fromJSON(json) {
    const config = new CourseConfiguration(
      json.courseName,
      json.courseTopics,
      json.instructorInfo,
      json.syllabusContent,
      json.learningObjectives
    );

    if (json.createdAt) {
      config.createdAt = new Date(json.createdAt);
    }
    if (json.updatedAt) {
      config.updatedAt = new Date(json.updatedAt);
    }

    return config;
  }

  /**
   * Creates a default configuration for testing/fallback
   * @param {string} courseName - Course name
   * @returns {CourseConfiguration} - Default configuration
   */
  static createDefault(courseName = 'Sample Course') {
    return new CourseConfiguration(
      courseName,
      ['Course Overview', 'Basic Concepts', 'Advanced Topics'],
      {
        name: 'Professor Smith',
        email: 'professor@university.edu',
        officeHours: 'Monday 2-4 PM'
      },
      'This is a sample course syllabus.',
      ['Understand basic concepts', 'Apply advanced techniques', 'Demonstrate mastery']
    );
  }
}
