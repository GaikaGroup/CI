# Requirements Document

## Introduction

This feature introduces administrative capabilities for managing educational subjects in Learn mode. Administrators can create subjects with associated AI agents, instructions, and reference materials. The system supports multi-agent coordination through orchestration agents and uses GraphRAG for reference material management.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to create and manage educational subjects, so that I can organize learning content and assign appropriate AI agents to handle different aspects of each subject.

#### Acceptance Criteria

1. WHEN an admin accesses the subject management interface THEN the system SHALL display options to create, edit, and delete subjects
2. WHEN an admin creates a new subject THEN the system SHALL require a subject name and short description
3. WHEN an admin saves a subject THEN the system SHALL validate the required fields and store the subject data
4. WHEN an admin views the subject list THEN the system SHALL display all subjects with their names, descriptions, and agent counts

### Requirement 2

**User Story:** As an administrator, I want to assign one or more AI agents to each subject, so that different agents can handle specialized aspects of the learning experience.

#### Acceptance Criteria

1. WHEN an admin configures a subject THEN the system SHALL allow assignment of one or more agents
2. WHEN an admin assigns an agent THEN the system SHALL require agent-specific instructions
3. WHEN a subject has multiple agents THEN the system SHALL enforce the creation of an orchestration agent
4. WHEN an admin saves agent configurations THEN the system SHALL validate that instructions are provided for each agent

### Requirement 3

**User Story:** As an administrator, I want to create orchestration agents for multi-agent subjects, so that agents can coordinate effectively and provide coherent learning experiences.

#### Acceptance Criteria

1. WHEN a subject has more than one agent THEN the system SHALL require an orchestration agent
2. WHEN an admin creates an orchestration agent THEN the system SHALL require coordination instructions
3. WHEN an orchestration agent is configured THEN the system SHALL specify how agents communicate and coordinate
4. IF a subject has only one agent THEN the system SHALL NOT require an orchestration agent

### Requirement 4

**User Story:** As an administrator, I want to upload reference materials for subjects, so that agents have access to relevant knowledge sources for answering questions.

#### Acceptance Criteria

1. WHEN an admin uploads reference materials THEN the system SHALL process them using GraphRAG
2. WHEN uploading materials THEN the system SHALL provide options to apply materials to all agents or selected agents
3. WHEN materials are uploaded THEN the system SHALL validate file formats and process them for agent access
4. WHEN an admin selects material scope THEN the system SHALL clearly indicate which agents will have access

### Requirement 5

**User Story:** As an administrator, I want to manage material assignments, so that I can control which agents have access to specific reference materials.

#### Acceptance Criteria

1. WHEN an admin uploads materials THEN the system SHALL provide a checkbox to apply to all agents
2. WHEN the "all agents" option is not selected THEN the system SHALL display a list of agents for selection
3. WHEN materials are assigned THEN the system SHALL update agent knowledge bases accordingly
4. WHEN an admin views material assignments THEN the system SHALL show which agents have access to each material

### Requirement 6

**User Story:** As a regular user, I want to interact with subject-specific agents in Learn mode, so that I can receive specialized assistance based on the configured subject knowledge.

#### Acceptance Criteria

1. WHEN a user selects a subject in Learn mode THEN the system SHALL activate the appropriate agents
2. WHEN multiple agents are available THEN the orchestration agent SHALL coordinate responses
3. WHEN a user asks questions THEN agents SHALL access their assigned reference materials via GraphRAG
4. WHEN agents respond THEN the system SHALL provide coherent, coordinated answers based on the subject configuration

### Requirement 7

**User Story:** As an administrator, I want to validate subject configurations, so that I can ensure all subjects are properly set up before users access them.

#### Acceptance Criteria

1. WHEN an admin saves a subject configuration THEN the system SHALL validate that all required components are present
2. IF a subject has multiple agents without an orchestration agent THEN the system SHALL prevent saving and display an error
3. WHEN validation fails THEN the system SHALL display specific error messages indicating what needs to be corrected
4. WHEN a subject is successfully configured THEN the system SHALL mark it as available for users

### Requirement 8

**User Story:** As a student, I want to browse available subjects in a catalog, so that I can choose subjects to learn from based on their descriptions.

#### Acceptance Criteria

1. WHEN a student accesses Learn mode THEN the system SHALL display a subject catalog page
2. WHEN the catalog loads THEN the system SHALL show all available subjects with their short descriptions
3. WHEN a student views the catalog THEN the system SHALL display both admin-created and user-created subjects
4. WHEN a student selects a subject THEN the system SHALL navigate to the learning interface for that subject

### Requirement 9

**User Story:** As any user, I want to create my own subjects, so that I can both learn from existing subjects and teach others by creating new subjects.

#### Acceptance Criteria

1. WHEN any user accesses subject creation THEN the system SHALL allow them to create personal subjects
2. WHEN a user creates a subject THEN the system SHALL require the same basic information as admin subjects (name, description, agents)
3. WHEN a user creates a subject THEN the system SHALL mark it as user-created and associate it with the creator
4. WHEN a user creates their own subject THEN the system SHALL allow them to both learn from other subjects and teach through their created subject

### Requirement 10

**User Story:** As a user, I want to manage both learning and teaching activities, so that I can learn Spanish while teaching English, for example.

#### Acceptance Criteria

1. WHEN a user has created subjects THEN the system SHALL allow them to switch between learning mode and teaching mode
2. WHEN a user is in learning mode THEN the system SHALL show subjects they can learn from
3. WHEN a user is in teaching mode THEN the system SHALL show subjects they have created
4. WHEN a user switches modes THEN the system SHALL maintain separate contexts for learning and teaching activities

### Requirement 11

**User Story:** As any user, I want to report inappropriate subjects, so that I can help maintain a safe and appropriate learning environment.

#### Acceptance Criteria

1. WHEN a user views any subject THEN the system SHALL provide an option to mark it as inappropriate
2. WHEN a user reports a subject THEN the system SHALL record the report with the user ID and timestamp
3. WHEN a subject is reported THEN the system SHALL notify administrators of the report
4. WHEN a user reports a subject THEN the system SHALL allow them to provide optional details about the issue

### Requirement 12

**User Story:** As an administrator, I want to review reported subjects and take moderation actions, so that I can maintain content quality and appropriateness.

#### Acceptance Criteria

1. WHEN subjects are reported THEN the system SHALL display them in an admin moderation queue
2. WHEN an admin reviews a reported subject THEN the system SHALL show the subject details and report information
3. WHEN an admin decides on moderation action THEN the system SHALL provide options to block or delete the subject
4. WHEN an admin blocks a subject THEN the system SHALL hide it from the catalog but preserve the data
5. WHEN an admin deletes a subject THEN the system SHALL permanently remove it and notify the creator
6. WHEN moderation actions are taken THEN the system SHALL log the action and notify the reporting user

### Requirement 13

**User Story:** As a subject creator (admin or user), I want to control which LLM providers can be used for my subject, so that I can ensure compliance with privacy requirements or preferences.

#### Acceptance Criteria

1. WHEN creating or editing a subject THEN the system SHALL provide an option to disable OpenAI API usage
2. WHEN OpenAI is disabled for a subject THEN the system SHALL use only the local LLM provider for that subject
3. IF the local LLM provider is unavailable and OpenAI is disabled THEN the system SHALL display an error message instead of falling back to OpenAI
4. WHEN a subject has OpenAI disabled THEN the system SHALL clearly indicate this in the subject configuration
5. WHEN users interact with a subject that has OpenAI disabled THEN the system SHALL respect this setting for all agents in that subject

### Requirement 14

**User Story:** As an administrator, I want to edit existing subjects and their configurations, so that I can update content and improve the learning experience over time.

#### Acceptance Criteria

1. WHEN an admin selects an existing subject THEN the system SHALL load all current configurations for editing
2. WHEN an admin modifies agent assignments THEN the system SHALL re-validate orchestration requirements
3. WHEN an admin updates reference materials THEN the system SHALL reprocess them through GraphRAG
4. WHEN changes are saved THEN the system SHALL update the subject configuration without affecting active user sessions
