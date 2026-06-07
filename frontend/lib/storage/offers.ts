import { StoredOfferSchema, type OfferData, type OfferSource, type StoredOffer } from "@/lib/schemas/offer";

const STORAGE_KEY = "visualoffer:offers";

function getWindowStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readRawOffers(): unknown[] {
  const storage = getWindowStorage();
  if (!storage) return [];

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOffers(offers: StoredOffer[]) {
  const storage = getWindowStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(offers));
}

export function listOffers(): StoredOffer[] {
  return readRawOffers()
    .map((offer) => StoredOfferSchema.safeParse(offer))
    .filter((result): result is { success: true; data: StoredOffer } => result.success)
    .map((result) => result.data)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getOffer(id: string): StoredOffer | undefined {
  return listOffers().find((offer) => offer.id === id);
}

export function saveOffer(record: StoredOffer): StoredOffer {
  const parsed = StoredOfferSchema.parse(record);
  const existing = listOffers().filter((offer) => offer.id !== parsed.id);
  writeOffers([parsed, ...existing]);
  return parsed;
}

export function createStoredOffer({
  offer,
  source,
  parser,
}: {
  offer: OfferData;
  source: OfferSource;
  parser?: StoredOffer["parser"];
}): StoredOffer {
  const now = new Date().toISOString();
  return StoredOfferSchema.parse({
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    source,
    parser,
    offer,
  });
}

export function deleteOffer(id: string) {
  writeOffers(listOffers().filter((offer) => offer.id !== id));
}
