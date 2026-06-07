"use client";

import { useRef, useState } from "react";

export function Dropzone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-colors ${
        dragging
          ? "border-[#00c805] bg-[#00c805]/5"
          : "border-zinc-300 hover:border-[#00c805] dark:border-zinc-700"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00c805]/10 text-[#00c805]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        Drag &amp; drop your offer letter PDF
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        or click to browse. Files are processed entirely in your browser and never uploaded.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
