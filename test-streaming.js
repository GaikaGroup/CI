/**
 * Simple test for Ollama streaming
 * Run: node test-streaming.js
 */

const OLLAMA_URL = 'http://127.0.0.1:11434';

async function testOllamaStreaming() {
  console.log('🧪 Testing Ollama streaming...\n');

  // Check if Ollama is running
  try {
    const pingResponse = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!pingResponse.ok) {
      console.error('❌ Ollama is not running!');
      console.log('Start it with: ollama serve');
      process.exit(1);
    }
    console.log('✅ Ollama is running');
  } catch (error) {
    console.error('❌ Cannot connect to Ollama:', error.message);
    process.exit(1);
  }

  // Get available models
  const tagsResponse = await fetch(`${OLLAMA_URL}/api/tags`);
  const tagsData = await tagsResponse.json();
  const models = tagsData.models.map((m) => m.model);
  console.log('📦 Available models:', models.join(', '));

  // Find qwen model
  const qwenModel = models.find((m) => m.includes('qwen')) || models[0];
  console.log(`🎯 Using model: ${qwenModel}\n`);

  // Test streaming
  console.log('🚀 Starting streaming test...\n');

  const payload = {
    model: qwenModel,
    messages: [{ role: 'user', content: 'Say hello in 3 sentences.' }],
    stream: true,
    options: {
      num_predict: 100,
      temperature: 0.7
    }
  };

  const startTime = Date.now();
  let firstChunkTime = null;
  let fullResponse = '';
  let chunkCount = 0;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    console.log('📥 Receiving chunks:\n');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const data = JSON.parse(trimmed);
          const chunk = data.message?.content || '';

          if (chunk) {
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              console.log(`⏱️  First chunk received in ${firstChunkTime - startTime}ms\n`);
            }

            fullResponse += chunk;
            chunkCount++;
            process.stdout.write(chunk); // Print chunk immediately
          }

          if (data.done) {
            console.log('\n\n✅ Stream completed!');
          }
        } catch (parseError) {
          console.warn('⚠️  Failed to parse line:', trimmed);
        }
      }
    }

    const totalTime = Date.now() - startTime;

    console.log('\n📊 Results:');
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Time to first chunk: ${firstChunkTime - startTime}ms`);
    console.log(`   Chunks received: ${chunkCount}`);
    console.log(`   Response length: ${fullResponse.length} characters`);
    console.log(`   Average chunk size: ${Math.round(fullResponse.length / chunkCount)} chars`);

    if (firstChunkTime - startTime < 3000) {
      console.log('\n🎉 SUCCESS! Streaming is working fast (< 3 seconds to first chunk)');
    } else {
      console.log('\n⚠️  WARNING: First chunk took longer than 3 seconds');
    }
  } catch (error) {
    console.error('\n❌ Streaming test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testOllamaStreaming().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
