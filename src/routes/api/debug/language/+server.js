/**
 * Debug endpoint to test language detection flow
 * GET /api/debug/language?content=TEXT&language=LANG&confirmed=true
 */

import { json } from '@sveltejs/kit';
import { languageDetector } from '$lib/modules/chat/LanguageDetector.js';
import { sessionLanguageManager } from '$lib/modules/chat/SessionLanguageManager.js';
import { promptEnhancer } from '$lib/modules/chat/PromptEnhancer.js';
import { LanguageManagementService } from '$lib/modules/chat/services/LanguageManagementService.js';

const languageManager = new LanguageManagementService(
  languageDetector,
  sessionLanguageManager,
  null
);

export async function GET({ url }) {
  const content = url.searchParams.get('content') || 'Расскажи про вакансию';
  const language = url.searchParams.get('language') || 'ru';
  const languageConfirmed = url.searchParams.get('confirmed') === 'true';

  const sessionId = `debug_${Date.now()}`;

  // Step 1: Language detection
  let detectedLanguage;
  let languageConfidence;

  if (languageConfirmed && language) {
    detectedLanguage = language;
    languageConfidence = 1.0;
  } else {
    const languageDetection = languageManager.detectLanguage({
      content,
      sessionId,
      fallbackLanguage: language,
      images: [],
      provider: 'openai'
    });
    detectedLanguage = languageDetection.language;
    languageConfidence = languageDetection.confidence;
  }

  // Step 2: Short message handling
  let shortMessageSkipped = false;
  if (!languageConfirmed) {
    const shortMessageResult = languageManager.handleShortMessage({
      content,
      detectedLanguage,
      languageConfidence,
      sessionContext: null
    });

    if (shortMessageResult.adjusted) {
      detectedLanguage = shortMessageResult.language;
      languageConfidence = shortMessageResult.confidence;
    }
  } else {
    shortMessageSkipped = true;
  }

  // Step 3: Language instructions
  const languageInstructions = languageManager.getLanguageInstructions(detectedLanguage);

  // Step 4: Enhanced system prompt
  const enhancedSystemPrompt = promptEnhancer.enhanceSystemPrompt(
    languageInstructions.instruction,
    detectedLanguage,
    languageConfidence,
    {
      hasLanguageMixing: false,
      enhancementLevel: 'ultra_strong'
    }
  );

  return json({
    input: {
      content,
      language,
      languageConfirmed
    },
    step1_detection: {
      detectedLanguage,
      languageConfidence,
      method: languageConfirmed ? 'confirmed' : 'detected'
    },
    step2_shortMessage: {
      skipped: shortMessageSkipped,
      finalLanguage: detectedLanguage
    },
    step3_instructions: {
      language: detectedLanguage,
      instruction: languageInstructions.instruction.substring(0, 200) + '...'
    },
    step4_systemPrompt: {
      prompt: enhancedSystemPrompt.substring(0, 300) + '...',
      containsRussian:
        enhancedSystemPrompt.includes('Russian') || enhancedSystemPrompt.includes('русском'),
      containsSpanish:
        enhancedSystemPrompt.includes('Spanish') || enhancedSystemPrompt.includes('español'),
      containsEnglish:
        enhancedSystemPrompt.includes('English') && !enhancedSystemPrompt.includes('Russian')
    },
    verdict: {
      languagePreserved: detectedLanguage === language,
      correctInstructions: enhancedSystemPrompt.includes(
        detectedLanguage === 'ru' ? 'Russian' : detectedLanguage === 'en' ? 'English' : 'Spanish'
      )
    }
  });
}
