# Requirements Document

## Introduction

This feature enhances the user experience by transforming the current learning system into a more intuitive catalogue-based interface. The enhancement includes renaming the learn page to catalogue, adding edit capabilities for subject creators, improving subject tile layouts, implementing agent management, document upload functionality, and removing obsolete admin pages.

## Requirements

### Requirement 1

**User Story:** As a user, I want to access a catalogue of subjects from the header, so that I can easily browse available learning materials.

#### Acceptance Criteria

1. WHEN the user views the header THEN the system SHALL display a "Catalogue" title/link
2. WHEN the user clicks the "Catalogue" title THEN the system SHALL navigate to /catalogue (previously /learn)
3. WHEN the user accesses /catalogue THEN the system SHALL display the list of available subjects
4. WHEN the user accesses the old /learn URL THEN the system SHALL redirect to /catalogue

### Requirement 2

**User Story:** As a subject creator, I want to see an edit icon on my subject tiles, so that I can modify my subjects directly from the catalogue view.

#### Acceptance Criteria

1. WHEN a subject creator views the catalogue THEN the system SHALL display an edit icon on tiles for subjects they created
2. WHEN a non-creator views the catalogue THEN the system SHALL NOT display edit icons on subject tiles
3. WHEN the creator clicks the edit icon THEN the system SHALL navigate to the subject edit mode
4. WHEN displaying subject tiles THEN the system SHALL show shortened content to improve readability

### Requirement 3

**User Story:** As a user, I want to join subjects and track my enrolled subjects, so that I can easily access my learning materials and see my progress.

#### Acceptance Criteria

1. WHEN viewing subject tiles THEN the system SHALL display a "Join" button instead of "Take Assessment" and "Learn"
2. WHEN viewing subject tiles THEN the system SHALL keep the "Report" button unchanged
3. WHEN the user clicks "Join" THEN the system SHALL enroll the user in the subject and provide access to learning materials
4. WHEN the user has joined subjects THEN the system SHALL display "My Subjects" in a dropdown menu
5. WHEN the user clicks "My Subjects" THEN the system SHALL show all subjects the user has joined
6. WHEN displaying subject information THEN the system SHALL show: icon, report button, subject title, language and level, description, skills covered, and join button

### Requirement 4

**User Story:** As a subject creator, I want to perform full CRUD operations on agents for my subjects, so that I can customize and maintain the learning experience with multiple AI assistants.

#### Acceptance Criteria

1. WHEN in subject edit mode THEN the system SHALL display agent management interface with Create, Read, Update, Delete capabilities
2. WHEN the creator clicks "Add Agent" THEN the system SHALL display name and description input fields
3. WHEN the creator adds agent details THEN the system SHALL create the agent and associate it with the subject
4. WHEN the creator views existing agents THEN the system SHALL display all agents with edit and delete options
5. WHEN the creator updates an agent THEN the system SHALL save changes and maintain agent associations
6. WHEN the creator deletes an agent THEN the system SHALL remove the agent and update orchestration if needed
7. WHEN a subject has two or more agents THEN the system SHALL automatically create an "Orchestration" agent
8. WHEN the orchestration agent exists THEN the system SHALL provide a description field for defining agent pipeline and behavior
9. WHEN agents are deleted and only one remains THEN the system SHALL automatically remove the orchestration agent

### Requirement 5

**User Story:** As a subject creator, I want to upload documents to my subjects, so that I can provide comprehensive learning materials through RAG.

#### Acceptance Criteria

1. WHEN in subject edit mode THEN the system SHALL provide document upload functionality
2. WHEN uploading documents THEN the system SHALL accept TXT and PDF file formats only
3. WHEN a document is uploaded THEN the system SHALL start the embedding process automatically
4. WHEN embedding is complete THEN the system SHALL store the processed content in the vector database
5. WHEN agents interact with users THEN the system SHALL use uploaded documents as RAG context

### Requirement 6

**User Story:** As a system administrator, I want obsolete admin pages removed, so that the interface remains clean and maintainable.

#### Acceptance Criteria

1. WHEN accessing /admin/subjects THEN the system SHALL return a 404 or redirect to the appropriate page
2. WHEN the system is deployed THEN the /admin/subjects route SHALL be completely removed
3. WHEN users try to access the old admin route THEN the system SHALL handle the request gracefully
