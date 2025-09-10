import { describe, it, expect, vi } from 'vitest';
import { PDFExtractor } from '$lib/modules/document/pdf/PDFExtractor';

describe('PDFExtractor', () => {
  it('extracts text from a simple PDF buffer', async () => {
    const extractor = new PDFExtractor();
    const buffer = new Uint8Array([37, 80, 68, 70, 45]); // %PDF-
    extractor.loadPDFLibrary = vi.fn();
    extractor.pdfjsLib = {
      getDocument: vi.fn().mockReturnValue({
        promise: Promise.resolve({
          numPages: 1,
          getPage: vi.fn().mockResolvedValue({
            getTextContent: vi.fn().mockResolvedValue({ items: [{ str: 'Hello PDF' }] })
          })
        })
      })
    };
    const text = await extractor.extractText(buffer);
    expect(text.trim()).toBe('Hello PDF');
  });
});
