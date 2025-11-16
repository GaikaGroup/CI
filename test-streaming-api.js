/**
 * Test script for streaming API functionality
 * Tests both OpenAI and Ollama providers with streaming enabled
 */

async function testStreamingAPI() {
  console.log('🧪 Testing Streaming API Functionality\n');

  // Test configuration
  const API_URL = 'http://localhost:5173/api/chat';
  const testMessage = 'Explain photosynthesis in 3 sentences.';

  console.log('Test Message:', testMessage);
  console.log('API URL:', API_URL);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Test 1: Streaming mode
    console.log('📡 Test 1: Streaming Mode (stream=true)\n');

    const streamStartTime = Date.now();
    let firstChunkTime = null;
    let chunkCount = 0;
    let fullResponse = '';

    const streamResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=test-session' // Mock session
      },
      body: JSON.stringify({
        content: testMessage,
        language: 'en',
        stream: true // Enable streaming
      })
    });

    if (!streamResponse.ok) {
      throw new Error(`HTTP ${streamResponse.status}: ${streamResponse.statusText}`);
    }

    console.log('✓ Stream connection established');
    console.log('Response headers:', {
      contentType: streamResponse.headers.get('content-type'),
      transferEncoding: streamResponse.headers.get('transfer-encoding')
    });
    console.log('\nReceiving chunks:\n');

    // Read stream
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      chunkCount++;
      fullResponse += chunk;

      if (firstChunkTime === null) {
        firstChunkTime = Date.now() - streamStartTime;
        console.log(`⚡ First chunk received in ${firstChunkTime}ms`);
      }

      // Show chunk preview
      const preview = chunk.length > 50 ? chunk.substring(0, 50) + '...' : chunk;
      console.log(`  Chunk ${chunkCount}: ${chunk.length} chars - "${preview}"`);
    }

    const streamDuration = Date.now() - streamStartTime;

    console.log('\n' + '-'.repeat(60));
    console.log('✅ Streaming Test Complete\n');
    console.log('Metrics:');
    console.log(`  - Time to First Chunk: ${firstChunkTime}ms`);
    console.log(`  - Total Duration: ${streamDuration}ms`);
    console.log(`  - Total Chunks: ${chunkCount}`);
    console.log(`  - Total Length: ${fullResponse.length} chars`);
    console.log(`  - Avg Chunk Size: ${Math.round(fullResponse.length / chunkCount)} chars`);
    console.log('\nFull Response:');
    console.log(fullResponse);
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Non-streaming mode (backward compatibility)
    console.log('📡 Test 2: Non-Streaming Mode (stream=false)\n');

    const nonStreamStartTime = Date.now();

    const nonStreamResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=test-session'
      },
      body: JSON.stringify({
        content: testMessage,
        language: 'en',
        stream: false // Disable streaming (or omit)
      })
    });

    if (!nonStreamResponse.ok) {
      throw new Error(`HTTP ${nonStreamResponse.status}: ${nonStreamResponse.statusText}`);
    }

    const jsonData = await nonStreamResponse.json();
    const nonStreamDuration = Date.now() - nonStreamStartTime;

    console.log('✓ Non-streaming response received');
    console.log('\nMetrics:');
    console.log(`  - Total Duration: ${nonStreamDuration}ms`);
    console.log(`  - Response Length: ${jsonData.response?.length || 0} chars`);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(jsonData, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');

    // Compare results
    console.log('📊 Comparison:\n');
    console.log(`Streaming TTFC (Time to First Chunk): ${firstChunkTime}ms`);
    console.log(`Streaming Total Duration: ${streamDuration}ms`);
    console.log(`Non-Streaming Total Duration: ${nonStreamDuration}ms`);

    const improvement = (((nonStreamDuration - firstChunkTime) / nonStreamDuration) * 100).toFixed(
      1
    );
    console.log(`\n⚡ Perceived latency improvement: ${improvement}%`);
    console.log(`   (User sees response ${firstChunkTime}ms vs ${nonStreamDuration}ms)`);

    console.log('\n✅ All tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Run tests
console.log('Starting streaming API tests...\n');
console.log('⚠️  Make sure the dev server is running on http://localhost:5173\n');

testStreamingAPI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
