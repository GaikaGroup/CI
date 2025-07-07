import { json } from '@sveltejs/kit';
import { OPENAI_CONFIG } from '$lib/config/api';

/**
 * Handle POST requests to the chat API
 * @param {Request} request - The request object
 * @returns {Response} - The response object
 */
export async function POST({ request }) {
  try {
    const { content, language } = await request.json();

    // Prepare the request to OpenAI API
    const response = await fetch(OPENAI_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI tutor. Respond in ${language || 'English'}.`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: OPENAI_CONFIG.TEMPERATURE,
        max_tokens: OPENAI_CONFIG.MAX_TOKENS
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return json({ error: 'Failed to get response from AI' }, { status: 500 });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return json({ response: aiResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
