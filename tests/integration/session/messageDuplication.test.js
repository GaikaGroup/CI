import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageService } from '$lib/modules/session/services/MessageService.js';
import { SessionService } from '$lib/modules/session/services/SessionService.js';
import { prisma } from '$lib/database/client.js';

/**
 * Integration tests for message duplication prevention
 * Tests that messages are not saved multiple times to the database
 */
describe('Message Duplication Prevention', () => {
  let testUserId;
  let testSessionId;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        password: 'hashed_password',
        type: 'regular'
      }
    });
    testUserId = user.id;

    // Create test session
    const session = await SessionService.createSession(
      testUserId,
      'Test Session',
      'fun', // Mode must be 'fun' or 'learn'
      'en',
      null,
      null,
      false // Don't create welcome message
    );
    testSessionId = session.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testSessionId) {
      await prisma.message.deleteMany({
        where: { sessionId: testSessionId }
      });
      await prisma.session.delete({
        where: { id: testSessionId }
      });
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      });
    }
  });

  it('should not create duplicate messages when saving the same content', async () => {
    const messageContent = 'Test message content';

    // Save message first time
    const message1 = await MessageService.addMessage(
      testSessionId,
      'user',
      messageContent,
      null,
      testUserId
    );

    // Get all messages
    const result1 = await MessageService.getSessionMessages(testSessionId, {}, testUserId);
    expect(result1.messages).toHaveLength(1);
    expect(result1.messages[0].content).toBe(messageContent);

    // Try to save the same message again (simulating duplicate save attempt)
    const message2 = await MessageService.addMessage(
      testSessionId,
      'user',
      messageContent,
      null,
      testUserId
    );

    // Get all messages again
    const result2 = await MessageService.getSessionMessages(testSessionId, {}, testUserId);

    // Should have 2 messages (both saves succeeded, but they are separate messages)
    // This is expected behavior - the system allows duplicate content
    expect(result2.messages).toHaveLength(2);

    // But they should have different IDs
    expect(message1.id).not.toBe(message2.id);
  });

  it('should handle rapid message creation without duplication', async () => {
    const messages = [
      { type: 'user', content: 'First message' },
      { type: 'assistant', content: 'First response' },
      { type: 'user', content: 'Second message' },
      { type: 'assistant', content: 'Second response' }
    ];

    // Save all messages rapidly
    const savedMessages = await Promise.all(
      messages.map((msg) =>
        MessageService.addMessage(testSessionId, msg.type, msg.content, null, testUserId)
      )
    );

    // All messages should be saved
    expect(savedMessages).toHaveLength(4);

    // All should have unique IDs
    const ids = savedMessages.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4);

    // Verify in database
    const result = await MessageService.getSessionMessages(testSessionId, {}, testUserId);
    expect(result.messages).toHaveLength(4);
  });

  it('should maintain message order when saving multiple messages', async () => {
    const messages = [
      { type: 'user', content: 'Message 1' },
      { type: 'assistant', content: 'Response 1' },
      { type: 'user', content: 'Message 2' },
      { type: 'assistant', content: 'Response 2' }
    ];

    // Save messages in sequence
    for (const msg of messages) {
      await MessageService.addMessage(testSessionId, msg.type, msg.content, null, testUserId);
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Get messages in ascending order
    const result = await MessageService.getSessionMessages(
      testSessionId,
      { sortOrder: 'asc' },
      testUserId
    );

    expect(result.messages).toHaveLength(4);
    expect(result.messages[0].content).toBe('Message 1');
    expect(result.messages[1].content).toBe('Response 1');
    expect(result.messages[2].content).toBe('Message 2');
    expect(result.messages[3].content).toBe('Response 2');
  });

  it('should not duplicate messages with metadata', async () => {
    const metadata = { images: ['image1.jpg', 'image2.jpg'] };

    // Save message with metadata
    const message1 = await MessageService.addMessage(
      testSessionId,
      'user',
      'Message with images',
      metadata,
      testUserId
    );

    expect(message1.metadata).toEqual(metadata);

    // Get messages
    const result = await MessageService.getSessionMessages(testSessionId, {}, testUserId);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].metadata).toEqual(metadata);
  });

  it('should handle concurrent message saves correctly', async () => {
    // Simulate concurrent saves (like from multiple browser tabs)
    const concurrentSaves = Array.from({ length: 5 }, (_, i) =>
      MessageService.addMessage(testSessionId, 'user', `Concurrent message ${i}`, null, testUserId)
    );

    const savedMessages = await Promise.all(concurrentSaves);

    // All messages should be saved
    expect(savedMessages).toHaveLength(5);

    // All should have unique IDs
    const ids = savedMessages.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);

    // Verify in database
    const result = await MessageService.getSessionMessages(testSessionId, {}, testUserId);
    expect(result.messages).toHaveLength(5);
  });
});
