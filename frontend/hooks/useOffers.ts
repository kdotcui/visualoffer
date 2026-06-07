"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createStoredOffer,
  deleteOffer,
  listOffers,
  saveOffer,
} from "@/lib/storage/offers";
import type { OfferData, OfferSource, StoredOffer } from "@/lib/schemas/offer";

export function useOffers() {
  const [offers, setOffers] = useState<StoredOffer[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setOffers(listOffers());
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      refresh();
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const createOffer = useCallback(
    ({
      offer,
      source,
      parser,
    }: {
      offer: OfferData;
      source: OfferSource;
      parser?: StoredOffer["parser"];
    }) => {
      const record = createStoredOffer({ offer, source, parser });
      saveOffer(record);
      refresh();
      return record;
    },
    [refresh],
  );

  const removeOffer = useCallback(
    (id: string) => {
      deleteOffer(id);
      refresh();
    },
    [refresh],
  );

  return {
    offers,
    hydrated,
    createOffer,
    removeOffer,
  };
}
