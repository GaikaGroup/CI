import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../src/routes/api/courses/ai-draft/+server.js';

function buildRequest(body) {
  return new Request('http://localhost/api/courses/ai-draft', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

describe('POST /api/courses/ai-draft', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('requires authentication', async () => {
    const response = await POST({
      request: buildRequest({ topic: 'Test Course' }),
      locals: { user: null }
    });

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.message).toMatch(/authentication/i);
  });

  it('validates topic field', async () => {
    const response = await POST({
      request: buildRequest({ topic: '  ', allowOpenAI: true }),
      locals: { user: { id: 'user-1' } }
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.message).toMatch(/topic/i);
  });

  it('rejects when OpenAI usage is disabled', async () => {
    const response = await POST({
      request: buildRequest({ topic: 'Course', allowOpenAI: false }),
      locals: { user: { id: 'user-1' } }
    });

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.message).toMatch(/disabled/i);
  });

  it('returns sanitised course and agent suggestions', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                course: {
                  language: ' Spanish ',
                  level: ' B2 ',
                  description: 'word '.repeat(260),
                  shortDescription: 'short '.repeat(80),
                  skills: [
                    'Skill A',
                    'Skill B',
                    'Skill C',
                    'Skill A',
                    'Skill D',
                    'Skill E',
                    'Skill F'
                  ]
                },
                agents: [
                  {
                    name: 'Coach',
                    description: 'Helps learners',
                    instructions: 'Guide conversation',
                    systemPrompt: 'You are a coach'
                  },
                  {
                    name: 'Extra',
                    description: 'Should be trimmed',
                    instructions: 'Do more',
                    systemPrompt: 'Extra agent'
                  },
                  {
                    name: 'Third',
                    description: 'Third agent',
                    instructions: 'Assist',
                    systemPrompt: 'Third agent'
                  },
                  {
                    name: 'Overflow',
                    description: 'Should not appear',
                    instructions: 'Ignore',
                    systemPrompt: 'Ignore'
                  }
                ]
              })
            }
          }
        ],
        usage: { total_tokens: 512 },
        model: 'gpt-test'
      })
    };

    fetch.mockResolvedValue(mockResponse);

    const response = await POST({
      request: buildRequest({ topic: 'Spanish course', allowOpenAI: true }),
      locals: { user: { id: 'user-1' } }
    });

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.course.language).toBe('Spanish');
    expect(payload.course.level).toBe('B2');
    const descriptionWordCount = payload.course.description.split(/\s+/).length;
    expect(descriptionWordCount).toBeLessThanOrEqual(250);
    const shortDescriptionWordCount = payload.course.shortDescription.split(/\s+/).length;
    expect(shortDescriptionWordCount).toBeLessThanOrEqual(50);
    expect(payload.course.skills).toHaveLength(5);
    expect(new Set(payload.course.skills).size).toBe(payload.course.skills.length);

    expect(payload.agents).toHaveLength(3);
    expect(payload.agents[0].name).toBe('Coach');
    expect(payload.agents[0].description).toBe('Helps learners');
    expect(payload.usage.totalTokens).toBe(512);
    expect(payload.usage.model).toBe('gpt-test');
  });

  it('returns 500 when OpenAI call fails', async () => {
    fetch.mockRejectedValue(new Error('network error'));

    const response = await POST({
      request: buildRequest({ topic: 'Course', allowOpenAI: true }),
      locals: { user: { id: 'user-1' } }
    });

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.message).toMatch(/failed/i);
  });
});
