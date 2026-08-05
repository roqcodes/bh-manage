"use client";

import { useRef, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Trash2,
  UploadCloud,
  Loader2,
  Plus,
  ImageOff,
  Check,
} from "lucide-react";

import type { ProductVariant, VariantImage } from "@/common/admin/types";
import {
  addVariantImagesAction,
  deleteVariantImageAction,
  setPreviewImageAction,
} from "@/modules/products/actions/variant-images.actions";
import {
  ACCEPTED_IMAGE_MIME,
  CLOUDINARY_CONFIGURED,
  uploadImageToCloudinary,
  validateImageFile,
} from "@/modules/products/lib/cloudinary-upload";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import { FormError, SecondaryBtn } from "@/modules/admin/components/modal";

const BRAND = "#2563EB";

function Thumb({
  image,
  busy,
  onSetPreview,
  onDelete,
  compact = false,
}: {
  image: VariantImage;
  busy: boolean;
  onSetPreview: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`group relative shrink-0 overflow-hidden border bg-slate-50 transition ${
        compact ? "w-[68px] rounded-md" : "w-full rounded-xl"
      } ${
        image.is_preview
          ? "border-[color:var(--brand)] ring-2 ring-[color:var(--brand)]/25"
          : "border-slate-200"
      }`}
      style={{ ["--brand" as string]: BRAND }}
    >
      <div className={`relative aspect-square w-full ${compact ? "h-[68px]" : ""}`}>
        {broken ? (
          <div className="flex size-full items-center justify-center text-slate-300">
            <ImageOff className={compact ? "size-4" : "size-7"} aria-hidden />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        )}

        {image.is_preview ? (
          <span
            className={`absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-[color:var(--brand)] font-bold uppercase tracking-wide text-white shadow-sm ${
              compact ? "px-1 py-px text-[7px]" : "left-2 top-2 gap-1 px-2 py-0.5 text-[10px]"
            }`}
          >
            <Star className={`fill-current ${compact ? "size-2" : "size-3"}`} aria-hidden />
            {!compact ? "Preview" : null}
          </span>
        ) : null}
      </div>

      <div
        className={`flex items-center border-t border-slate-100 bg-white ${
          compact ? "gap-0.5 p-0.5" : "gap-1.5 p-2"
        }`}
      >
        {image.is_preview ? (
          compact ? (
            <span className="flex flex-1 justify-center text-[color:var(--brand)]">
              <Check className="size-2.5" aria-hidden />
            </span>
          ) : (
            <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[color:var(--brand)]/8 px-2 py-1.5 text-[11px] font-bold text-[color:var(--brand)]">
              <Check className="size-3.5" aria-hidden />
              Preview
            </span>
          )
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onSetPreview}
            title="Set preview"
            className={`inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 ${
              compact ? "p-0.5" : "gap-1 px-2 py-1.5 text-[11px]"
            }`}
          >
            <Star className={compact ? "size-2.5" : "size-3.5"} aria-hidden />
            {!compact ? "Set preview" : null}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          title="Delete image"
          className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50 ${
            compact ? "size-5" : "size-8"
          }`}
        >
          <Trash2 className={compact ? "size-2.5" : "size-3.5"} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function VariantImagesManager({
  productId,
  variant,
  onClose,
  embedded = false,
  compact = false,
}: {
  productId: string;
  variant: ProductVariant;
  onClose: () => void;
  /** When true, hides the footer Done button (for inline use inside manage modal). */
  embedded?: boolean;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [upload, setUpload] = useState<{ total: number; done: number } | null>(
    null,
  );
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const images = variant.images ?? [];
  const busy = isPending || upload !== null;
  const hasImages = images.length > 0;

  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  }

  function runAction(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
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
    const urls: string[] = [];
    try {
      for (const file of files) {
        const url = await uploadImageToCloudinary(file);
        urls.push(url);
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
    runAction(() => addVariantImagesAction(productId, variant.id, urls));
  }

  function handleAddUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    setUrlDraft("");
    runAction(() => addVariantImagesAction(productId, variant.id, [url]));
  }

  const dropZone = CLOUDINARY_CONFIGURED ? (
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
      className={`group flex items-center justify-center rounded-lg border border-dashed text-center transition ${
        compact
          ? "min-h-[72px] w-full flex-1 flex-col gap-1 px-2"
          : "w-full flex-col gap-1.5 rounded-xl px-4 py-5"
      } ${
        dragActive
          ? "border-[color:var(--brand)] bg-[color:var(--brand)]/[0.04]"
          : "border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50"
      } disabled:cursor-not-allowed`}
    >
      {upload ? (
        <>
          <Loader2
            className={`animate-spin text-[color:var(--brand)] ${compact ? "size-4" : "size-5"}`}
            aria-hidden
          />
          <p className={`font-bold text-slate-600 ${compact ? "text-[10px]" : "text-[12px]"}`}>
            Uploading {upload.done}/{upload.total}…
          </p>
        </>
      ) : (
        <>
          <span
            className={`flex items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition group-hover:text-[color:var(--brand)] ${
              compact ? "size-7" : "size-9"
            }`}
          >
            <UploadCloud className={compact ? "size-3.5" : "size-5"} aria-hidden />
          </span>
          <p className={`font-bold text-slate-700 ${compact ? "text-[10px] leading-tight" : "text-[12.5px]"}`}>
            {compact ? (
              <>
                Drop or <span className="text-[color:var(--brand)]">browse</span>
              </>
            ) : (
              <>
                Drag &amp; drop or{" "}
                <span className="text-[color:var(--brand)]">browse</span> — multiple allowed
              </>
            )}
          </p>
          {!compact ? (
            <p className="text-[11px] font-medium text-slate-400">
              PNG, JPG, WEBP or GIF · up to 5&nbsp;MB each
            </p>
          ) : null}
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
  ) : null;

  const urlRow = (
    <div className={`flex shrink-0 items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <input
        className={`w-full rounded-lg border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50 ${
          compact ? "h-8 px-2.5 text-[12px]" : "h-11 rounded-xl px-3 text-sm"
        }`}
        value={urlDraft}
        onChange={(e) => setUrlDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAddUrl();
          }
        }}
        placeholder="Paste URL"
        autoComplete="off"
        inputMode="url"
        disabled={busy}
      />
      <button
        type="button"
        onClick={handleAddUrl}
        disabled={busy || !urlDraft.trim()}
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 ${
          compact ? "h-8 px-2 text-[11px]" : "h-11 rounded-xl px-4 text-[13px] gap-1.5"
        }`}
      >
        <Plus className={compact ? "size-3" : "size-4"} aria-hidden />
        Add
      </button>
    </div>
  );

  return (
    <div
      className={compact ? "flex flex-col gap-2" : "space-y-4"}
      style={{ ["--brand" as string]: BRAND }}
    >
      {!compact ? (
        <p className="text-[12.5px] font-medium leading-snug text-slate-500">
          Manage images for{" "}
          <span className="font-bold text-slate-800">
            {variant.name ?? "this variant"}
          </span>
          . The image marked{" "}
          <span className="font-bold text-[color:var(--brand)]">Preview</span> is
          shown first.
        </p>
      ) : null}

      {compact ? (
        <div className="flex min-h-[92px] items-stretch gap-2">
          <div className="flex min-w-0 flex-[1.2] flex-wrap content-start gap-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-white p-1.5">
            {hasImages ? (
              images.map((img) => (
                <Thumb
                  key={img.id}
                  image={img}
                  busy={busy}
                  compact
                  onSetPreview={() =>
                    runAction(() =>
                      setPreviewImageAction(productId, variant.id, img.id),
                    )
                  }
                  onDelete={() =>
                    runAction(() => deleteVariantImageAction(productId, img.id))
                  }
                />
              ))
            ) : (
              <p className="flex min-h-[76px] w-full items-center justify-center text-[10px] font-medium text-slate-400">
                No images yet
              </p>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {dropZone}
            {urlRow}
          </div>
        </div>
      ) : (
        <>
          {hasImages ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((img) => (
                <Thumb
                  key={img.id}
                  image={img}
                  busy={busy}
                  onSetPreview={() =>
                    runAction(() =>
                      setPreviewImageAction(productId, variant.id, img.id),
                    )
                  }
                  onDelete={() =>
                    runAction(() => deleteVariantImageAction(productId, img.id))
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
              <ImageOff className="size-8 text-slate-300" aria-hidden />
              <p className="text-[12.5px] font-semibold text-slate-500">
                No images yet — add some below.
              </p>
            </div>
          )}
          {dropZone}
          {urlRow}
        </>
      )}

      <FormError message={error} />

      {!embedded ? (
        <div className="flex justify-end pt-1">
          <SecondaryBtn onClick={onClose}>Done</SecondaryBtn>
        </div>
      ) : null}
    </div>
  );
}
