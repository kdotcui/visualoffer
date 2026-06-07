"use client";

import { useState } from "react";
import type { DetectOptions } from "@/lib/pipeline/anonymize-pdf";

const CATEGORIES: { key: keyof DetectOptions; label: string }[] = [
  { key: "ssn", label: "SSN" },
  { key: "date", label: "Dates / DOB" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

export function Controls({
  values,
  onValuesChange,
  detect,
  onDetectChange,
  onDownload,
  onReset,
  boxCount,
  processing,
}: {
  values: string[];
  onValuesChange: (values: string[]) => void;
  detect: DetectOptions;
  onDetectChange: (detect: DetectOptions) => void;
  onDownload: () => void;
  onReset: () => void;
  boxCount: number;
  processing: boolean;
}) {
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onValuesChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#121212]">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-black dark:text-zinc-50">
          Redact specific text
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Add your name or any exact value to black out wherever it appears.
        </p>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addValue();
              }
            }}
            placeholder="e.g. Jane Doe"
            className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-[#00c805] dark:border-zinc-700 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={addValue}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
          >
            Add
          </button>
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {values.map((v) => (
              <span
                key={v}
                className="flex items-center gap-1.5 rounded-full bg-[#00c805]/10 px-3 py-1 text-xs font-medium text-[#167057] dark:text-[#00c805]"
              >
                {v}
                <button
                  type="button"
                  aria-label={`Remove ${v}`}
                  onClick={() => onValuesChange(values.filter((x) => x !== v))}
                  className="text-[#167057]/60 hover:text-[#167057] dark:text-[#00c805]/60 dark:hover:text-[#00c805]"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          Auto-detect
        </span>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const on = detect[cat.key];
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onDetectChange({ ...detect, [cat.key]: !on })}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                  on
                    ? "border-[#00c805] bg-[#00c805]/10 text-black dark:text-zinc-50"
                    : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                }`}
              >
                {cat.label}
                <span
                  className={`h-3.5 w-3.5 rounded-full border ${
                    on ? "border-[#00c805] bg-[#00c805]" : "border-zinc-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {boxCount} region{boxCount === 1 ? "" : "s"} marked for redaction. Drag on a page to add a box; click a box to remove it.
        </p>
        <button
          type="button"
          onClick={onDownload}
          disabled={processing}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#00c805] px-5 text-base font-semibold text-black transition-colors hover:bg-[#00b305] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? "Anonymizing…" : "Download anonymized PDF"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Start over with a different file
        </button>
      </div>
    </div>
  );
}
