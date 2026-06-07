import { NextResponse } from "next/server";
import { parseOfferPdf } from "@/lib/pipeline/parse-offer";

export const runtime = "nodejs";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

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
    const result = await parseOfferPdf({ pdfBytes, fileName: file.name || "offer-letter.pdf" });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse the offer PDF.";
    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
