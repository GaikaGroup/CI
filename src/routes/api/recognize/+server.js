/**
 * Document Recognition API Endpoint
 *
 * This endpoint handles document recognition for uploaded images.
 * It uses a document classifier to determine the type of document
 * and selects the appropriate OCR engine to extract text.
 */
import { json } from '@sveltejs/kit';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '$lib/shared/utils/constants';
import { DocumentProcessor } from '$lib/modules/document/DocumentProcessor';

/**
 * Handle POST requests to the document recognition API
 * @param {Request} request - The request object
 * @returns {Response} - The response object with recognized text
 */
export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file
    if (!file) {
      return json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const fileType = file.type.toLowerCase();
    if (!SUPPORTED_FILE_TYPES.includes(fileType)) {
      return json(
        {
          error: `Unsupported file type. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return json(
        {
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        },
        { status: 400 }
      );
    }

    // Process the document
    const documentProcessor = new DocumentProcessor();
    const result = await documentProcessor.processDocument(file);

    return json({
      text: result.text,
      documentType: result.documentType,
      confidence: result.confidence
    });
  } catch (error) {
    console.error('Error in document recognition API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
