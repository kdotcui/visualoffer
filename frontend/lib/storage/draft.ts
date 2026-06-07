import {
  mergeOfferDefaults,
  type OfferDataInput,
  type PartialOfferData,
  type StoredOffer,
} from "@/lib/schemas/offer";

const STORAGE_KEY = "visualoffer:draft";

export type OfferDraft = {
  offer: OfferDataInput;
  uploaded: boolean;
  parser?: StoredOffer["parser"];
  updatedAt: string;
};

function getWindowStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readDraft(): OfferDraft | null {
  const storage = getWindowStorage();
  if (!storage) return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const candidate = parsed as Partial<OfferDraft>;
    return {
      offer: mergeOfferDefaults(candidate.offer as PartialOfferData | undefined),
      uploaded: candidate.uploaded === true,
      parser: candidate.parser,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeDraft(draft: Omit<OfferDraft, "updatedAt">): void {
  const storage = getWindowStorage();
  if (!storage) return;

  const record: OfferDraft = { ...draft, updatedAt: new Date().toISOString() };
  storage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function clearDraft(): void {
  const storage = getWindowStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}
