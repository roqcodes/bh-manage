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
}: {
  image: VariantImage;
  busy: boolean;
  onSetPreview: () => void;
  onDelete: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-slate-50 transition ${
        image.is_preview
          ? "border-[color:var(--brand)] ring-2 ring-[color:var(--brand)]/25"
          : "border-slate-200"
      }`}
      style={{ ["--brand" as string]: BRAND }}
    >
      <div className="relative aspect-square w-full">
        {broken ? (
          <div className="flex size-full items-center justify-center text-slate-300">
            <ImageOff className="size-7" aria-hidden />
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
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--brand)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Star className="size-3 fill-current" aria-hidden />
            Preview
          </span>
        ) : null}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1.5 border-t border-slate-100 bg-white p-2">
        {image.is_preview ? (
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[color:var(--brand)]/8 px-2 py-1.5 text-[11px] font-bold text-[color:var(--brand)]">
            <Check className="size-3.5" aria-hidden />
            Preview
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onSetPreview}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
          >
            <Star className="size-3.5" aria-hidden />
            Set preview
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          title="Delete image"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function VariantImagesManager({
  productId,
  variant,
  onClose,
}: {
  productId: string;
  variant: ProductVariant;
  onClose: () => void;
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

  return (
    <div className="space-y-4" style={{ ["--brand" as string]: BRAND }}>
      <p className="text-[12.5px] font-medium leading-snug text-slate-500">
        Manage images for{" "}
        <span className="font-bold text-slate-800">
          {variant.name ?? "this variant"}
        </span>
        . The image marked{" "}
        <span className="font-bold text-[color:var(--brand)]">Preview</span> is
        shown first.
      </p>

      {/* Existing images */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

      {/* Uploader */}
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
          className={`group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition ${
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
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition group-hover:text-[color:var(--brand)]">
                <UploadCloud className="size-5" aria-hidden />
              </span>
              <p className="text-[12.5px] font-bold text-slate-700">
                Drag &amp; drop or{" "}
                <span className="text-[color:var(--brand)]">browse</span> —
                multiple allowed
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                PNG, JPG, WEBP or GIF · up to 5&nbsp;MB each
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

      {/* Paste URL */}
      <div className="flex items-center gap-2">
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50"
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
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          Add
        </button>
      </div>

      <FormError message={error} />

      <div className="flex justify-end pt-1">
        <SecondaryBtn onClick={onClose}>Done</SecondaryBtn>
      </div>
    </div>
  );
}
