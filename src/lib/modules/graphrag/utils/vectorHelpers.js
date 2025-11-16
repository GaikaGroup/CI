/**
 * Vector Helpers for pgvector operations
 */

/**
 * Convert embedding array to pgvector string format
 * @param {number[]} embedding - Embedding array
 * @returns {string} Vector string
 */
export function embeddingToVector(embedding) {
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding must be an array');
  }
  return `[${embedding.join(',')}]`;
}

/**
 * Insert node with vector embedding using raw SQL
 * @param {Object} prisma - Prisma client
 * @param {Object} node - Node data
 * @param {number[]} embedding - Embedding array
 * @returns {Promise<string>} Inserted node ID
 */
export async function insertNodeWithVector(prisma, node, embedding) {
  const id = `kg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const embeddingVector = embeddingToVector(embedding);

  await prisma.$executeRawUnsafe(`
    INSERT INTO knowledge_graph_nodes (
      id, material_id, course_id, content, chunk_index, metadata, embedding, created_at, updated_at
    ) VALUES (
      '${id}',
      '${node.materialId}',
      '${node.courseId}',
      '${node.content.replace(/'/g, "''")}',
      ${node.chunkIndex || 0},
      '${JSON.stringify(node.metadata || {})}'::jsonb,
      '${embeddingVector}'::vector,
      NOW(),
      NOW()
    )
  `);

  return id;
}

/**
 * Perform semantic search with vector similarity
 * @param {Object} prisma - Prisma client
 * @param {number[]} queryEmbedding - Query embedding
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Search results
 */
export async function vectorSearch(prisma, queryEmbedding, options = {}) {
  const embeddingVector = embeddingToVector(queryEmbedding);
  const limit = options.limit || 10;
  const threshold = options.similarityThreshold || 0.7;

  // Build WHERE conditions
  const conditions = ['embedding IS NOT NULL'];
  if (options.materialId) {
    conditions.push(`material_id = '${options.materialId}'`);
  }
  if (options.courseId) {
    conditions.push(`course_id = '${options.courseId}'`);
  }
  conditions.push(`1 - (embedding <=> '${embeddingVector}'::vector) >= ${threshold}`);

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const results = await prisma.$queryRawUnsafe(`
    SELECT 
      id,
      material_id as "materialId",
      course_id as "courseId",
      content,
      chunk_index as "chunkIndex",
      metadata,
      1 - (embedding <=> '${embeddingVector}'::vector) as similarity
    FROM knowledge_graph_nodes
    ${whereClause}
    ORDER BY embedding <=> '${embeddingVector}'::vector
    LIMIT ${limit}
  `);

  return results;
}
