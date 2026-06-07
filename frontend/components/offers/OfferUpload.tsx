"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { OfferFieldPath, PartialOfferData } from "@/lib/schemas/offer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Upload offer PDF</CardTitle>
            <CardDescription>Send a PDF directly to OpenRouter for structured extraction.</CardDescription>
          </div>
          <Badge>PDF only</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) void parseFile(file);
          }}
          className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-6 text-center transition-colors hover:border-[#00c805] hover:bg-[#00c805]/5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00c805]/10 text-[#00c805]">
            <Upload className="h-6 w-6" />
          </span>
          <span className="text-base font-semibold text-black">
            {fileName ?? "Drag and drop your offer letter"}
          </span>
          <span className="text-sm text-zinc-500">
            Click to browse. The PDF is uploaded only to the server parse route.
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

        {isParsing && (
          <div className="grid gap-3">
            <Progress value={65} />
            <Skeleton className="h-4 w-2/3" />
            <p className="text-sm text-zinc-500">Parsing compensation details with OpenRouter...</p>
          </div>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-700">
            <AlertTitle>Parse failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isParsing}>
          Choose PDF
        </Button>
      </CardContent>
    </Card>
  );
}
