import { generateText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  PartialOfferDataSchema,
  getMissingFields,
  type OfferFieldPath,
  type PartialOfferData,
} from "@/lib/schemas/offer";
import {
  OFFER_PARSER_SYSTEM_PROMPT,
  OFFER_PARSER_USER_PROMPT,
} from "@/lib/pipeline/llm-config";

export type ParseOfferResult = {
  data: PartialOfferData;
  missingFields: OfferFieldPath[];
  warnings: string[];
  model: string;
};

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const loadingTask = getDocument({ data: pdfBytes.slice() });
  const doc = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pages.push(pageText);
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages.join("\n\n").trim();
}

export async function parseOfferPdf({
  pdfBytes,
  fileName,
  model,
}: {
  pdfBytes: Uint8Array;
  fileName: string;
  model: string;
}): Promise<ParseOfferResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const openrouter = createOpenRouter({
    apiKey,
    appName: "visualoffer",
  });

  const parserModel = openrouter.chat(model, {
    plugins: [
      { id: "response-healing" },
    ],
    structuredOutputs: { strict: false },
  });

  const offerText = await extractPdfText(pdfBytes);
  if (!offerText) {
    throw new Error("No text could be extracted from the PDF (it may be a scanned/image-only document).");
  }

  const result = await generateText({
    model: parserModel,
    output: Output.object({
      name: "OfferLetterData",
      description: "Structured job offer details extracted from an offer letter PDF.",
      schema: PartialOfferDataSchema,
    }),
    temperature: 0,
    system: OFFER_PARSER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${OFFER_PARSER_USER_PROMPT}\n\nFile name: ${fileName}\n\n--- OFFER LETTER TEXT ---\n${offerText}`,
          },
        ],
      },
    ],
  });

  const data = PartialOfferDataSchema.parse(result.output);
  const missingFields = getMissingFields(data);

  return {
    data,
    missingFields,
    warnings: missingFields.length > 0 ? ["Some required fields were not found in the PDF."] : [],
    model,
  };
}
