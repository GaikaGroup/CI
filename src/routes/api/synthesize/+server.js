import { TTS_CONFIG } from '$lib/config/api';

/**
 * Handle POST requests to the synthesize API
 * @param {Request} request - The request object
 * @returns {Response} - The response object with audio data
 */
export async function POST({ request }) {
  try {
    // Get the JSON data from the request
    const { text, language } = await request.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For development/testing, simulate a successful response if API key is not set
    if (TTS_CONFIG.API_KEY === 'your-api-key-here') {
      console.log('Using simulated TTS response (no API key provided)');

      // Create a simple audio blob with a beep sound
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const destination = audioContext.createMediaStreamDestination();

      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      oscillator.connect(destination);
      oscillator.start();

      // Record for 1 second
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();

      await new Promise((resolve) => setTimeout(resolve, 1000));
      mediaRecorder.stop();

      await new Promise((resolve) => {
        mediaRecorder.onstop = resolve;
      });

      const blob = new Blob(chunks, { type: 'audio/wav' });

      return new Response(blob, {
        headers: { 'Content-Type': 'audio/wav' }
      });
    }

    // Prepare the request to OpenAI TTS API
    const response = await fetch(TTS_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TTS_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: TTS_CONFIG.MODEL,
        input: text,
        voice: TTS_CONFIG.VOICE
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TTS API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to synthesize speech' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the audio data directly
    const audioBlob = await response.blob();
    return new Response(audioBlob, {
      headers: { 'Content-Type': 'audio/mpeg' }
    });
  } catch (error) {
    console.error('Error in synthesize API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
