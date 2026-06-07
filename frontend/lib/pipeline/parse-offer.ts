import { generateText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  PartialOfferDataSchema,
  getMissingFields,
  type OfferFieldPath,
  type PartialOfferData,
} from "@/lib/schemas/offer";
import {
  OFFER_PARSER_SYSTEM_PROMPT,
  OFFER_PARSER_USER_PROMPT,
} from "@/lib/pipeline/LLM_PARSER_PROMPT";

export type ParseOfferResult = {
  data: PartialOfferData;
  missingFields: OfferFieldPath[];
  warnings: string[];
  model: string;
};

export async function parseOfferPdf({
  pdfDataUrl,
  fileName,
}: {
  pdfDataUrl: string;
  fileName: string;
}): Promise<ParseOfferResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const modelId = "google/gemini-3.1-flash-lite";
  const openrouter = createOpenRouter({
    apiKey,
    appName: "visualoffer",
  });

  const model = openrouter.chat(modelId, {
    plugins: [
      { id: "file-parser", pdf: { engine: "native" } },
      { id: "response-healing" },
    ],
    structuredOutputs: { strict: false },
  });

  const result = await generateText({
    model,
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
            text: OFFER_PARSER_USER_PROMPT,
          },
          {
            type: "file",
            data: pdfDataUrl,
            mediaType: "application/pdf",
            filename: fileName,
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
    model: modelId,
  };
}
