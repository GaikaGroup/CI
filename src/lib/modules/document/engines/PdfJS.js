/**
 * PDF.js Document Processor
 *
 * Features:
 * 1. PDF document loading and parsing
 * 2. Text extraction from PDF documents
 * 3. Support for password-protected PDFs
 * 4. Page rendering to canvas
 */
import { browser } from '$app/environment';

// We'll use dynamic import for pdf.js to avoid SSR issues
let pdfjsLib;

export class PdfJS {
  /**
   * Constructor to initialize the PDF processor
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/cmaps/',
      cMapPacked: true,
      ...config
    };
  }

  /**
   * Initialize the PDF.js library
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!browser) {
      console.info('Skipping PDF.js initialization during SSR');
      return;
    }

    if (!pdfjsLib) {
      try {
        console.log('Importing PDF.js module...');
        pdfjsLib = await import('pdfjs-dist');

        // Configure worker with CDN URL
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs';

        console.log('PDF.js module imported successfully');
      } catch (importError) {
        console.error('Error importing PDF.js:', importError);
        throw new Error(`Failed to import PDF.js: ${importError.message}`);
      }
    }
  }

  /**
   * Load a PDF document from a buffer
   * @param {Uint8Array} buffer - The PDF file buffer
   * @param {string} password - Optional password for protected PDFs
   * @returns {Promise<Object>} - The loaded PDF document
   */
  async loadDocument(buffer, password = '') {
    await this.initialize();

    if (!browser) {
      console.info('Skipping PDF loading during SSR');
      return null;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        password,
        cMapUrl: this.config.cMapUrl,
        cMapPacked: this.config.cMapPacked
      });

      return await loadingTask.promise;
    } catch (error) {
      if (error.name === 'PasswordException') {
        throw new Error('This PDF is password protected. Please provide a password.');
      } else {
        console.error('Error loading PDF:', error);
        throw new Error(`Failed to load PDF: ${error.message}`);
      }
    }
  }

  /**
   * Extract text from a PDF document
   * @param {Uint8Array} buffer - The PDF file buffer
   * @param {string} password - Optional password for protected PDFs
   * @returns {Promise<string>} - The extracted text
   */
  async extractText(buffer, password = '') {
    if (!browser) {
      console.info('Skipping PDF text extraction during SSR');
      return 'PDF text extraction will be performed in the browser.';
    }

    console.log('Starting PDF text extraction with buffer size:', buffer.length);

    try {
      const pdfDocument = await this.loadDocument(buffer, password);
      if (!pdfDocument) return '';

      const numPages = pdfDocument.numPages;
      console.log(`PDF loaded with ${numPages} pages`);

      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item) => item.str);
        const pageText = textItems.join(' ');

        fullText += pageText + '\n\n';
      }

      const processedText = this.postProcessText(fullText);
      console.log('Extracted text length:', processedText.length);

      return processedText || 'No text could be extracted from the PDF';
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Render a PDF page to a canvas
   * @param {Uint8Array} buffer - The PDF file buffer
   * @param {number} pageNumber - The page number to render (1-based)
   * @param {number} scale - The scale to render at (default: 1.5)
   * @returns {Promise<HTMLCanvasElement>} - The rendered canvas
   */
  async renderPage(buffer, pageNumber = 1, scale = 1.5) {
    if (!browser) {
      console.info('Skipping PDF rendering during SSR');
      return null;
    }

    try {
      const pdfDocument = await this.loadDocument(buffer);
      if (!pdfDocument) return null;

      if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
        throw new Error(
          `Invalid page number: ${pageNumber}. Document has ${pdfDocument.numPages} pages.`
        );
      }

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      return canvas;
    } catch (error) {
      console.error('Error rendering PDF page:', error);
      throw new Error(`Failed to render page: ${error.message}`);
    }
  }

  /**
   * Clean up the extracted text by normalizing whitespace
   * @param {string} text - The raw extracted text
   * @returns {string} - The cleaned text
   */
  postProcessText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/(\w)-\s+(\w)/g, '$1$2') // Fix hyphenated words
      .trim();
  }

  /**
   * Get metadata from a PDF document
   * @param {Uint8Array} buffer - The PDF file buffer
   * @returns {Promise<Object>} - The document metadata
   */
  async getMetadata(buffer) {
    if (!browser) {
      console.info('Skipping PDF metadata extraction during SSR');
      return {};
    }

    try {
      const pdfDocument = await this.loadDocument(buffer);
      if (!pdfDocument) return {};

      const metadata = await pdfDocument.getMetadata();
      return {
        title: metadata.info?.Title || '',
        author: metadata.info?.Author || '',
        subject: metadata.info?.Subject || '',
        keywords: metadata.info?.Keywords || '',
        creator: metadata.info?.Creator || '',
        producer: metadata.info?.Producer || '',
        creationDate: metadata.info?.CreationDate || '',
        modificationDate: metadata.info?.ModDate || '',
        pageCount: pdfDocument.numPages
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      return {};
    }
  }
}
