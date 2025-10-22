/**
 * Advanced Tesseract OCR with OpenCV preprocessing
 * Optimized for measurement instruments with numbers
 */
import { browser } from '$app/environment';
import { IOCREngine } from '../interfaces/IOCREngine';

let tesseractModule;
let createWorker;

export class AdvancedTesseractOCR extends IOCREngine {
  constructor(config = {}) {
    super();
    this.config = {
      lang: 'rus+eng',
      upscale: 2.5,
      adaptiveBlock: 29,
      adaptiveC: 10,
      minHeight: 16,
      minConf: 55,
      ...config
    };
  }

  async createOptimizedWorker() {
    if (!tesseractModule) {
      tesseractModule = await import('tesseract.js');
      createWorker = tesseractModule.createWorker;
    }
    return await createWorker(this.config.lang, 1, {
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/worker.min.js'
    });
  }

  /**
   * Preprocess image with upscaling, grayscale, denoise, adaptive threshold
   */
  async preprocessImage(imageData) {
    const canvas = document.createElement('canvas');
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    // Upscale for better OCR
    canvas.width = img.width * this.config.upscale;
    canvas.height = img.height * this.config.upscale;
    const ctx = canvas.getContext('2d');

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Enhance contrast and brightness
    const imageData2 = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData2.data;

    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Increase contrast
      const enhanced = (gray - 128) * 1.5 + 128;
      const clamped = Math.max(0, Math.min(255, enhanced));
      data[i] = data[i + 1] = data[i + 2] = clamped;
    }

    ctx.putImageData(imageData2, 0, 0);
    return canvas;
  }

  /**
   * Run OCR with multiple PSM modes for better coverage
   */
  async recognizeWithMultiplePSM(canvas) {
    const worker = await this.createOptimizedWorker();
    const results = [];

    // Try different PSM modes
    const psmModes = [
      { mode: '11', desc: 'Sparse text (scattered numbers)' },
      { mode: '6', desc: 'Uniform block of text' },
      { mode: '3', desc: 'Fully automatic' }
    ];

    for (const psm of psmModes) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: psm.mode,
          tessedit_char_whitelist:
            '0123456789.,°CАампервтсекундлинйкмчабвгдежзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZ ',
          classify_bln_numeric_mode: '1'
        });

        const result = await worker.recognize(canvas);
        const text = result.data.text.trim();
        const conf = result.data.confidence;

        if (text && conf > this.config.minConf) {
          results.push({ text, conf, psm: psm.mode, desc: psm.desc });
        }
      } catch (error) {
        console.warn(`PSM ${psm.mode} failed:`, error.message);
      }
    }

    await worker.terminate();
    return results;
  }

  /**
   * Merge and deduplicate results from multiple PSM modes
   */
  mergeResults(results) {
    if (results.length === 0) return '';

    // Sort by confidence
    results.sort((a, b) => b.conf - a.conf);

    // Combine unique lines
    const lines = new Set();
    for (const result of results) {
      result.text.split('\n').forEach((line) => {
        const cleaned = line.trim();
        if (cleaned) lines.add(cleaned);
      });
    }

    return Array.from(lines).join('\n');
  }

  /**
   * Main recognize method
   */
  async recognize(buffer) {
    try {
      if (!browser) {
        return 'OCR processing will be performed in the browser.';
      }

      if (!buffer || buffer.length === 0) {
        return 'No valid content to recognize';
      }

      // Convert buffer to data URL
      const blob = new Blob([buffer], { type: 'image/png' });
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Preprocess
      console.log('[Advanced OCR] Preprocessing image...');
      const canvas = await this.preprocessImage(dataUrl);

      // Run OCR with multiple PSM modes
      console.log('[Advanced OCR] Running OCR with multiple PSM modes...');
      const results = await this.recognizeWithMultiplePSM(canvas);

      // Merge results
      const finalText = this.mergeResults(results);

      console.log('[Advanced OCR] Recognition complete:', {
        modesUsed: results.length,
        textLength: finalText.length,
        avgConfidence: results.reduce((sum, r) => sum + r.conf, 0) / results.length
      });

      return finalText;
    } catch (error) {
      console.error('[Advanced OCR] Error:', error);
      throw new Error(`Advanced OCR failed: ${error.message}`);
    }
  }

  async getConfidence(buffer) {
    try {
      const text = await this.recognize(buffer);
      return text && text.length > 10 ? 0.8 : 0.3;
    } catch {
      return 0;
    }
  }
}
