"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { DetectOptions, RedactionBox } from "@/lib/pipeline/anonymize-pdf";
import { Dropzone } from "./components/Dropzone";
import { Controls } from "./components/Controls";
import { PagePreview } from "./components/PagePreview";

type PageImage = { index: number; url: string };
type Status = "idle" | "loading" | "ready" | "processing" | "error";

const loadModule = () => import("@/lib/pipeline/anonymize-pdf");

export default function AnonymizePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [detect, setDetect] = useState<DetectOptions>({
    ssn: true,
    date: true,
    email: true,
    phone: true,
  });

  const bytesRef = useRef<ArrayBuffer | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const detectRunRef = useRef(0);

  const reset = () => {
    setStatus("idle");
    setError(null);
    setFileName(null);
    setPages([]);
    setBoxes([]);
    setValues([]);
    bytesRef.current = null;
    docRef.current = null;
  };

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    setFileName(file.name);
    setBoxes([]);
    try {
      const buffer = await file.arrayBuffer();
      bytesRef.current = buffer;
      const mod = await loadModule();
      const doc = await mod.loadDocument(buffer);
      docRef.current = doc;

      const images: PageImage[] = [];
      for (let i = 0; i < doc.numPages; i++) {
        const page = await doc.getPage(i + 1);
        const { canvas } = await mod.renderPageToCanvas(page, mod.PREVIEW_SCALE);
        images.push({ index: i, url: canvas.toDataURL("image/png") });
      }
      setPages(images);
      setStatus("ready");
      void runDetection(values, detect);
    } catch (err) {
      console.error(err);
      setError("Could not read that PDF. It may be encrypted or corrupted.");
      setStatus("error");
    }
  };

  // Re-run auto-detection, preserving manually drawn boxes. A run token guards
  // against overlapping runs from rapid toggles clobbering newer results.
  const runDetection = async (nextValues: string[], nextDetect: DetectOptions) => {
    const doc = docRef.current;
    if (!doc) return;
    const runId = ++detectRunRef.current;
    const mod = await loadModule();
    const found: RedactionBox[] = [];
    for (let i = 0; i < doc.numPages; i++) {
      const page = await doc.getPage(i + 1);
      found.push(...(await mod.extractBoxes(page, i, { values: nextValues, detect: nextDetect })));
    }
    if (runId !== detectRunRef.current) return;
    setBoxes((prev) => [...prev.filter((b) => b.kind === "manual"), ...found]);
  };

  const handleValuesChange = (next: string[]) => {
    setValues(next);
    void runDetection(next, detect);
  };

  const handleDetectChange = (next: DetectOptions) => {
    setDetect(next);
    void runDetection(values, next);
  };

  const addBox = (box: { page: number; x: number; y: number; w: number; h: number }) => {
    setBoxes((prev) => [
      ...prev,
      { ...box, id: crypto.randomUUID(), kind: "manual" as const },
    ]);
  };

  const removeBox = (id: string) => setBoxes((prev) => prev.filter((b) => b.id !== id));

  const handleDownload = async () => {
    if (!bytesRef.current) return;
    setStatus("processing");
    try {
      const mod = await loadModule();
      const blob = await mod.rasterizeAndRedact(bytesRef.current, boxes, mod.OUTPUT_SCALE);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-anonymized.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while anonymizing. Please try again.");
    } finally {
      setStatus("ready");
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12 font-sans">
      <div className="w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-2">
          <Link
            href="/"
            className="w-fit text-sm text-zinc-500 hover:text-black"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Anonymize your offer letter
          </h1>
          <p className="max-w-2xl text-zinc-600">
            Drop in a PDF and we&apos;ll black out sensitive details — name, date of birth, SSN,
            and more. Redacted text is permanently flattened into an image, so it can never be
            selected, copied, or recovered. Everything happens locally in your browser.
          </p>
        </header>

        {status === "idle" && <Dropzone onFile={handleFile} />}

        {status === "error" && (
          <div className="flex flex-col items-start gap-4">
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-[#00c805] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#00b305]"
            >
              Try again
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[#00c805]" />
            <p className="text-sm text-zinc-500">Rendering {fileName}…</p>
          </div>
        )}

        {(status === "ready" || status === "processing") && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-4">
              {pages.map((p) => (
                <PagePreview
                  key={p.index}
                  url={p.url}
                  index={p.index}
                  boxes={boxes.filter((b) => b.page === p.index)}
                  onAdd={addBox}
                  onRemove={removeBox}
                />
              ))}
            </div>
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <Controls
                values={values}
                onValuesChange={handleValuesChange}
                detect={detect}
                onDetectChange={handleDetectChange}
                onDownload={handleDownload}
                onReset={reset}
                boxCount={boxes.length}
                processing={status === "processing"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
