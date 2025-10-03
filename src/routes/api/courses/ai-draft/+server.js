import { json } from '@sveltejs/kit';
import { OPENAI_CONFIG } from '$lib/config/api';

const DESCRIPTION_WORD_LIMIT = 250;
const SHORT_DESCRIPTION_WORD_LIMIT = 50;
const SKILL_LIMIT = 5;
const AGENT_LIMIT = 3;

function clampWords(text, limit) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) {
    return words.join(' ');
  }
  return words.slice(0, limit).join(' ');
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }
  const seen = new Set();
  const cleaned = [];
  for (const skill of skills) {
    const text = sanitizeString(skill);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(text);
    if (cleaned.length >= SKILL_LIMIT) {
      break;
    }
  }
  return cleaned;
}

function sanitizeAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return null;
  }
  return {
    name: sanitizeString(agent.name),
    description: sanitizeString(agent.description),
    instructions: sanitizeString(agent.instructions),
    systemPrompt: sanitizeString(agent.systemPrompt)
  };
}

async function callOpenAI(messages) {
  const payload = {
    model: OPENAI_CONFIG.MODEL,
    temperature: OPENAI_CONFIG.TEMPERATURE,
    max_tokens: Math.min(OPENAI_CONFIG.MAX_TOKENS || 800, 1500),
    response_format: { type: 'json_object' },
    messages
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_CONFIG.API_KEY}`
  };

  const maxRetries = OPENAI_CONFIG.RETRY?.MAX_RETRIES ?? 2;
  const retryDelay = OPENAI_CONFIG.RETRY?.RETRY_DELAY ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_CONFIG.TIMEOUT || 30000);

    try {
      const response = await fetch(OPENAI_CONFIG.API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorPayload = await safeParseJSON(response);
        const message =
          errorPayload?.error?.message || errorPayload?.message || response.statusText;
        throw new Error(message);
      }

      const data = await response.json();
      const choice = data.choices?.[0]?.message?.content;
      if (!choice) {
        throw new Error('OpenAI response missing content');
      }

      let parsed;
      try {
        parsed = JSON.parse(choice);
      } catch (err) {
        throw new Error('OpenAI response was not valid JSON');
      }

      return {
        data: parsed,
        usage: data.usage
          ? { totalTokens: data.usage.total_tokens, model: data.model || OPENAI_CONFIG.MODEL }
          : null
      };
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Failed to contact OpenAI');
}

async function safeParseJSON(response) {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

export async function POST({ request, locals }) {
  if (!locals.user) {
    return json({ message: 'Authentication required' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    topic,
    audience = '',
    languageHint = '',
    levelHint = '',
    notes = '',
    agentContext = '',
    allowOpenAI = true
  } = body || {};

  if (!allowOpenAI) {
    return json({ message: 'OpenAI drafting is disabled for this course.' }, { status: 403 });
  }

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return json({ message: 'Course topic is required.' }, { status: 400 });
  }

  const systemPrompt =
    `You are an expert instructional designer and AI systems architect. ` +
    `Return a strict JSON object matching this schema: ` +
    `{"course": {"language": string, "level": string, "description": string, "shortDescription": string, "skills": string[]}, ` +
    `"agents": [{"name": string, "description": string, "instructions": string, "systemPrompt": string}]}. ` +
    `Descriptions must respect word limits (course.description ≤ ${DESCRIPTION_WORD_LIMIT} words, course.shortDescription ≤ ${SHORT_DESCRIPTION_WORD_LIMIT} words). ` +
    `Include up to ${SKILL_LIMIT} concise skills (single phrases). ` +
    `Agents array can contain zero to ${AGENT_LIMIT} entries. Use adult learner appropriate tone.`;

  const userPromptLines = [`Course topic: ${topic.trim()}`];

  if (audience) {
    userPromptLines.push(`Target audience: ${audience}`);
  }
  if (languageHint) {
    userPromptLines.push(`Preferred language: ${languageHint}`);
  }
  if (levelHint) {
    userPromptLines.push(`Proficiency level guidance: ${levelHint}`);
  }
  if (notes) {
    userPromptLines.push(`Additional notes: ${notes}`);
  }
  if (agentContext) {
    userPromptLines.push(`Agent requirements: ${agentContext}`);
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPromptLines.join('\n') }
  ];

  try {
    const { data, usage } = await callOpenAI(messages);

    const course = {
      language: sanitizeString(data.course?.language),
      level: sanitizeString(data.course?.level),
      description: clampWords(data.course?.description, DESCRIPTION_WORD_LIMIT),
      shortDescription: clampWords(data.course?.shortDescription, SHORT_DESCRIPTION_WORD_LIMIT),
      skills: sanitizeSkills(data.course?.skills)
    };

    const agents = Array.isArray(data.agents)
      ? data.agents
          .slice(0, AGENT_LIMIT)
          .map(sanitizeAgent)
          .filter((agent) => agent && agent.name && agent.description && agent.systemPrompt)
      : [];

    return json({ course, agents, usage });
  } catch (error) {
    console.error('AI draft generation failed', {
      message: error.message,
      userId: locals.user?.id,
      topicLength: topic?.length || 0
    });
    return json(
      { message: 'Failed to generate AI draft. Please try again later.' },
      { status: 500 }
    );
  }
}
