import { NextResponse } from "next/server";
import { parseOfferPdf } from "@/lib/pipeline/parse-offer";
import { PARSER_MODELS } from "@/lib/pipeline/llm-config";

export const runtime = "nodejs";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

function isParserModel(model: FormDataEntryValue | null): model is string {
  return PARSER_MODELS.some(({ id }) => id === model);
}

// TODO: Public deployments should add authentication, rate limits, quotas,
// timeouts, and PDF page/text bounds appropriate to their environment.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const model = formData.get("model");

    if (!isParserModel(model)) {
      return NextResponse.json({ error: "Unsupported parser model." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a PDF file." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are supported." }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json({ error: "PDF must be 10MB or smaller." }, { status: 400 });
    }

    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const result = await parseOfferPdf({
      pdfBytes,
      fileName: file.name || "offer-letter.pdf",
      model,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse the offer PDF.";
    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
