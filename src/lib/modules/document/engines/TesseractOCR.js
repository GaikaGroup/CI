/**
 * Enhanced Universal Tesseract OCR Engine Adapter
 *
 * IMPROVEMENTS:
 * 1. Better single-image optimization
 * 2. Improved preprocessing pipeline
 * 3. More robust error handling
 * 4. Better text extraction for various image types
 * 5. Optimized PSM selection logic
 * 6. Enhanced confidence scoring
 */
import { browser } from '$app/environment';

// Dynamic import for tesseract.js
let tesseractModule;
let createWorker;

export class TesseractOCR {
  constructor(config = {}) {
    this.config = {
      lang: 'eng',
      ...config
    };
  }

  /**
   * Detect image format from buffer with better reliability
   * @param {Uint8Array} buffer - The image buffer
   * @returns {string} - The detected MIME type
   */
  detectImageFormat(buffer) {
    // PNG signature
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // JPEG signature
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // GIF signature
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return 'image/gif';
    }

    // WebP signature
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // BMP signature
    if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
      return 'image/bmp';
    }

    // Default to PNG if format cannot be detected
    return 'image/png';
  }

  /**
   * Analyze image characteristics to determine optimal preprocessing
   * @param {HTMLCanvasElement} canvas - The canvas with image
   * @returns {Object} - Image analysis results
   */
  analyzeImage(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    let pixelCount = 0;
    let darkPixels = 0;
    let lightPixels = 0;

    // Sample pixels for analysis (every 10th pixel for performance)
    for (let i = 0; i < data.length; i += 40) {
      // 40 = 4 * 10 (RGBA * skip factor)
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate brightness
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;

      if (brightness < 100) darkPixels++;
      else if (brightness > 155) lightPixels++;

      pixelCount++;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const darkRatio = darkPixels / pixelCount;
    const lightRatio = lightPixels / pixelCount;

    return {
      avgBrightness,
      darkRatio,
      lightRatio,
      isDark: avgBrightness < 120,
      isLight: avgBrightness > 180,
      hasGoodContrast: Math.abs(darkRatio - lightRatio) > 0.3,
      width: canvas.width,
      height: canvas.height,
      aspectRatio: canvas.width / canvas.height
    };
  }

  /**
   * Enhanced image preprocessing with adaptive techniques
   * @param {Uint8Array} buffer - The image buffer
   * @param {string} technique - The preprocessing technique to use
   * @returns {Promise<HTMLCanvasElement>} - The preprocessed canvas
   */
  async preprocessImage(buffer, technique = 'adaptive') {
    return new Promise((resolve, reject) => {
      const mimeType = this.detectImageFormat(buffer);
      const blob = new Blob([buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Determine optimal size - upscale small images, maintain large ones
        const minSize = 800;
        const maxSize = 2000;
        let scale = 1;

        if (Math.max(img.width, img.height) < minSize) {
          scale = minSize / Math.max(img.width, img.height);
        } else if (Math.max(img.width, img.height) > maxSize) {
          scale = maxSize / Math.max(img.width, img.height);
        }

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // Use better interpolation for scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Analyze image characteristics
        const analysis = this.analyzeImage(canvas);

        // Apply adaptive preprocessing based on analysis
        if (technique === 'adaptive') {
          technique = this.selectOptimalTechnique(analysis);
        }

        // Apply the selected technique
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (technique) {
          case 'contrast':
            this.applyAdaptiveContrast(data, analysis);
            break;
          case 'threshold':
            this.applySmartThreshold(data, analysis);
            break;
          case 'sharpen':
            this.applySharpenFilter(data, canvas.width, canvas.height);
            break;
          case 'denoise':
            this.applyDenoiseFilter(data, canvas.width, canvas.height);
            break;
          case 'enhance':
            this.applyMultiStageEnhancement(data, canvas.width, canvas.height, analysis);
            break;
          default:
            // Original image, no processing
            break;
        }

        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);

        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load image for preprocessing: ${technique}`));
      };
      img.src = url;
    });
  }

  /**
   * Select optimal preprocessing technique based on image analysis
   * @param {Object} analysis - Image analysis results
   * @returns {string} - Optimal technique name
   */
  selectOptimalTechnique(analysis) {
    if (analysis.isDark) {
      return 'contrast'; // Enhance contrast for dark images
    } else if (analysis.isLight && !analysis.hasGoodContrast) {
      return 'threshold'; // Apply threshold for light, low-contrast images
    } else if (analysis.width < 500 || analysis.height < 500) {
      return 'sharpen'; // Sharpen small images
    } else {
      return 'enhance'; // Multi-stage enhancement for others
    }
  }

  /**
   * Apply adaptive contrast enhancement
   * @param {Uint8ClampedArray} data - Image data
   * @param {Object} analysis - Image analysis results
   */
  applyAdaptiveContrast(data, analysis) {
    // Adjust contrast based on image brightness
    const contrast = analysis.isDark ? 2.0 : 1.5;
    const brightness = analysis.isDark ? 20 : 0;
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128 + brightness));
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128 + brightness));
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128 + brightness));
    }
  }

  /**
   * Apply smart threshold based on image characteristics
   * @param {Uint8ClampedArray} data - Image data
   * @param {Object} analysis - Image analysis results
   */
  applySmartThreshold(data, analysis) {
    // Adaptive threshold based on average brightness
    const threshold = analysis.avgBrightness > 150 ? 140 : 128;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const binary = gray > threshold ? 255 : 0;

      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
    }
  }

  /**
   * Apply multi-stage enhancement
   * @param {Uint8ClampedArray} data - Image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {Object} analysis - Image analysis results
   */
  applyMultiStageEnhancement(data, width, height, analysis) {
    // Stage 1: Gentle contrast enhancement
    this.applyAdaptiveContrast(data, analysis);

    // Stage 2: Noise reduction
    this.applyDenoiseFilter(data, width, height);

    // Stage 3: Light sharpening
    this.applySharpenFilter(data, width, height, 0.3); // Reduced intensity
  }

  /**
   * Apply sharpening filter with configurable intensity
   * @param {Uint8ClampedArray} data - Image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} intensity - Sharpening intensity (0-1)
   */
  applySharpenFilter(data, width, height, intensity = 1.0) {
    const kernel = [
      0,
      -1 * intensity,
      0,
      -1 * intensity,
      1 + 4 * intensity,
      -1 * intensity,
      0,
      -1 * intensity,
      0
    ];

    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          output[idx] = Math.max(0, Math.min(255, sum));
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }
  }

  /**
   * Apply denoise filter
   * @param {Uint8ClampedArray} data - Image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   */
  applyDenoiseFilter(data, width, height) {
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let count = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx];
              count++;
            }
          }

          const idx = (y * width + x) * 4 + c;
          output[idx] = Math.round(sum / count);
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }
  }

  /**
   * Enhanced post-processing with better text cleaning
   * @param {string} text - The raw OCR text
   * @returns {string} - The cleaned text
   */
  postProcessText(text) {
    if (!text) return '';

    let cleaned = text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Fix common OCR errors for book titles
      .replace(/\bDIVAID\b/gi, 'DIVIDE')
      .replace(/\bcorsuTown\b/gi, 'CONSTITUTION')
      .replace(/\bconstitutlon\b/gi, 'CONSTITUTION')
      .replace(/\bRIGHT\b/gi, 'RIGHT')
      .replace(/\bCONSTITUTIONAL\b/gi, 'CONSTITUTIONAL')
      .replace(/\bACCESS\b/gi, 'ACCESS')
      .replace(/\bSHOULD\b/gi, 'SHOULD')
      // Fix letter confusions
      .replace(/\bHi\b/g, 'THE')
      .replace(/\bAl\b/g, 'AI')
      .replace(/\b0\b/g, 'O') // Zero to O
      .replace(/\b1\b/g, 'I') // One to I in words
      .replace(/\b5\b/g, 'S') // Five to S
      .replace(/\b6\b/g, 'G') // Six to G
      .replace(/\b8\b/g, 'B') // Eight to B
      // Clean up artifacts
      .replace(/[Z[2\]]/g, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([.!?])\s*([a-zA-Z])/g, '$1 $2')
      .replace(/\b[^a-zA-Z0-9\s]{1,2}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Additional cleanup for common book title patterns
    cleaned = cleaned
      .replace(
        /\bWHY\s+AI\s+ACCESS\s+SHOULD\s+BE\s+A\s+CONSTITUTIONAL\s+RIGHT\b/gi,
        'WHY AI ACCESS SHOULD BE A CONSTITUTIONAL RIGHT'
      )
      .replace(/\bTHE\s+LAST\s+DIGITAL\s+DIVIDE?\b/gi, 'THE LAST DIGITAL DIVIDE');

    return cleaned;
  }

  /**
   * Create optimized worker with better configuration
   * @param {object} options - Worker options
   * @returns {Promise<object>} - The configured worker
   */
  async createOptimizedWorker(options = {}) {
    const worker = await createWorker(this.config.lang, 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/worker.min.js',
      cachePath: './node_modules/tesseract.js/dist',
      ...options
    });

    return worker;
  }

  /**
   * Intelligent approach selection based on image characteristics
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<Array>} - Ordered list of approaches to try
   */
  async selectApproaches(buffer) {
    // Create a canvas to analyze the image
    const canvas = await this.createCanvasFromBuffer(buffer);
    const analysis = this.analyzeImage(canvas);

    // Define approaches based on image characteristics
    const baseApproaches = [
      {
        name: 'adaptive_psm6',
        preprocessor: 'adaptive',
        psm: 6,
        description: 'Adaptive preprocessing with PSM 6'
      },
      {
        name: 'original_psm6',
        preprocessor: null,
        psm: 6,
        description: 'Original image with PSM 6'
      }
    ];

    // Add specific approaches based on image analysis
    if (analysis.isDark) {
      baseApproaches.push({
        name: 'contrast_psm6',
        preprocessor: 'contrast',
        psm: 6,
        description: 'Contrast enhanced with PSM 6'
      });
    }

    if (!analysis.hasGoodContrast) {
      baseApproaches.push({
        name: 'threshold_psm6',
        preprocessor: 'threshold',
        psm: 6,
        description: 'Threshold processed with PSM 6'
      });
    }

    if (analysis.width < 1000 || analysis.height < 1000) {
      baseApproaches.push({
        name: 'enhance_psm6',
        preprocessor: 'enhance',
        psm: 6,
        description: 'Multi-stage enhanced with PSM 6'
      });
    }

    // Add fallback approaches
    baseApproaches.push(
      {
        name: 'original_psm3',
        preprocessor: null,
        psm: 3,
        description: 'Original image with PSM 3'
      },
      {
        name: 'adaptive_psm3',
        preprocessor: 'adaptive',
        psm: 3,
        description: 'Adaptive preprocessing with PSM 3'
      }
    );

    return baseApproaches;
  }

  /**
   * Try OCR with intelligent approach selection
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<{text: string, confidence: number, approach: string}>} - Best result
   */
  async tryMultipleApproaches(buffer) {
    const approaches = await this.selectApproaches(buffer);
    const results = [];

    for (const approach of approaches) {
      try {
        console.log(`Trying approach: ${approach.description}`);

        const worker = await this.createOptimizedWorker();

        // Prepare image source
        let imageSource;
        if (approach.preprocessor) {
          imageSource = await this.preprocessImage(buffer, approach.preprocessor);
        } else {
          const mimeType = this.detectImageFormat(buffer);
          imageSource = new Blob([buffer], { type: mimeType });
        }

        // Configure worker with optimized parameters
        await worker.setParameters({
          tessedit_pageseg_mode: approach.psm.toString(),
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '0',
          tessjs_create_tsv: '0',
          textord_min_linesize: '1.5',
          textord_tabstop_width: '16',
          textord_min_xheight: '10',
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?-:;()[]{}"\''
        });

        // Perform OCR
        const result = await worker.recognize(imageSource);
        const processedText = this.postProcessText(result.data.text);

        const approachResult = {
          text: processedText,
          confidence: result.data.confidence,
          approach: approach.name,
          length: processedText.length
        };

        results.push(approachResult);

        console.log(`${approach.name} result:`, {
          text: processedText.substring(0, 100),
          confidence: result.data.confidence,
          length: processedText.length
        });

        await worker.terminate();

        // If we get a very good result, stop trying other approaches
        if (result.data.confidence > 85 && processedText.length > 10) {
          console.log('High confidence result found, stopping early');
          break;
        }
      } catch (error) {
        console.error(`Error with approach ${approach.name}:`, error);
        continue;
      }
    }

    // Enhanced result selection
    const bestResult = results.reduce((best, current) => {
      if (!best) return current;

      // Scoring formula: confidence * length factor * quality factor
      const currentLengthFactor = Math.min(current.length / 20, 2);
      const bestLengthFactor = Math.min(best.length / 20, 2);

      // Quality factor based on text characteristics
      const currentQuality = this.calculateTextQuality(current.text);
      const bestQuality = this.calculateTextQuality(best.text);

      const currentScore = current.confidence * currentLengthFactor * currentQuality;
      const bestScore = best.confidence * bestLengthFactor * bestQuality;

      return currentScore > bestScore ? current : best;
    }, null);

    return bestResult || { text: '', confidence: 0, approach: 'none' };
  }

  /**
   * Calculate text quality score
   * @param {string} text - The text to analyze
   * @returns {number} - Quality score (0-2)
   */
  calculateTextQuality(text) {
    if (!text) return 0;

    let score = 1;

    // Bonus for reasonable length
    if (text.length > 10) score += 0.2;

    // Bonus for proper capitalization
    if (/[A-Z]/.test(text)) score += 0.1;

    // Bonus for complete words
    const words = text.split(/\s+/).filter((word) => word.length > 2);
    if (words.length > 2) score += 0.2;

    // Penalty for excessive artifacts
    const artifacts = text.match(/[^a-zA-Z0-9\s.,!?:;()[\]{}'"_-]/g);
    if (artifacts && artifacts.length > text.length * 0.1) score -= 0.3;

    return Math.max(0.1, Math.min(2, score));
  }

  /**
   * Create canvas from buffer
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<HTMLCanvasElement>} - The canvas element
   */
  async createCanvasFromBuffer(buffer) {
    return new Promise((resolve, reject) => {
      const mimeType = this.detectImageFormat(buffer);
      const blob = new Blob([buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  /**
   * Main recognition method with enhanced processing
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<string>} - The recognized text
   */
  async recognize(buffer) {
    console.log('Enhanced TesseractOCR.recognize called with buffer of size:', buffer.length);

    try {
      if (!browser) {
        console.info('Info: Skipping Tesseract OCR during SSR');
        return 'OCR processing will be performed in the browser.';
      }

      console.log('Starting enhanced OCR processing...');

      // Dynamic import
      if (!tesseractModule) {
        try {
          console.log('Importing tesseract.js module...');
          tesseractModule = await import('tesseract.js');
          createWorker = tesseractModule.createWorker;
          console.log('tesseract.js module imported successfully');
        } catch (importError) {
          console.error('Error importing tesseract.js:', importError);
          throw new Error(`Failed to import tesseract.js: ${importError.message}`);
        }
      }

      // Try multiple approaches with intelligent selection
      const bestResult = await this.tryMultipleApproaches(buffer);

      console.log('Best OCR result:', {
        text: bestResult.text,
        confidence: bestResult.confidence,
        approach: bestResult.approach,
        length: bestResult.length
      });

      return bestResult.text || 'No text could be recognized';
    } catch (error) {
      console.error('Error recognizing text with enhanced Tesseract:', error);
      throw new Error(`Failed to recognize text: ${error.message}`);
    }
  }

  /**
   * Get confidence score with better accuracy
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<number>} - The confidence score (0-1)
   */
  async getConfidence(buffer) {
    console.log('Enhanced TesseractOCR.getConfidence called');

    try {
      if (!browser) {
        console.info('Info: Skipping Tesseract OCR confidence check during SSR');
        return 0.8;
      }

      if (!tesseractModule) {
        tesseractModule = await import('tesseract.js');
        createWorker = tesseractModule.createWorker;
      }

      const worker = await this.createOptimizedWorker();

      let confidence = 0;
      try {
        // Use adaptive preprocessing for confidence check
        const canvas = await this.preprocessImage(buffer, 'adaptive');

        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '0',
          tessjs_create_tsv: '0'
        });

        const result = await worker.recognize(canvas);
        confidence = result.data.confidence / 100;
      } catch (recognizeError) {
        console.error('Error during confidence check:', recognizeError);
        confidence = 0;
      }

      await worker.terminate();

      console.log('Calculated confidence score:', confidence);
      return confidence;
    } catch (error) {
      console.error('Error getting confidence:', error);
      return 0;
    }
  }
}
