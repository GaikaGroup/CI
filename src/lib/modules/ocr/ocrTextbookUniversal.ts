// ocr-textbook-universal.ts
// Universal OCR pipeline for printed textbook tasks (Russian + English)
// Layout-first segmentation, graphics suppression, multi-pass OCR, normalization

import { createWorker, OEM } from 'tesseract.js';

// ---------- OpenCV loader ----------
export async function loadOpenCV(): Promise<typeof cv> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined')
      return reject(new Error('OpenCV requires browser environment'));
    const w = window as any;
    if (w.cv && w.cv.Mat) return resolve(w.cv);
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.onload = () => {
      const check = () => (w.cv && w.cv.Mat ? resolve(w.cv) : setTimeout(check, 50));
      check();
    };
    script.onerror = () => reject(new Error('Failed to load OpenCV.js'));
    document.head.appendChild(script);
  });
}

// ---------- Tesseract worker ----------
async function createOCRWorker(lang = 'rus+eng') {
  const worker = await createWorker({ logger: () => {} });
  await worker.loadLanguage(lang);
  await worker.initialize(lang, OEM.LSTM_ONLY);
  return worker;
}

// ---------- Helpers: image -> Mat ----------
async function imageToMat(cv: typeof window.cv, src: File | Blob | HTMLImageElement | string) {
  let imgEl: HTMLImageElement;
  if (src instanceof HTMLImageElement) {
    imgEl = src;
  } else {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      imgEl.onload = () => res(true);
      imgEl.onerror = rej;
      imgEl.src = url;
    });
    if (!(src instanceof HTMLImageElement) && typeof src !== 'string') URL.revokeObjectURL(url);
  }
  const canvas = document.createElement('canvas');
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imgEl, 0, 0);
  const mat = cv.imread(canvas);
  return { mat, canvas };
}

// ---------- Config ----------
export type OCRConfig = {
  upscale: number; // 1..3
  adaptiveBlock: number; // odd 15..51
  adaptiveC: number; // 0..15
  minTextHeight: number; // after upscale
  minConf: number; // 0..100
  invert: boolean;
};

export const defaultConfig: OCRConfig = {
  upscale: 2.5,
  adaptiveBlock: 29,
  adaptiveC: 10,
  minTextHeight: 16,
  minConf: 55,
  invert: false
};

// ---------- Stage 1: global deskew ----------
export function globalDeskew(cv: typeof window.cv, src: any) {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  const bin = new cv.Mat();
  cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 31, 10);
  const edges = new cv.Mat();
  cv.Canny(bin, edges, 60, 120);
  const lines = new cv.Mat();
  cv.HoughLines(edges, lines, 1, Math.PI / 180, 120);
  const angles: number[] = [];
  for (let i = 0; i < lines.rows; i++) {
    const theta = lines.data32F[i * 2 + 1];
    const deg = (theta * 180) / Math.PI;
    if (deg >= 30 && deg <= 150) angles.push(deg); // near-horizontal
  }
  let rot = 0;
  if (angles.length) {
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
    rot = mean - 90;
  }
  const center = new cv.Point(src.cols / 2, src.rows / 2);
  const M = cv.getRotationMatrix2D(center, rot, 1);
  const out = new cv.Mat();
  cv.warpAffine(src, out, M, new cv.Size(src.cols, src.rows), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
  gray.delete();
  bin.delete();
  edges.delete();
  lines.delete();
  M.delete();
  return out; // caller must delete
}

// ---------- Stage 2: suppress long graphics ----------
export function suppressGraphics(cv: typeof window.cv, grayOrBin: any) {
  const work = grayOrBin.clone();
  const edges = new cv.Mat();
  cv.Canny(work, edges, 80, 160);
  const lines = new cv.Mat();
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 100, 80, 10);
  const mask = new cv.Mat.zeros(work.rows, work.cols, cv.CV_8UC1);
  for (let i = 0; i < lines.rows; i++) {
    const arr = lines.intPtr(i) as unknown as number[];
    const x1 = arr[0],
      y1 = arr[1],
      x2 = arr[2],
      y2 = arr[3];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len > Math.min(work.cols, work.rows) * 0.15) {
      cv.line(mask, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(255), 5);
    }
  }
  const dst = new cv.Mat();
  cv.inpaint(work, mask, dst, 3, cv.INPAINT_NS);
  work.delete();
  edges.delete();
  lines.delete();
  mask.delete();
  return dst; // caller must delete
}

// ---------- Stage 3: layout segmentation (MSER + merge) ----------
export function segmentTextBlocks(cv: typeof window.cv, srcGray: any) {
  const mser = new cv.MSER();
  const regions = new cv.MatVector();
  const bboxes = new cv.Mat();
  mser.detectRegions(srcGray, regions, bboxes);
  const rects: cv.Rect[] = [];
  for (let i = 0; i < bboxes.rows; i++) {
    const x = bboxes.intAt(i, 0),
      y = bboxes.intAt(i, 1),
      w = bboxes.intAt(i, 2),
      h = bboxes.intAt(i, 3);
    if (w * h < 200 || h < 12) continue;
    rects.push(new cv.Rect(x, y, w, h));
  }
  rects.sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: cv.Rect[] = [];
  for (const r of rects) {
    let joined = false;
    for (let i = 0; i < merged.length; i++) {
      const m = merged[i];
      const rx = Math.max(r.x, m.x),
        ry = Math.max(r.y, m.y);
      const rX = Math.min(r.x + r.width, m.x + m.width),
        rY = Math.min(r.y + r.height, m.y + m.height);
      const inter = Math.max(0, rX - rx) * Math.max(0, rY - ry);
      const union = r.width * r.height + m.width * m.height - inter;
      const sameLine = Math.abs(r.y + r.height / 2 - (m.y + m.height / 2)) < 16;
      if (inter / union > 0.2 || sameLine) {
        const x = Math.min(r.x, m.x);
        const y = Math.min(r.y, m.y);
        const X = Math.max(r.x + r.width, m.x + m.width);
        const Y = Math.max(r.y + r.height, m.y + m.height);
        merged[i] = new cv.Rect(x, y, X - x, Y - y);
        joined = true;
        break;
      }
    }
    if (!joined) merged.push(r);
  }
  regions.delete();
  bboxes.delete();
  mser.delete();
  return merged;
}

// ---------- Stage 4: preprocessing per block ----------
export function preprocessBlock(cv: typeof window.cv, src: any, cfg: OCRConfig) {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  const up = new cv.Mat();
  cv.resize(gray, up, new cv.Size(0, 0), cfg.upscale, cfg.upscale, cv.INTER_CUBIC);
  const den = new cv.Mat();
  cv.bilateralFilter(up, den, 7, 50, 50);
  const bin = aThreshold(cv, den, cfg);
  gray.delete();
  up.delete();
  den.delete();
  return bin;
}

function aThreshold(cv: typeof window.cv, m: any, cfg: OCRConfig) {
  const bin = new cv.Mat();
  cv.adaptiveThreshold(
    m,
    bin,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cfg.invert ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY,
    Math.max(3, cfg.adaptiveBlock | 1),
    cfg.adaptiveC
  );
  return bin;
}

// ---------- Stage 5: multipass OCR ----------
async function multipassOCR(worker: any, canvas: HTMLCanvasElement) {
  const passes = [
    { psm: '7', whitelist: '0123456789°%смкм/чАA.-', lang: 'rus+eng' },
    { psm: '6', whitelist: '', lang: 'rus+eng' },
    { psm: '6', whitelist: '', lang: 'eng' }
  ];
  let best = { text: '', conf: -1, data: null as any };
  for (const pass of passes) {
    await worker.setParameters({
      tessedit_pageseg_mode: pass.psm,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
      ...(pass.whitelist ? { tessedit_char_whitelist: pass.whitelist } : {})
    });
    const { data } = await worker.recognize(canvas);
    const conf =
      Array.isArray(data.symbols) && data.symbols.length
        ? data.symbols.reduce((a: number, s: any) => a + (s.confidence || 0), 0) /
          data.symbols.length
        : (data.confidence ?? 0);
    const text = (data.text || '').replace(/[\r\n]+/g, ' ').trim();
    if (text && conf > best.conf) best = { text, conf, data };
  }
  return best;
}

// ---------- Preview overlay ----------
export function drawROIsOnCanvas(
  srcCanvas: HTMLCanvasElement,
  items: Array<{ bbox: any; label: string; conf: number }>
) {
  const canvas = document.createElement('canvas');
  canvas.width = srcCanvas.width;
  canvas.height = srcCanvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.lineWidth = 2;
  ctx.font = '14px ui-sans-serif';
  ctx.textBaseline = 'top';
  for (const it of items) {
    const { x, y, width, height } = it.bbox as any;
    ctx.strokeStyle = '#22c55e';
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = 'rgba(34,197,94,0.15)';
    ctx.fillRect(x, y, width, 18);
    ctx.fillStyle = '#111827';
    ctx.fillText(`${it.label} ${Math.round(it.conf)}%`, x + 4, y + 2);
  }
  return canvas;
}

// ---------- Main: end-to-end universal OCR ----------
export async function ocrTextbookUniversal(
  src: File | Blob | HTMLImageElement | string,
  cfg: OCRConfig = defaultConfig
) {
  const cv = await loadOpenCV();
  const worker = await createOCRWorker('rus+eng');
  try {
    const { mat, canvas } = await imageToMat(cv, src);

    // Deskew entire page
    const deskewed = globalDeskew(cv, mat);

    // Clean graphics and get gray for segmentation
    const gray = new cv.Mat();
    cv.cvtColor(deskewed, gray, cv.COLOR_RGBA2GRAY);
    const cleaned = suppressGraphics(cv, gray);

    // Segment into text blocks
    const blocks = segmentTextBlocks(cv, cleaned);

    const results: Array<{ bbox: cv.Rect; text: string; conf: number }> = [];

    for (const rect of blocks) {
      const sub = deskewed.roi(rect);
      const bin = preprocessBlock(cv, sub, cfg);

      // to canvas for OCR
      const roiCanvas = document.createElement('canvas');
      roiCanvas.width = bin.cols;
      roiCanvas.height = bin.rows;
      cv.imshow(roiCanvas, bin);

      const best = await multipassOCR(worker, roiCanvas);
      if (best.text && best.conf >= cfg.minConf) {
        results.push({ bbox: rect, text: best.text, conf: best.conf });
      }

      sub.delete();
      bin.delete();
    }

    const preview = drawROIsOnCanvas(
      canvas,
      results.map((r) => ({ bbox: r.bbox as any, label: 'text', conf: r.conf }))
    );

    mat.delete();
    deskewed.delete();
    gray.delete();
    cleaned.delete();
    return { results, preview };
  } finally {
    await worker.terminate();
  }
}

// ---------- Normalization utilities ----------
export function normalizeTextbookStrings(items: Array<{ text: string }>) {
  for (const it of items) {
    let t = it.text;
    // space before units
    t = t.replace(/\s+(°C)/g, ' $1');
    t = t.replace(/(\d),(\d)/g, '$1.$2'); // decimal comma -> dot
    t = t.replace(/\s+(см|км\/ч|А)\b/g, ' $1');
    it.text = t.trim();
  }
  return items;
}
