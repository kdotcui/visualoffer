"use client";

import { useRef, useState } from "react";
import type { RedactionBox } from "@/lib/pipeline/anonymize-pdf";

type Rect = { x: number; y: number; w: number; h: number };

export function PagePreview({
  url,
  index,
  boxes,
  onAdd,
  onRemove,
}: {
  url: string;
  index: number;
  boxes: RedactionBox[];
  onAdd: (box: { page: number } & Rect) => void;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);

  const relative = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    };
  };

  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        ref.current?.setPointerCapture(e.pointerId);
        start.current = relative(e.clientX, e.clientY);
        setDraft({ ...start.current, w: 0, h: 0 });
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        setDraft(rectFrom(start.current, relative(e.clientX, e.clientY)));
      }}
      onPointerUp={(e) => {
        if (start.current) {
          const rect = rectFrom(start.current, relative(e.clientX, e.clientY));
          if (rect.w > 0.008 && rect.h > 0.006) onAdd({ page: index, ...rect });
        }
        start.current = null;
        setDraft(null);
      }}
      className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Page ${index + 1}`} className="block w-full" draggable={false} />

      {boxes.map((b) => (
        <button
          key={b.id}
          type="button"
          title="Click to remove"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(b.id);
          }}
          className="group absolute bg-black"
          style={{
            left: `${b.x * 100}%`,
            top: `${b.y * 100}%`,
            width: `${b.w * 100}%`,
            height: `${b.h * 100}%`,
          }}
        >
          <span className="absolute inset-0 hidden items-center justify-center bg-red-600/70 text-[10px] font-bold text-white group-hover:flex">
            remove
          </span>
        </button>
      ))}

      {draft && (
        <div
          className="absolute border border-[#00c805] bg-[#00c805]/30"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.w * 100}%`,
            height: `${draft.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}
