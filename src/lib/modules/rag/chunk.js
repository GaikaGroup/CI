export function chunkText(text, chunkSize = 500, overlap = 50) {
  const tokens = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  // Guard to avoid non-progress if overlap >= chunkSize
  const safeOverlap = Math.min(overlap, Math.max(0, chunkSize - 1));

  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    chunks.push(chunkTokens.join(' ').trim());
    if (end === tokens.length) break;
    start = end - safeOverlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

export function chunkByHeading(text) {
  const lines = text.split(/\n/);
  const chunks = [];
  let currentHeading = '';
  let buffer = [];

  for (const line of lines) {
    if (/^#+\s/.test(line)) {
      if (buffer.length) {
        chunks.push({ heading: currentHeading, text: buffer.join('\n').trim() });
        buffer = [];
      }
      currentHeading = line.replace(/^#+\s*/, '').trim();
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length) {
    chunks.push({ heading: currentHeading, text: buffer.join('\n').trim() });
  }

  return chunks;
}

export function chunkMarkdown(text, chunkSize = 500, overlap = 50) {
  const sections = chunkByHeading(text);
  const results = [];

  // Guard to keep overlap reasonable relative to chunkSize
  const safeOverlap = Math.max(0, Math.min(overlap, chunkSize - 1));

  for (const { heading, text: sectionText } of sections) {
    const paragraphs = sectionText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    let current = [];
    let tokenCounts = [];
    let tokensInChunk = 0;

    for (const para of paragraphs) {
      const tokens = para.split(/\s+/);
      const count = tokens.length;

      if (tokensInChunk + count > chunkSize && tokensInChunk > 0) {
        results.push({ heading, text: current.join('\n\n') });

        // Build overlap using whole paragraphs from the end
        let overlapParas = [];
        let overlapTokens = 0;
        for (let i = current.length - 1; i >= 0 && overlapTokens < safeOverlap; i--) {
          overlapParas.unshift(current[i]);
          overlapTokens += tokenCounts[i];
        }
        current = overlapParas.slice();
        tokenCounts = overlapParas.map((p) => p.split(/\s+/).length);
        tokensInChunk = overlapTokens;
      }

      current.push(para);
      tokenCounts.push(count);
      tokensInChunk += count;
    }

    if (current.length) {
      results.push({ heading, text: current.join('\n\n') });
    }
  }

  return results;
}
