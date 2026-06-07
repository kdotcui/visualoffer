/**
 * anonymize-pdf
 *
 * Self-contained, framework-agnostic PDF anonymizer. Runs entirely in the
 * browser: it renders pages with pdf.js, detects sensitive regions, and
 * rebuilds the PDF from rasterized page images with black rectangles burned
 * in. Because the output is image-only, redacted text is wiped completely and
 * is not selectable/copy-pastable.
 *
 * Plug-and-play: import what you need.
 *   - High level:  `anonymizePdf(file, { values, detect })` -> { blob }
 *   - Granular:    `loadDocument`, `renderPageToCanvas`, `extractBoxes`,
 *                  `rasterizeAndRedact` for interactive use (preview + edit).
 *
 * Coordinates: every RedactionBox is normalized (0..1, top-left origin) so it
 * is independent of the render scale used for preview vs. final output.
 */
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from "pdfjs-dist/types/src/display/api";
import { PDFDocument } from "pdf-lib";

// Load the pdf.js worker as a bundled asset so this module is fully
// self-contained: no file in /public and no global config required. The
// worker is part of this route's build output and runs entirely locally.
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" },
  );
}

export type PiiKind = "ssn" | "date" | "email" | "phone" | "value" | "manual";

/** A region to redact, in normalized page coordinates (0..1, top-left origin). */
export interface RedactionBox {
  id: string;
  /** 0-based page index. */
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PiiKind;
}

export interface DetectOptions {
  ssn: boolean;
  date: boolean;
  email: boolean;
  phone: boolean;
}

export interface AnonymizeOptions {
  /** Exact strings to find and redact (e.g. a name). Case-insensitive. */
  values?: string[];
  /** Which structured PII categories to auto-detect. Defaults to all on. */
  detect?: Partial<DetectOptions>;
  /** Render scale for the final rasterized output. Higher = sharper, bigger. */
  scale?: number;
}

export interface AnonymizeResult {
  blob: Blob;
  pageCount: number;
  boxCount: number;
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

const DEFAULT_DETECT: DetectOptions = { ssn: true, date: true, email: true, phone: true };
const PREVIEW_SCALE = 1.5;
const OUTPUT_SCALE = 2;

// --- detectors ---------------------------------------------------------------

const SSN_RE = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const DATE_RE =
  /\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})\b/gi;

// --- internal geometry -------------------------------------------------------

/** A text run with geometry in unscaled page pixels (scale = 1, top-left origin). */
interface GItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/** Sub-rectangle of an item covering characters [start, end). */
function charRect(it: GItem, start: number, end: number) {
  const n = it.str.length || 1;
  const x = it.x + (start / n) * it.w;
  const w = ((end - start) / n) * it.w;
  return { x, y: it.y, w, h: it.h };
}

function toNormBox(
  page: number,
  rect: { x: number; y: number; w: number; h: number },
  vw: number,
  vh: number,
  kind: PiiKind,
): RedactionBox {
  // Pad slightly so descenders / antialiased edges are fully covered.
  const padY = rect.h * 0.18;
  const padX = rect.h * 0.12;
  const x = Math.max(0, rect.x - padX);
  const y = Math.max(0, rect.y - padY);
  let w = rect.w + 2 * padX;
  let h = rect.h + 2 * padY;
  if (x + w > vw) w = vw - x;
  if (y + h > vh) h = vh - y;
  return { id: uid(), page, kind, x: x / vw, y: y / vh, w: w / vw, h: h / vh };
}

function regexBoxes(
  page: number,
  items: GItem[],
  detect: DetectOptions,
  vw: number,
  vh: number,
): RedactionBox[] {
  const detectors: { on: boolean; re: RegExp; kind: PiiKind }[] = [
    { on: detect.ssn, re: SSN_RE, kind: "ssn" },
    { on: detect.email, re: EMAIL_RE, kind: "email" },
    { on: detect.phone, re: PHONE_RE, kind: "phone" },
    { on: detect.date, re: DATE_RE, kind: "date" },
  ];
  const out: RedactionBox[] = [];
  for (const it of items) {
    for (const d of detectors) {
      if (!d.on) continue;
      d.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = d.re.exec(it.str)) !== null) {
        if (m[0].length === 0) {
          d.re.lastIndex++;
          continue;
        }
        out.push(toNormBox(page, charRect(it, m.index, m.index + m[0].length), vw, vh, d.kind));
      }
    }
  }
  return out;
}

/**
 * Find user-supplied values, grouping items into lines so a value split across
 * adjacent text runs (e.g. "John" + "Smith") is still matched.
 */
function valueBoxes(
  page: number,
  items: GItem[],
  values: string[],
  vw: number,
  vh: number,
): RedactionBox[] {
  const needles = values.map((v) => v.replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean);
  if (needles.length === 0) return [];

  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: GItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= Math.max(it.h, last[0].h) * 0.6) {
      last.push(it);
    } else {
      lines.push([it]);
    }
  }

  const out: RedactionBox[] = [];
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);

    // Build a normalized line string with a map back to (item, char).
    let norm = "";
    const map: { item: number; ch: number }[] = [];
    line.forEach((it, idx) => {
      for (let c = 0; c < it.str.length; c++) {
        const isWs = /\s/.test(it.str[c]);
        if (isWs) {
          if (norm.length === 0 || norm.endsWith(" ")) continue;
          norm += " ";
          map.push({ item: idx, ch: c });
        } else {
          norm += it.str[c];
          map.push({ item: idx, ch: c });
        }
      }
      if (norm.length > 0 && !norm.endsWith(" ")) {
        norm += " ";
        map.push({ item: idx, ch: -1 });
      }
    });

    const hay = norm.toLowerCase();
    for (const needle of needles) {
      let from = 0;
      let pos: number;
      while ((pos = hay.indexOf(needle, from)) !== -1) {
        const end = pos + needle.length;
        const perItem = new Map<number, { min: number; max: number }>();
        for (let k = pos; k < end; k++) {
          const mp = map[k];
          if (!mp || mp.ch < 0) continue;
          const it = line[mp.item];
          if (/\s/.test(it.str[mp.ch] ?? " ")) continue;
          const cur = perItem.get(mp.item);
          if (!cur) perItem.set(mp.item, { min: mp.ch, max: mp.ch });
          else {
            cur.min = Math.min(cur.min, mp.ch);
            cur.max = Math.max(cur.max, mp.ch);
          }
        }
        for (const [itemIdx, range] of perItem) {
          out.push(toNormBox(page, charRect(line[itemIdx], range.min, range.max + 1), vw, vh, "value"));
        }
        from = end;
      }
    }
  }
  return out;
}

// --- public API --------------------------------------------------------------

async function toUint8(input: File | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input.slice();
  if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0));
  return new Uint8Array(await input.arrayBuffer());
}

/**
 * Load a PDF document. The input bytes are copied internally, so the caller's
 * buffer is not detached and can be reused for repeated loads.
 */
export async function loadDocument(input: File | ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const data = await toUint8(input);
  return pdfjs.getDocument({ data }).promise;
}

/** Render a page to an off-screen canvas at the given scale. */
export async function renderPageToCanvas(page: PDFPageProxy, scale: number): Promise<RenderedPage> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return { canvas, width: canvas.width, height: canvas.height };
}

/** Detect sensitive regions on a single page. Returns normalized boxes. */
export async function extractBoxes(
  page: PDFPageProxy,
  pageIndex: number,
  options: AnonymizeOptions,
): Promise<RedactionBox[]> {
  const viewport = page.getViewport({ scale: 1 });
  const vw = viewport.width;
  const vh = viewport.height;
  const content = await page.getTextContent();

  const items: GItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || !("transform" in raw)) continue;
    const ti = raw as TextItem;
    if (!ti.str || !ti.str.trim()) continue;
    const tx = pdfjs.Util.transform(viewport.transform, ti.transform);
    const h = Math.hypot(tx[2], tx[3]) || ti.height || 0;
    items.push({ str: ti.str, x: tx[4], y: tx[5] - h, w: ti.width || 0, h });
  }

  const detect: DetectOptions = { ...DEFAULT_DETECT, ...(options.detect ?? {}) };
  return [
    ...regexBoxes(pageIndex, items, detect, vw, vh),
    ...valueBoxes(pageIndex, items, options.values ?? [], vw, vh),
  ];
}

/**
 * Rasterize every page, burn black rectangles over the given boxes, and
 * rebuild a new image-only PDF. The returned PDF has no recoverable text in
 * redacted (or any) regions.
 */
export async function rasterizeAndRedact(
  input: File | ArrayBuffer | Uint8Array,
  boxes: RedactionBox[],
  scale: number = OUTPUT_SCALE,
): Promise<Blob> {
  const doc = await loadDocument(input);
  const out = await PDFDocument.create();

  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const { canvas } = await renderPageToCanvas(page, scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");

    ctx.fillStyle = "#000000";
    for (const b of boxes) {
      if (b.page !== i) continue;
      ctx.fillRect(b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height);
    }

    const png = await out.embedPng(canvas.toDataURL("image/png"));
    const size = page.getViewport({ scale: 1 });
    const outPage = out.addPage([size.width, size.height]);
    outPage.drawImage(png, { x: 0, y: 0, width: size.width, height: size.height });
  }

  const bytes = await out.save();
  // Copy into a fresh ArrayBuffer so the Blob is backed by a plain ArrayBuffer.
  return new Blob([bytes.slice()], { type: "application/pdf" });
}

/**
 * One-shot anonymization: PDF in, redacted PDF out. Auto-detects structured
 * PII and redacts any supplied `values`, then rasterizes the result.
 */
export async function anonymizePdf(
  input: File | ArrayBuffer | Uint8Array,
  options: AnonymizeOptions = {},
): Promise<AnonymizeResult> {
  const bytes = await toUint8(input);
  const doc = await loadDocument(bytes);

  const boxes: RedactionBox[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    boxes.push(...(await extractBoxes(page, i, options)));
  }

  const blob = await rasterizeAndRedact(bytes, boxes, options.scale ?? OUTPUT_SCALE);
  return { blob, pageCount: doc.numPages, boxCount: boxes.length };
}

export { PREVIEW_SCALE, OUTPUT_SCALE, DEFAULT_DETECT };
