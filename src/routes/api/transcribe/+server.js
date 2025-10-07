import { json } from '@sveltejs/kit';
import { WHISPER_CONFIG } from '$lib/config/api';

/**
 * Handle POST requests to the transcribe API
 * @param {Request} request - The request object
 * @returns {Response} - The response object with transcription
 */
export async function POST({ request }) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const audioBlob = formData.get('audio');
    const language = formData.get('language') || 'en';

    if (!audioBlob) {
      return json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Create a new FormData object for the OpenAI API request
    const openAIFormData = new FormData();
    openAIFormData.append('file', audioBlob);
    openAIFormData.append('model', WHISPER_CONFIG.MODEL);

    // Add language if specified (optional for Whisper)
    if (language && language !== 'en') {
      openAIFormData.append('language', language);
    }

    // Send the request to the Whisper API
    const response = await fetch(WHISPER_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHISPER_CONFIG.API_KEY}`
      },
      body: openAIFormData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Whisper API error:', errorData);
      return json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }

    const data = await response.json();

    // For development/testing, simulate a successful response if API key is not set
    if (WHISPER_CONFIG.API_KEY === 'your-api-key-here') {
      console.log('Using simulated Whisper response (no API key provided)');
      return json({
        transcription:
          'This is a simulated transcription. Please set a valid OpenAI API key to use the real Whisper API.'
      });
    }

    return json({ transcription: data.text });
  } catch (error) {
    console.error('Error in transcribe API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
