# Requirements Document

## Introduction

This feature enhances the session chat interface by removing the default greeting message, adding rotating contextual input placeholders, implementing a command menu system, and providing helpful tips to improve user engagement and learning effectiveness.

## Glossary

- **Session Interface**: The chat interface where users interact with the AI tutor
- **Input Placeholder**: The hint text displayed in the message input field when empty
- **Command Menu**: A contextual menu providing quick access to common tutoring commands
- **Rotating Placeholder**: A system that cycles through different example prompts in the input field
- **Multilingual Support**: Content displayed in the user's selected interface language

## Requirements

### Requirement 1: Remove Default Greeting Message

**User Story:** As a student, I want to see a clean chat interface without a default greeting message, so that I can focus on my learning tasks immediately.

#### Acceptance Criteria

1. WHEN the Session Interface loads, THE System SHALL NOT display any default greeting message
2. WHEN the Session Interface loads, THE System SHALL display an empty message history
3. WHEN the Session Interface loads, THE System SHALL display the input field ready for user input

### Requirement 2: Rotating Input Placeholders

**User Story:** As a student, I want to see helpful example prompts in the input field, so that I understand what kinds of questions I can ask.

#### Acceptance Criteria

1. WHEN the Session Interface loads, THE System SHALL display a rotating placeholder text in the input field
2. THE System SHALL provide at least 10 different placeholder examples per language
3. THE System SHALL rotate placeholders every 5 seconds when the input field is empty
4. THE System SHALL display placeholders in the user's selected interface language
5. THE System SHALL include examples covering mathematics, science, writing, and general learning topics
6. THE System SHALL store placeholder configurations in a centralized configuration file similar to waitingPhrases.json

### Requirement 3: Command Menu System

**User Story:** As a student, I want quick access to common tutoring commands, so that I can efficiently request specific types of help.

#### Acceptance Criteria

1. THE System SHALL display a command menu icon (🎯) to the left of the input field
2. WHEN the user clicks the command menu icon, THE System SHALL display a dropdown menu with available commands
3. THE System SHALL provide the following command types: solve, explain, check, example, cheatsheet, test, conspect, plan, essay
4. THE System SHALL display each command with its localized name in the user's selected interface language (e.g., /решить for Russian, /solve for English, /resolver for Spanish)
5. WHEN the user selects a command, THE System SHALL insert the localized command text into the input field
6. THE System SHALL display command descriptions in the user's selected interface language
7. THE System SHALL store command configurations with translations for all supported languages in a centralized configuration file
8. THE System SHALL support keyboard shortcut "/" to open the command menu
9. WHEN the user types "/" in the input field, THE System SHALL display the command menu automatically

### Requirement 4: Contextual Help Tip

**User Story:** As a student, I want to see a helpful tip below the input field, so that I understand how to write better questions.

#### Acceptance Criteria

1. THE System SHALL display a help tip below the input placeholder
2. THE System SHALL display the tip text in the user's selected interface language
3. THE System SHALL use subtle styling to avoid distracting from the main interface
4. THE System SHALL display the tip: "Совет: Чем подробнее вопрос, тем лучше ответ!" (Russian) or equivalent in other languages

### Requirement 5: Multilingual Configuration

**User Story:** As a student using the platform in my native language, I want all interface enhancements to appear in my language, so that I can use the platform comfortably.

#### Acceptance Criteria

1. THE System SHALL support placeholders in English, Russian, and Spanish languages
2. THE System SHALL support command names and descriptions in English, Russian, and Spanish languages
3. THE System SHALL support help tips in English, Russian, and Spanish languages
4. THE System SHALL automatically select content based on the user's interface language setting
5. THE System SHALL provide a JSON schema for validating multilingual configurations
6. THE System SHALL follow the same configuration pattern as waitingPhrases.json

### Requirement 6: Configuration Management

**User Story:** As a developer, I want centralized configuration files for all interface enhancements, so that I can easily maintain and extend the content.

#### Acceptance Criteria

1. THE System SHALL store input placeholders in src/lib/config/inputPlaceholders.json
2. THE System SHALL store command definitions in src/lib/config/tutorCommands.json
3. THE System SHALL store help tips in src/lib/config/helpTips.json
4. THE System SHALL provide JSON schemas for validating each configuration file
5. THE System SHALL load configurations at application startup
6. THE System SHALL provide a service class for accessing configuration data

### Requirement 7: User Experience

**User Story:** As a student, I want smooth and intuitive interactions with the enhanced interface, so that I can focus on learning rather than figuring out the interface.

#### Acceptance Criteria

1. WHEN placeholders rotate, THE System SHALL use smooth fade transitions
2. WHEN the command menu opens, THE System SHALL animate smoothly
3. WHEN the user hovers over a command, THE System SHALL highlight it clearly
4. THE System SHALL close the command menu when the user clicks outside it
5. THE System SHALL maintain input focus when inserting commands
6. THE System SHALL complete placeholder rotation cycles within 60 seconds
