/**
 * Enhanced Tesseract OCR Engine with Multi-Language and PDF Support
 *
 * Features:
 * 1. Multi-language support for English, Russian, and Spanish
 * 2. Image preprocessing with resizing and grayscale conversion
 * 3. PDF recognition: extracts text or runs OCR on rendered pages
 * 4. Orientation and sparse text handling using PSM 12 for images
 * 5. Confidence score retrieval for OCR results
 */
import { browser } from '$app/environment';

let tesseractModule;
let createWorker;
let pdfjsLib;

export class TesseractOCR {
  constructor(config = {}) {
    this.config = {
      lang: 'eng+rus+spa', // Support English, Russian, and Spanish
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/cmaps/',
      cMapPacked: true,
      ...config
    };
  }

  /**
   * Safely convert blob to Uint8Array buffer
   * @param {Blob} blob - The blob to convert
   * @returns {Promise<Uint8Array>} - The converted buffer
   */
  async blobToBuffer(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      // Create a new Uint8Array to ensure we have a non-detached buffer
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('Error converting blob to buffer:', error);
      throw error;
    }
  }

  /**
   * Alternative method using FileReader (more compatible)
   * @param {Blob} blob - The blob to convert
   * @returns {Promise<Uint8Array>} - The converted buffer
   */
  async blobToBufferAlternative(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          resolve(uint8Array);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsArrayBuffer(blob);
    });
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
   * Detect image format from buffer based on magic numbers
   * @param {Uint8Array} buffer - The image buffer
   * @returns {string} - The MIME type (e.g., 'image/png', 'image/jpeg')
   */
  detectImageFormat(buffer) {
    try {
      // Check if buffer is valid and has sufficient length
      if (!buffer || buffer.length < 4) {
        return 'image/png'; // Default fallback
      }

      // Check if the underlying ArrayBuffer is detached
      if (buffer.buffer.byteLength === 0) {
        return 'image/png'; // Default fallback
      }

      // PNG signature: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return 'image/png';
      }

      // JPEG signature: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
      }

      return 'image/png'; // Default fallback
    } catch (error) {
      console.warn('Error detecting image format:', error);
      return 'image/png'; // Default fallback
    }
  }

  /**
   * Preprocess image: resize if small and convert to grayscale
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<HTMLCanvasElement>} - The preprocessed canvas
   */
  async preprocessImage(buffer) {
    try {
      // Safely detect image format with error handling
      const mimeType = this.detectImageFormat(buffer);

      // Create a blob and ensure we have a valid buffer
      const blob = new Blob([buffer], { type: mimeType });

      // Use the URL.createObjectURL approach with proper error handling
      const url = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            let canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize small images to improve OCR accuracy
            if (width < 1000 && height < 1000) {
              const scale = Math.max(1000 / width, 1000 / height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to grayscale
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              data[i] = data[i + 1] = data[i + 2] = gray;
            }
            ctx.putImageData(imageData, 0, 0);

            URL.revokeObjectURL(url);
            resolve(canvas);
          } catch (error) {
            URL.revokeObjectURL(url);
            console.error('Error processing image:', error);
            reject(error);
          }
        };
        img.onerror = (error) => {
          URL.revokeObjectURL(url);
          console.error('Failed to load image:', error);
          reject(new Error('Failed to load image'));
        };
        img.src = url;
      });
    } catch (error) {
      console.error('Error in preprocessImage:', error);
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Post-process the recognized text to clean up whitespace
   * @param {string} text - Raw OCR text
   * @returns {string} - Cleaned text
   */
  postProcessText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
  }

  /**
   * Create an optimized Tesseract worker with language support
   * @returns {Promise<object>} - The configured worker
   */
  async createOptimizedWorker() {
    if (!tesseractModule) {
      tesseractModule = await import('tesseract.js');
      createWorker = tesseractModule.createWorker;
    }
    return await createWorker(this.config.lang, 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/worker.min.js'
    });
  }

  /**
   * Run OCR on a canvas and return the result
   * @param {HTMLCanvasElement} canvas - The canvas to process
   * @returns {Promise<{text: string, confidence: number}>} - The recognized text and confidence
   */
  async _ocrCanvas(canvas) {
    const worker = await this.createOptimizedWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: '12' // Sparse text with orientation detection
    });
    const result = await worker.recognize(canvas);
    await worker.terminate();
    return {
      text: this.postProcessText(result.data.text),
      confidence: result.data.confidence / 100 // Normalize confidence to 0-1 range
    };
  }

  /**
   * Recognize text from an image or PDF buffer
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<string>} - The recognized text
   */
  async recognize(buffer) {
    try {
      if (!browser) {
        return 'OCR processing will be performed in the browser.';
      }

      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to recognize method');
        return 'No valid content to recognize';
      }

      // Safely check if it's a PDF
      const isPdf = this.isPDF(buffer);

      if (isPdf) {
        return await this._recognizePDF(buffer);
      } else {
        const canvas = await this.preprocessImage(buffer);
        const { text } = await this._ocrCanvas(canvas);
        return text;
      }
    } catch (error) {
      console.error('Error in recognize method:', error);
      throw new Error(`Text recognition failed: ${error.message}`);
    }
  }

  /**
   * Recognize text from a PDF buffer
   * @param {Uint8Array} buffer - The PDF buffer
   * @returns {Promise<string>} - The extracted text from all pages
   */
  async _recognizePDF(buffer) {
    try {
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to _recognizePDF method');
        return '';
      }

      // Safely check if it's actually a PDF
      if (!this.isPDF(buffer)) {
        console.warn('Buffer does not appear to be a valid PDF');
        return '';
      }

      if (!pdfjsLib) {
        try {
          pdfjsLib = await import('pdfjs-dist');
          // Set the worker source to a CDN URL instead of importing the module
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs';
        } catch (importError) {
          console.error('Error importing PDF.js library:', importError);
          throw new Error(`Failed to load PDF processing library: ${importError.message}`);
        }
      }

      // Create a copy of the buffer to avoid detached buffer issues
      const bufferCopy = new Uint8Array(buffer);

      const pdfDoc = await pdfjsLib.getDocument({
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
            // Render page to canvas and run OCR
            const canvas = await this._renderPageToCanvas(page);
            const { text } = await this._ocrCanvas(canvas);
            fullText += text + '\n';
          }
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          fullText += `[Error extracting text from page ${pageNum}]\n`;
        }
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error in _recognizePDF method:', error);
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  /**
   * Render a PDF page to a canvas for OCR
   * @param {object} page - The PDF page object
   * @returns {Promise<HTMLCanvasElement>} - The rendered canvas
   */
  async _renderPageToCanvas(page) {
    try {
      // Check if page is valid
      if (!page) {
        console.warn('Invalid page object provided to _renderPageToCanvas method');
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
      console.error('Error in _renderPageToCanvas method:', error);
      throw new Error(`Failed to render PDF page to canvas: ${error.message}`);
    }
  }

  /**
   * Render the first page of a PDF to a canvas for confidence calculation
   * @param {Uint8Array} buffer - The PDF buffer
   * @returns {Promise<HTMLCanvasElement>} - The rendered canvas
   */
  async _renderPDFToCanvas(buffer) {
    try {
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to _renderPDFToCanvas method');
        throw new Error('Invalid PDF buffer');
      }

      // Safely check if it's actually a PDF
      if (!this.isPDF(buffer)) {
        console.warn('Buffer does not appear to be a valid PDF');
        throw new Error('Invalid PDF format');
      }

      if (!pdfjsLib) {
        try {
          pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs';
        } catch (importError) {
          console.error('Error importing PDF.js library:', importError);
          throw new Error(`Failed to load PDF processing library: ${importError.message}`);
        }
      }

      // Create a copy of the buffer to avoid detached buffer issues
      const bufferCopy = new Uint8Array(buffer);

      const pdfDoc = await pdfjsLib.getDocument({
        data: bufferCopy,
        cMapUrl: this.config.cMapUrl,
        cMapPacked: this.config.cMapPacked
      }).promise;

      const page = await pdfDoc.getPage(1); // Render the first page
      return await this._renderPageToCanvas(page);
    } catch (error) {
      console.error('Error in _renderPDFToCanvas method:', error);
      throw new Error(`Failed to render PDF to canvas: ${error.message}`);
    }
  }

  /**
   * Get the confidence score of the OCR recognition
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<number>} - The confidence score (0 to 1)
   */
  async getConfidence(buffer) {
    try {
      if (!browser) {
        return 0; // Default confidence during SSR
      }

      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to getConfidence method');
        return 0;
      }

      // Safely check if it's a PDF
      const isPdf = this.isPDF(buffer);

      if (isPdf) {
        try {
          const pdfText = await this._recognizePDF(buffer);
          if (pdfText && pdfText.trim().length > 0) {
            return 1; // High confidence if text is directly extracted
          } else {
            const canvas = await this._renderPDFToCanvas(buffer);
            const { confidence } = await this._ocrCanvas(canvas);
            return confidence;
          }
        } catch (pdfError) {
          console.error('Error getting confidence for PDF:', pdfError);
          return 0;
        }
      } else {
        try {
          const canvas = await this.preprocessImage(buffer);
          const { confidence } = await this._ocrCanvas(canvas);
          return confidence;
        } catch (imgError) {
          console.error('Error getting confidence for image:', imgError);
          return 0;
        }
      }
    } catch (error) {
      console.error('Error in getConfidence method:', error);
      return 0; // Return 0 confidence on error
    }
  }
}
