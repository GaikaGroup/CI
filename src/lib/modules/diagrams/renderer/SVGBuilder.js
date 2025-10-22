/**
 * SVG Builder
 * Simple utility for building SVG markup
 */

export class SVGBuilder {
  constructor(width = 400, height = 300) {
    this.width = width;
    this.height = height;
    this.elements = [];
  }

  addLine(x1, y1, x2, y2, style = {}) {
    const stroke = style.stroke || '#2563eb';
    const strokeWidth = style.strokeWidth || 2;

    this.elements.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
        `stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />`
    );
    return this;
  }

  addCircle(cx, cy, r, style = {}) {
    const stroke = style.stroke || '#2563eb';
    const strokeWidth = style.strokeWidth || 2;
    const fill = style.fill || 'none';

    this.elements.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" ` +
        `stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`
    );
    return this;
  }

  addPolygon(points, style = {}) {
    const stroke = style.stroke || '#2563eb';
    const strokeWidth = style.strokeWidth || 2;
    const fill = style.fill || 'none';

    const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

    this.elements.push(
      `<polygon points="${pointsStr}" ` +
        `stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" ` +
        `stroke-linejoin="round" />`
    );
    return this;
  }

  addText(x, y, text, style = {}) {
    const fontSize = style.fontSize || 16;
    const fontFamily = style.fontFamily || 'Arial, sans-serif';
    const fontWeight = style.fontWeight || 'normal';
    const fill = style.fill || '#1f2937';

    this.elements.push(
      `<text x="${x}" y="${y}" ` +
        `font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" ` +
        `fill="${fill}" text-anchor="middle" dominant-baseline="middle">${this._escape(text)}</text>`
    );
    return this;
  }

  addAngleArc(cx, cy, radius, startAngle, endAngle, style = {}) {
    const stroke = style.stroke || '#10b981';
    const strokeWidth = style.strokeWidth || 1.5;
    const fill = style.fill || 'rgba(16, 185, 129, 0.15)';

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc points
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    // Large arc flag
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

    // Create path
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${cx} ${cy} Z`;

    this.elements.push(
      `<path d="${path}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`
    );
    return this;
  }

  addPoint(x, y, radius = 3, style = {}) {
    const fill = style.fill || '#2563eb';

    this.elements.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" />`);
    return this;
  }

  build(options = {}) {
    const { title = 'Diagram', description = '' } = options;

    let svg =
      `<svg width="${this.width}" height="${this.height}" ` +
      `viewBox="0 0 ${this.width} ${this.height}" ` +
      `xmlns="http://www.w3.org/2000/svg">`;

    if (title) {
      svg += `<title>${this._escape(title)}</title>`;
    }
    if (description) {
      svg += `<desc>${this._escape(description)}</desc>`;
    }

    svg += this.elements.join('');
    svg += '</svg>';

    return svg;
  }

  _escape(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
