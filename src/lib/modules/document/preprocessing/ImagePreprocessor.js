import { IImagePreprocessor } from '../interfaces/IImagePreprocessor';

export class ImagePreprocessor extends IImagePreprocessor {
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
  async preprocess(buffer) {
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
      console.error('Error in preprocess:', error);
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
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
}
