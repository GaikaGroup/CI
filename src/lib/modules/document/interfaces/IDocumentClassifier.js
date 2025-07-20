export class IDocumentClassifier {
  /**
   * Classify a document
   * @param {Uint8Array} buffer - The document buffer to classify
   * @returns {Promise<Object>} - The classification result with document type and confidence
   */
  async classify(buffer) { 
    throw new Error('Not implemented'); 
  }
}