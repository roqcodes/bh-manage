"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Trash2, UploadCloud, Loader2, Plus, ImageOff } from "lucide-react";

import {
  ACCEPTED_IMAGE_MIME,
  CLOUDINARY_CONFIGURED,
  uploadImageToCloudinary,
  validateImageFile,
} from "@/modules/products/lib/cloudinary-upload";

const BRAND = "#2563EB";

function LocalThumb({
  url,
  isPreview,
  busy,
  onSetPreview,
  onRemove,
}: {
  url: string;
  isPreview: boolean;
  busy: boolean;
  onSetPreview: () => void;
  onRemove: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-slate-50 transition ${
        isPreview
          ? "border-[color:var(--brand)] ring-2 ring-[color:var(--brand)]/25"
          : "border-slate-200"
      }`}
      style={{ ["--brand" as string]: BRAND }}
    >
      <div className="relative aspect-square w-full">
        {broken ? (
          <div className="flex size-full items-center justify-center text-slate-300">
            <ImageOff className="size-6" aria-hidden />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        )}
        {isPreview ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[color:var(--brand)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Star className="size-2.5 fill-current" aria-hidden />
            Preview
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1 border-t border-slate-100 bg-white p-1.5">
        {isPreview ? (
          <span className="flex-1 text-center text-[10px] font-bold text-[color:var(--brand)]">
            Preview
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onSetPreview}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
          >
            <Star className="size-3" aria-hidden />
            Preview
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          title="Remove image"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50"
        >
          <Trash2 className="size-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function VariantImagesField({
  images,
  previewIndex,
  onChange,
  onUploadingChange,
}: {
  images: string[];
  previewIndex: number;
  onChange: (images: string[], previewIndex: number) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [upload, setUpload] = useState<{ total: number; done: number } | null>(
    null,
  );
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUploadingChange?.(upload !== null);
  }, [upload, onUploadingChange]);

  function addUrls(urls: string[]) {
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    if (clean.length === 0) return;
    onChange([...images, ...clean], images.length === 0 ? 0 : previewIndex);
  }

  function removeAt(index: number) {
    const next = images.filter((_, i) => i !== index);
    let nextPreview = previewIndex;
    if (index === previewIndex) nextPreview = 0;
    else if (index < previewIndex) nextPreview = previewIndex - 1;
    onChange(next, Math.min(nextPreview, Math.max(0, next.length - 1)));
  }

  async function handleFiles(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setError(null);

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setUpload({ total: files.length, done: 0 });
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const url = await uploadImageToCloudinary(file);
        uploaded.push(url);
        setUpload((s) => (s ? { ...s, done: s.done + 1 } : s));
      }
    } catch (e) {
      setUpload(null);
      if (inputRef.current) inputRef.current.value = "";
      setError(e instanceof Error ? e.message : "Upload failed.");
      return;
    }
    setUpload(null);
    if (inputRef.current) inputRef.current.value = "";
    addUrls(uploaded);
  }

  function handleAddUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    setUrlDraft("");
    addUrls([url]);
  }

  const busy = upload !== null;

  return (
    <div className="flex flex-col gap-2" style={{ ["--brand" as string]: BRAND }}>
      <span className="text-[13px] font-bold text-slate-700">
        Images{" "}
        <span className="font-medium text-slate-400">· optional</span>
      </span>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <LocalThumb
              key={`${url}-${i}`}
              url={url}
              isPreview={i === previewIndex}
              busy={busy}
              onSetPreview={() => onChange(images, i)}
              onRemove={() => removeAt(i)}
            />
          ))}
        </div>
      ) : null}

      {CLOUDINARY_CONFIGURED ? (
        <button
          type="button"
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (!busy) void handleFiles(e.dataTransfer.files);
          }}
          disabled={busy}
          className={`group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-4 text-center transition ${
            dragActive
              ? "border-[color:var(--brand)] bg-[color:var(--brand)]/[0.04]"
              : "border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50"
          } disabled:cursor-not-allowed`}
        >
          {upload ? (
            <>
              <Loader2
                className="size-5 animate-spin text-[color:var(--brand)]"
                aria-hidden
              />
              <p className="text-[12px] font-bold text-slate-600">
                Uploading {upload.done}/{upload.total}…
              </p>
            </>
          ) : (
            <>
              <span className="flex size-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition group-hover:text-[color:var(--brand)]">
                <UploadCloud className="size-4" aria-hidden />
              </span>
              <p className="text-[12px] font-bold text-slate-700">
                Drag &amp; drop or{" "}
                <span className="text-[color:var(--brand)]">browse</span> —
                multiple allowed
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_MIME}
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </button>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddUrl();
            }
          }}
          placeholder="…or paste an image URL"
          autoComplete="off"
          inputMode="url"
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={busy || !urlDraft.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="size-3.5" aria-hidden />
          Add
        </button>
      </div>

      {error ? (
        <p className="text-[11.5px] font-semibold text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
