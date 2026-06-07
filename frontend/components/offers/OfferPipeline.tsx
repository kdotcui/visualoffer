"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  DEFAULT_OFFER_VALUES,
  mergeOfferDefaults,
  type OfferData,
  type OfferDataInput,
  type PartialOfferData,
  type StoredOffer,
} from "@/lib/schemas/offer";
import { useOffers } from "@/hooks/useOffers";
import { clearDraft, readDraft, writeDraft } from "@/lib/storage/draft";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OfferForm } from "@/components/offers/OfferForm";
import { OfferUpload } from "@/components/offers/OfferUpload";

function currency(value: number | undefined) {
  if (value === undefined) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function OfferCard({ offer, onDelete }: { offer: StoredOffer; onDelete: () => void }) {
  const equity = offer.offer.equityCompensation;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{offer.offer.companyName}</CardTitle>
          <CardDescription>
            {offer.offer.jobTitle}
            {offer.offer.level ? ` · ${offer.offer.level}` : ""} · {offer.offer.location.city},{" "}
            {offer.offer.location.state}
          </CardDescription>
        </div>
        <Badge>{offer.source === "ai" ? "AI parsed" : "Manual"}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Base</p>
          <p className="text-xl font-bold">{currency(offer.offer.cashCompensation.baseSalary)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bonus</p>
          <p className="text-xl font-bold">
            {offer.offer.cashCompensation.targetAnnualBonusPercentage ?? 0}%
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Equity</p>
          <p className="text-xl font-bold">{currency(equity?.totalGrantValue)}</p>
        </div>
        <div className="md:col-span-3">
          <Button type="button" variant="ghost" className="h-9 px-3 text-red-600" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OfferPipeline() {
  const { offers, hydrated, createOffer, removeOffer } = useOffers();
  const [formSeed, setFormSeed] = useState<OfferDataInput>(DEFAULT_OFFER_VALUES);
  const [uploaded, setUploaded] = useState(false);
  const [parser, setParser] = useState<StoredOffer["parser"] | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);

  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const draft = readDraft();
      if (draft) {
        setFormSeed(draft.offer);
        setUploaded(draft.uploaded);
        setParser(draft.parser);
      }
      readyRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistDraft = (values: PartialOfferData) => {
    if (!readyRef.current) return;
    writeDraft({ offer: values as OfferDataInput, uploaded, parser });
  };

  const save = (offer: OfferData) => {
    const source = uploaded ? "ai" : "manual";
    const record = createOffer({ offer, source, parser });
    clearDraft();
    setUploaded(false);
    setParser(undefined);
    setFormSeed(DEFAULT_OFFER_VALUES);
    setStatus(`Saved ${record.offer.companyName}.`);
  };

  return (
    <div className="grid gap-10">
      <section className="grid gap-5">
        <div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-black md:text-6xl">
            Turn compensation offers into comparable data.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            Upload a PDF for AI extraction or fill in the details manually. Your progress is saved in
            this browser as you go.
          </p>
        </div>

        <OfferUpload
          onParsed={(result) => {
            console.log("Parsed PDF response before populating form:", result);
            const nextParser = {
              model: result.model,
              warnings: result.warnings,
              missingFields: result.missingFields,
            };
            const nextOffer = mergeOfferDefaults(result.data as PartialOfferData);
            setFormSeed(nextOffer);
            setUploaded(true);
            setParser(nextParser);
            writeDraft({ offer: nextOffer, uploaded: true, parser: nextParser });
            setStatus("PDF parsed. Review the extracted fields before saving.");
          }}
        />

        <OfferForm
          initialData={formSeed}
          parserMissingFields={parser?.missingFields ?? []}
          submitLabel="Save offer"
          onChange={persistDraft}
          onSubmit={save}
        />
      </section>

      {status && (
        <div className="rounded-2xl border border-[#00c805]/30 bg-[#00c805]/10 px-4 py-3 text-sm font-medium text-[#167057]">
          {status}
        </div>
      )}

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Saved offers</h2>
            <p className="text-sm text-zinc-500">
              Stored locally in this browser for now.
            </p>
          </div>
          <Badge>{hydrated ? `${offers.length} saved` : "Loading"}</Badge>
        </div>

        {hydrated && offers.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No offers yet</CardTitle>
              <CardDescription>Add one manually or parse a PDF to start building your comparison set.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onDelete={() => removeOffer(offer.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}
