/**
 * Universal Diagram Generator Module
 *
 * Automatically generates diagrams from text descriptions
 *
 * @example
 * import { DiagramService } from '$lib/modules/diagrams';
 *
 * const result = await DiagramService.generateFromText(
 *   'В треугольнике ABC угол A = 50°, угол B = 70°'
 * );
 *
 * if (result.success) {
 *   console.log(result.svg); // SVG markup
 *   console.log(result.dataURL); // data:image/svg+xml;base64,...
 *   console.log(result.type); // 'triangle'
 * }
 */

export { DiagramService } from './DiagramService.js';
export { TextAnalyzer } from './analyzer/TextAnalyzer.js';
export { DiagramRenderer } from './renderer/DiagramRenderer.js';
