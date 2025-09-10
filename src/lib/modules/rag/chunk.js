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
