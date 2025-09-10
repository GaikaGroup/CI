export function chunkText(text, chunkSize = 500, overlap = 50) {
  const tokens = text.split(/\s+/);
  const chunks = [];
  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    chunks.push(chunkTokens.join(' ').trim());
    if (end === tokens.length) break;
    start = end - overlap;
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
