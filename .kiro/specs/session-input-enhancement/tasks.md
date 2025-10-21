# Implementation Plan

## Overview

This implementation plan transforms the session input enhancement design into actionable coding tasks. Each task builds incrementally on previous work, following the established patterns from the waiting phrases feature.

- [x] 1. Create configuration files and JSON schemas
  - Create `src/lib/config/inputPlaceholders.json` with 10+ placeholder examples per language (en, ru, es)
  - Create `src/lib/config/inputPlaceholders.schema.json` for validation
  - Create `src/lib/config/tutorCommands.json` with 9 command definitions (solve, explain, check, example, cheatsheet, test, conspect, plan, essay)
  - Create `src/lib/config/tutorCommands.schema.json` for validation
  - Create `src/lib/config/helpTips.json` with contextual tips for all languages
  - Create `src/lib/config/helpTips.schema.json` for validation
  - Include categories: general, mathematics, science, writing for placeholders
  - Include all required translations for en, ru, es languages
  - _Requirements: 2.2, 2.6, 3.3, 3.7, 4.2, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 2. Implement InputPlaceholderService
  - Create `src/lib/modules/chat/services/InputPlaceholderService.js` following waitingPhrasesService pattern
  - Implement lazy initialization with configuration loading
  - Implement `getPlaceholder(language, category)` method with history tracking
  - Implement `getPlaceholderSequence(language, count)` for rotation
  - Implement history tracking to avoid recent repeats (last 3 placeholders)
  - Implement language fallback logic (target → English → default)
  - Add error handling with graceful degradation
  - Add caching for loaded configurations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.4, 5.6, 6.5, 6.6_

- [x] 3. Implement TutorCommandsService
  - Create `src/lib/modules/chat/services/TutorCommandsService.js` following service pattern
  - Implement lazy initialization with configuration loading
  - Implement `getCommands(language)` to return localized command list
  - Implement `getCommandByName(name, language)` for command lookup
  - Implement `formatCommand(commandId, language)` for command string formatting
  - Add error handling and fallback logic
  - Add caching for loaded configurations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.2, 6.5, 6.6_

- [x] 4. Implement HelpTipsService
  - Create `src/lib/modules/chat/services/HelpTipsService.js` following service pattern
  - Implement lazy initialization with configuration loading
  - Implement `getTip(language, context)` for contextual tips
  - Implement `getAllTips(language)` for retrieving all tips
  - Add error handling with fallback to default tip
  - Add caching for loaded configurations
  - _Requirements: 4.1, 4.2, 4.3, 5.3, 6.5, 6.6_

- [x] 5. Create CommandMenu component
  - Create `src/lib/modules/chat/components/CommandMenu.svelte`
  - Implement dropdown menu with command list display
  - Add keyboard navigation support (arrow keys, Enter, Escape)
  - Add hover and selection states with visual feedback
  - Implement command selection event dispatch
  - Add click-outside-to-close functionality
  - Style with Tailwind CSS matching existing design
  - Add dark mode support
  - _Requirements: 3.1, 3.2, 3.5, 7.2, 7.3, 7.4_

- [x] 6. Enhance MessageInput component with rotating placeholders
  - Update `src/lib/modules/chat/components/MessageInput.svelte`
  - Import and initialize InputPlaceholderService
  - Implement placeholder rotation every 5 seconds using setInterval
  - Add smooth fade transitions for placeholder changes
  - Implement cleanup on component destroy to prevent memory leaks
  - Update placeholder on language change
  - Maintain existing image upload and send functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.4, 7.1, 7.6_

- [x] 7. Add command menu to MessageInput component
  - Add command menu button (🎯 icon) to the left of input field
  - Import and use CommandMenu component
  - Import and initialize TutorCommandsService
  - Implement command menu toggle on button click
  - Implement "/" key handler to open command menu
  - Implement command selection handler to insert command into input
  - Maintain input focus after command insertion
  - Add proper ARIA labels for accessibility
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.8, 3.9, 7.2, 7.5_

- [x] 8. Add help tip to MessageInput component
  - Import and initialize HelpTipsService
  - Add help tip display below input field
  - Style tip with subtle appearance (small text, muted color)
  - Update tip text on language change
  - Support contextual tips based on user state
  - Add dark mode support for tip styling
  - _Requirements: 4.1, 4.2, 4.3, 5.3_

- [x] 9. Remove default greeting message from ChatInterface
  - Update `src/lib/modules/chat/components/ChatInterface.svelte`
  - Remove or comment out the automatic welcome message initialization
  - Ensure empty message history on initial load
  - Verify input field is ready for user input immediately
  - Test that session history loading still works correctly
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 10. Implement multilingual support integration
  - Ensure all services react to language changes from i18n store
  - Update placeholders when language changes
  - Update commands when language changes
  - Update help tips when language changes
  - Test language switching updates all content correctly
  - Verify fallback to English works for unsupported languages
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]\* 11. Write unit tests for InputPlaceholderService
  - Create `tests/unit/chat/inputPlaceholderService.test.js`
  - Test configuration loading and parsing
  - Test placeholder selection with history tracking
  - Test language fallback logic
  - Test random selection without consecutive repeats
  - Test error handling for missing configurations
  - Test caching functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ]\* 12. Write unit tests for TutorCommandsService
  - Create `tests/unit/chat/tutorCommandsService.test.js`
  - Test command loading and retrieval
  - Test localized command name resolution
  - Test command filtering by category
  - Test invalid command handling
  - Test language fallback
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ]\* 13. Write unit tests for HelpTipsService
  - Create `tests/unit/chat/helpTipsService.test.js`
  - Test tip loading and retrieval
  - Test context-based tip selection
  - Test language fallback
  - Test missing tip handling
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]\* 14. Write component tests for CommandMenu
  - Create `tests/unit/chat/components/CommandMenu.test.js`
  - Test command list rendering
  - Test keyboard navigation (arrow keys, Enter, Escape)
  - Test command selection event
  - Test click-outside-to-close
  - Test hover states
  - _Requirements: 3.1, 3.2, 3.5, 7.2, 7.3, 7.4_

- [ ]\* 15. Write integration tests for MessageInput enhancements
  - Create `tests/integration/chat/messageInputEnhancement.test.js`
  - Test placeholder rotation timing
  - Test command menu open/close
  - Test command insertion into input field
  - Test "/" keyboard shortcut
  - Test help tip display
  - Test language switching updates all content
  - Test that existing functionality (image upload, send) still works
  - _Requirements: 2.1, 2.3, 3.1, 3.8, 3.9, 4.1, 5.4, 7.1, 7.2, 7.5_

- [ ]\* 16. Write E2E tests for user workflows
  - Create `tests/e2e/sessionInputEnhancement.test.js`
  - Test user sees rotating placeholders
  - Test user opens command menu with button
  - Test user opens command menu with "/" key
  - Test user selects command and it appears in input
  - Test user switches language and sees translated content
  - Test user types message with command and sends successfully
  - _Requirements: 2.1, 3.1, 3.8, 3.9, 5.4_

- [x] 17. Add accessibility features
  - Add ARIA labels to command menu button
  - Add ARIA expanded state to command menu
  - Add ARIA live region for help tip
  - Add keyboard focus management
  - Test with screen reader
  - Ensure all interactive elements are keyboard accessible
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 18. Performance optimization
  - Implement lazy loading for services (load on first use)
  - Add caching for configuration files
  - Pre-generate placeholder rotation sequence
  - Optimize placeholder rotation to avoid unnecessary re-renders
  - Test memory usage with rotation interval
  - Ensure no memory leaks from intervals
  - _Requirements: 2.3, 6.5, 7.6_

- [x] 19. Documentation
  - Create `docs/features/session-input-enhancement.md` with feature overview
  - Document service APIs with JSDoc comments
  - Add inline comments for complex logic
  - Document configuration file formats
  - Add examples of adding new commands
  - Add examples of adding new placeholders
  - Update README.md with feature description
  - _Requirements: All_

- [x] 20. Final integration and testing
  - Test all features work together seamlessly
  - Test on different browsers (Chrome, Firefox, Safari)
  - Test on mobile devices (responsive design)
  - Test dark mode appearance
  - Verify no console errors
  - Run full test suite and ensure all tests pass
  - Check test coverage meets 80% threshold
  - _Requirements: All_
