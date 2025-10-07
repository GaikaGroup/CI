/**
 * PDF Extractor
 *
 * This class is responsible for extracting text from PDF documents and rendering PDF pages to canvas.
 */
export class PDFExtractor {
  constructor(config = {}) {
    this.config = {
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/cmaps/',
      cMapPacked: true,
      ...config
    };
    this.pdfjsLib = null;
  }

  /**
   * Check if the buffer is a PDF by examining its header
   * @param {Uint8Array} buffer - The input buffer
   * @returns {boolean} - True if PDF, false otherwise
   */
  isPDF(buffer) {
    try {
      // Check if buffer is valid and has sufficient length
      if (!buffer || buffer.length < 5) {
        return false;
      }

      // Check if the underlying ArrayBuffer is detached
      if (buffer.buffer.byteLength === 0) {
        return false;
      }

      // Create a new Uint8Array from the first 5 bytes to avoid detached buffer issues
      const headerBytes = new Uint8Array(buffer.buffer.slice(0, 5));
      const header = String.fromCharCode(...headerBytes);
      return header === '%PDF-';
    } catch (error) {
      console.warn('Error checking PDF format:', error);
      return false;
    }
  }

  /**
   * Load PDF.js library if not already loaded
   * @returns {Promise<void>}
   */
  async loadPDFLibrary() {
    if (!this.pdfjsLib) {
      try {
        this.pdfjsLib = await import('pdfjs-dist');
        // Set the worker source to a CDN URL instead of importing the module
        this.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs';
      } catch (importError) {
        console.error('Error importing PDF.js library:', importError);
        throw new Error(`Failed to load PDF processing library: ${importError.message}`);
      }
    }
  }

  /**
   * Extract text from a PDF buffer
   * @param {Uint8Array} buffer - The PDF buffer
   * @returns {Promise<string>} - The extracted text from all pages
   */
  async extractText(buffer) {
    try {
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to extractText method');
        return '';
      }

      // Safely check if it's actually a PDF
      if (!this.isPDF(buffer)) {
        console.warn('Buffer does not appear to be a valid PDF');
        return '';
      }

      await this.loadPDFLibrary();

      // Create a copy of the buffer to avoid detached buffer issues
      const bufferCopy = new Uint8Array(buffer);

      const pdfDoc = await this.pdfjsLib.getDocument({
        data: bufferCopy,
        cMapUrl: this.config.cMapUrl,
        cMapPacked: this.config.cMapPacked
      }).promise;

      const numPages = pdfDoc.numPages;
      let fullText = '';

      // Process each page sequentially
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Check if page has selectable text
          if (textContent.items.length > 0) {
            // Extract selectable text
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + '\n';
          } else {
            // If no selectable text, we'll return an empty string for this page
            // The OCR engine will handle rendering and OCR separately
            fullText += '\n';
          }
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          fullText += `[Error extracting text from page ${pageNum}]\n`;
        }
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error in extractText method:', error);
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  /**
   * Render a PDF page to a canvas for OCR
   * @param {object} page - The PDF page object
   * @returns {Promise<HTMLCanvasElement>} - The rendered canvas
   */
  async renderPageToCanvas(page) {
    try {
      // Check if page is valid
      if (!page) {
        console.warn('Invalid page object provided to renderPageToCanvas method');
        throw new Error('Invalid PDF page');
      }

      const scale = 2; // Higher scale for better OCR accuracy
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Use willReadFrequently hint for better performance
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Render the page to the canvas
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas;
    } catch (error) {
      console.error('Error in renderPageToCanvas method:', error);
      throw new Error(`Failed to render PDF page to canvas: ${error.message}`);
    }
  }

  /**
   * Render the first page of a PDF to a canvas for confidence calculation
   * @param {Uint8Array} buffer - The PDF buffer
   * @returns {Promise<HTMLCanvasElement>} - The rendered canvas
   */
  async renderPDFToCanvas(buffer) {
    try {
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to renderPDFToCanvas method');
        throw new Error('Invalid PDF buffer');
      }

      // Safely check if it's actually a PDF
      if (!this.isPDF(buffer)) {
        console.warn('Buffer does not appear to be a valid PDF');
        throw new Error('Invalid PDF format');
      }

      await this.loadPDFLibrary();

      // Create a copy of the buffer to avoid detached buffer issues
      const bufferCopy = new Uint8Array(buffer);

      const pdfDoc = await this.pdfjsLib.getDocument({
        data: bufferCopy,
        cMapUrl: this.config.cMapUrl,
        cMapPacked: this.config.cMapPacked
      }).promise;

      const page = await pdfDoc.getPage(1); // Render the first page
      return await this.renderPageToCanvas(page);
    } catch (error) {
      console.error('Error in renderPDFToCanvas method:', error);
      throw new Error(`Failed to render PDF to canvas: ${error.message}`);
    }
  }
}
