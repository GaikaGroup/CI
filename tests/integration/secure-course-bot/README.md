# Secure Course Bot Manipulation Attempts Test Suite

This test suite provides comprehensive validation of the secure course bot's ability to detect and respond to various manipulation attempts as specified in the requirements.

## Test Coverage

### Prompt Injection Attempts (Requirement 1.1)
- Direct instruction override attempts
- Sophisticated bypass attempts  
- Advanced jailbreak patterns
- Instruction revelation attempts
- Case variations and creative formatting
- Embedded manipulation in longer text

### Authority Impersonation Attempts (Requirement 1.2)
- Direct authority claims (professor, instructor, admin)
- Implied authority scenarios
- Sophisticated authority claims with specific names
- Case variations and embedded claims

### Roleplay and Hypothetical Scenario Attempts (Requirement 1.3)
- Direct roleplay requests
- Hypothetical scenarios
- Game-based approaches
- Creative roleplay attempts
- Embedded roleplay in legitimate questions

### Emotional Manipulation Attempts (Requirement 1.4)
- Urgency and desperation tactics
- Flattery and manipulation
- Guilt and pressure techniques
- Personal appeals
- Combined emotional appeals

### Chain-of-Thought Manipulation Attempts (Requirement 1.5)
- Logical progression attempts
- Complex reasoning chains
- Incremental boundary pushing
- Sophisticated logical manipulation

### Combined and Advanced Manipulation
- Multiple manipulation types in single messages
- Sophisticated multi-layered attempts
- Edge cases and boundary testing

## Test Structure

Each test category validates:
1. **Detection Accuracy**: Ensures manipulation attempts are correctly identified
2. **Response Generation**: Verifies appropriate security responses are generated
3. **Template Consistency**: Confirms response templates maintain security boundaries
4. **Parameter Substitution**: Validates course-specific information is properly inserted

## Security Validation Results

The test suite validates that the SecurityValidator correctly identifies manipulation attempts and returns:
- `isValid: false` for all manipulation attempts
- Appropriate `violationType` classification
- Correct `severity` level (high/medium)
- `shouldLog: true` for security incident tracking
- Proper `responseTemplate` selection

## Response Template Validation

Tests ensure all security responses:
- Maintain polite but firm boundaries
- Include course-specific information
- Avoid apologetic language
- Provide clear redirection to course content
- Follow exact templates from instruction set

## Usage

Run the complete test suite:
```bash
npm test -- tests/integration/secure-course-bot/ManipulationAttempts.test.js --run
```

The test suite includes 122 individual test cases covering all manipulation patterns specified in the requirements document.