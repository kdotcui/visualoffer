"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { OfferFieldPath, PartialOfferData } from "@/lib/schemas/offer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

type ParseResponse = {
  data: PartialOfferData;
  missingFields: OfferFieldPath[];
  warnings: string[];
  model: string;
};

type OfferUploadProps = {
  onParsed: (result: ParseResponse) => void;
};

export function OfferUpload({ onParsed }: OfferUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parseFile = async (file: File) => {
    setError(null);
    setFileName(file.name);

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported for now.");
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError("PDF must be 10MB or smaller.");
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/offers/parse", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not parse that PDF.");
      }

      onParsed(payload as ParseResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse that PDF.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) void parseFile(file);
        }}
        disabled={isParsing}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-left transition-colors hover:border-[#00c805] hover:bg-[#00c805]/5 disabled:cursor-not-allowed"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00c805]/10 text-[#00c805]">
          {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-black">
            {isParsing ? "Parsing PDF..." : fileName ?? "Upload PDF for AI extraction"}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            or fill in the details manually below
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void parseFile(file);
          event.target.value = "";
        }}
      />

      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-700">
          <AlertTitle>Parse failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
