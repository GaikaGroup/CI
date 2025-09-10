import { encoding_for_model } from '@dqbd/tiktoken';

const decoder = new TextDecoder();

export function chunkText(text, chunkSize = 500, overlap = 50) {
  const encoder = encoding_for_model('gpt-3.5-turbo');
  const tokens = encoder.encode(text);
  const chunks = [];
  let start = 0;

  const safeOverlap = Math.min(Math.max(overlap, 0), chunkSize - 1);

  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    chunks.push(decoder.decode(encoder.decode(chunkTokens)));
    if (end === tokens.length) break;
    start = end - safeOverlap;
  }

  encoder.free();
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
  const encoder = encoding_for_model('gpt-3.5-turbo');
  const sections = chunkByHeading(text);
  const results = [];

  const safeOverlap = Math.min(Math.max(overlap, 0), chunkSize - 1);

  for (const { heading, text: sectionText } of sections) {
    const paragraphs = sectionText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    const paragraphTokens = [];
    const boundaries = [];
    let running = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const tokens = Array.from(encoder.encode(paragraphs[i]));
      paragraphTokens.push(tokens);
      running += tokens.length;
      boundaries.push(running);
      if (i < paragraphs.length - 1) {
        const sep = Array.from(encoder.encode('\n\n'));
        paragraphTokens.push(sep);
        running += sep.length;
      }
    }
    const allTokens = paragraphTokens.flat();

    let start = 0;
    const total = allTokens.length;
    while (start < total) {
      let end = Math.min(start + chunkSize, total);
      let boundary = null;
      for (const b of boundaries) {
        if (b > start && b <= end) boundary = b;
        if (b > end) break;
      }
      if (boundary && boundary - start >= chunkSize * 0.5) {
        end = boundary;
      }

      const chunkTokens = allTokens.slice(start, end);
      const decoded = encoder.decode(new Uint32Array(chunkTokens));
      results.push({ heading, text: decoder.decode(decoded) });
      if (end === total) break;
      start = end - safeOverlap;
    }
  }

  encoder.free();
  return results;
}
