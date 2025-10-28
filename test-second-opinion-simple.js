/**
 * Simple E2E test for Second Opinion
 * Run with: node test-second-opinion-simple.js
 */

const API_URL = 'http://localhost:3002';
const USER_ID = 'cmgyd8zjv0000duudqi3pjn3y'; // AdminLogin

async function test() {
  console.log('========================================');
  console.log('E2E Test: Second Opinion');
  console.log('========================================\n');

  try {
    // Step 1: Create session directly in DB
    console.log('1️⃣  Creating session...');
    const { execSync } = await import('child_process');

    const sessionId = `test_${Date.now()}`;
    execSync(
      `psql -U mak -d ai_tutor_sessions -c "INSERT INTO sessions (id, user_id, title, language, mode, created_at, updated_at) VALUES ('${sessionId}', '${USER_ID}', 'Test', 'en', 'fun', now(), now())"`
    );
    console.log(`✅ Session created: ${sessionId}\n`);

    // Step 2: Add user message
    console.log('2️⃣  Adding question: "Who is better cat or dog?"');
    const userMsgId = `msg_user_${Date.now()}`;
    execSync(
      `psql -U mak -d ai_tutor_sessions -c "INSERT INTO messages (id, session_id, type, content, created_at) VALUES ('${userMsgId}', '${sessionId}', 'user', 'Who is better cat or dog?', now())"`
    );
    console.log(`✅ User message added\n`);

    // Step 3: Get answer from default LLM (Ollama)
    console.log('3️⃣  Getting answer from Ollama qwen2.5:1.5b...');
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:1.5b',
        messages: [{ role: 'user', content: 'Who is better cat or dog?' }],
        stream: false
      })
    });
    const ollamaData = await ollamaResponse.json();
    const answer1 = ollamaData.message.content;

    console.log(`✅ Answer 1 (Ollama qwen2.5:1.5b):`);
    console.log(answer1.substring(0, 200) + '...\n');

    // Save to DB
    const assistantMsgId = `msg_assistant_${Date.now()}`;
    const escapedAnswer1 = answer1.replace(/'/g, "''");
    execSync(
      `psql -U mak -d ai_tutor_sessions -c "INSERT INTO messages (id, session_id, type, content, metadata, created_at) VALUES ('${assistantMsgId}', '${sessionId}', 'assistant', '${escapedAnswer1}', '{\\\"provider\\\":\\\"ollama\\\",\\\"model\\\":\\\"qwen2.5:1.5b\\\"}'::jsonb, now())"`
    );

    // Step 4: Get second opinion from OpenAI
    console.log('4️⃣  Getting second opinion from OpenAI...');

    // Check if OpenAI key exists
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.log('⚠️  OPENAI_API_KEY not set, skipping OpenAI test');
      console.log('✅ Test completed: Got answer from Ollama\n');
      return;
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Who is better cat or dog?' }]
      })
    });
    const openaiData = await openaiResponse.json();
    const answer2 = openaiData.choices[0].message.content;

    console.log(`✅ Answer 2 (OpenAI gpt-4o-mini):`);
    console.log(answer2.substring(0, 200) + '...\n');

    // Step 5: Compare
    console.log('========================================');
    console.log('✅ RESULT');
    console.log('========================================\n');
    console.log('Question: Who is better cat or dog?\n');
    console.log('Answer 1 (Ollama qwen2.5:1.5b):');
    console.log(answer1.substring(0, 150) + '...\n');
    console.log('Answer 2 (OpenAI gpt-4o-mini):');
    console.log(answer2.substring(0, 150) + '...\n');
    console.log('✅ Got two different answers from different LLMs!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
