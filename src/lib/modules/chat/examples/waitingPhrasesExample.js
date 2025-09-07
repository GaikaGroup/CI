/**
 * Example usage of the Waiting Phrases Configuration System
 * This file demonstrates how to use the configuration loader and utilities
 */

import {
  loadWaitingPhrasesConfig,
  getPhrasesForLanguage,
  getAvailableLanguages,
  getAvailableCategories,
  isLanguageSupported
} from '../waitingPhrasesConfig.js';

/**
 * Example function demonstrating basic usage
 */
export async function demonstrateBasicUsage() {
  console.log('=== Waiting Phrases Configuration Demo ===\n');
  
  // Load the configuration
  const config = await loadWaitingPhrasesConfig();
  console.log('✓ Configuration loaded successfully');
  
  // Show available categories
  const categories = getAvailableCategories(config);
  console.log('Available categories:', categories);
  
  // Show available languages for general category
  const languages = getAvailableLanguages(config, 'general');
  console.log('Available languages for "general":', languages);
  
  // Get phrases for different languages
  console.log('\n=== Sample Phrases ===');
  
  const englishPhrases = getPhrasesForLanguage(config, 'en', 'general');
  console.log('English phrases (first 3):');
  englishPhrases.slice(0, 3).forEach((phrase, index) => {
    console.log(`  ${index + 1}. "${phrase}"`);
  });
  
  const russianPhrases = getPhrasesForLanguage(config, 'ru', 'general');
  console.log('\nRussian phrases (first 2):');
  russianPhrases.slice(0, 2).forEach((phrase, index) => {
    console.log(`  ${index + 1}. "${phrase}"`);
  });
  
  // Demonstrate contextual phrases
  console.log('\n=== Contextual Phrases ===');
  const mathPhrases = getPhrasesForLanguage(config, 'en', 'math');
  console.log('Math-related phrases:');
  mathPhrases.forEach((phrase, index) => {
    console.log(`  ${index + 1}. "${phrase}"`);
  });
  
  // Demonstrate language support checking
  console.log('\n=== Language Support ===');
  console.log('English supported in general:', isLanguageSupported(config, 'en', 'general'));
  console.log('French supported in general:', isLanguageSupported(config, 'fr', 'general'));
  console.log('Spanish supported in math:', isLanguageSupported(config, 'es', 'math'));
  
  // Demonstrate fallback behavior
  console.log('\n=== Fallback Behavior ===');
  const fallbackPhrases = getPhrasesForLanguage(config, 'nonexistent', 'general');
  console.log('Phrases for non-existent language (should fallback to English):');
  console.log(`  First phrase: "${fallbackPhrases[0]}"`);
  
  return config;
}

/**
 * Example function showing how to randomly select phrases
 */
export function demonstratePhraseSelection(config) {
  console.log('\n=== Random Phrase Selection ===');
  
  const phrases = getPhrasesForLanguage(config, 'en', 'general');
  
  // Simple random selection
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  console.log('Random phrase:', `"${randomPhrase}"`);
  
  // Selection with history tracking (avoiding repeats)
  const phraseHistory = [];
  const maxHistory = config.settings.maxHistorySize;
  
  console.log('\nSelecting 5 phrases with repeat avoidance:');
  for (let i = 0; i < 5; i++) {
    let selectedPhrase;
    let attempts = 0;
    const maxAttempts = phrases.length * 2; // Prevent infinite loop
    
    do {
      selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      attempts++;
    } while (
      phraseHistory.includes(selectedPhrase) && 
      attempts < maxAttempts &&
      phraseHistory.length < phrases.length
    );
    
    console.log(`  ${i + 1}. "${selectedPhrase}"`);
    
    // Add to history and maintain size limit
    phraseHistory.push(selectedPhrase);
    if (phraseHistory.length > maxHistory) {
      phraseHistory.shift();
    }
  }
}

/**
 * Example function showing configuration settings usage
 */
export function demonstrateSettings(config) {
  console.log('\n=== Configuration Settings ===');
  
  const settings = config.settings;
  console.log('Avoid consecutive repeats:', settings.avoidConsecutiveRepeats);
  console.log('Max phrase length:', settings.maxPhraseLength);
  console.log('Fallback to translation:', settings.fallbackToTranslation);
  console.log('Default language:', settings.defaultLanguage);
  console.log('Max history size:', settings.maxHistorySize);
  console.log('Enable contextual phrases:', settings.enableContextualPhrases);
}

/**
 * Run the complete demonstration
 */
export async function runDemo() {
  try {
    const config = await demonstrateBasicUsage();
    demonstratePhraseSelection(config);
    demonstrateSettings(config);
    console.log('\n✓ Demo completed successfully!');
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Uncomment the line below to run the demo when this file is executed directly
// runDemo();