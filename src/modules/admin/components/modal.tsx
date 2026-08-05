"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "landscape";
  /** When true, body uses flex column with no default padding (for custom layouts). */
  bareBody?: boolean;
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = "md",
  bareBody = false,
}: ModalProps) {
  const widthCls =
    size === "landscape"
      ? "max-w-[min(94vw,1280px)]"
      : size === "xl"
        ? "max-w-4xl"
        : size === "lg"
          ? "max-w-2xl"
          : size === "sm"
            ? "max-w-sm"
            : "max-w-md";

  const bodyCls = bareBody
    ? "flex min-h-0 flex-1 flex-col overflow-hidden"
    : "max-h-[min(85vh,720px)] overflow-y-auto overscroll-contain p-6";

  const shellCls =
    size === "landscape"
      ? "flex max-h-[min(90vh,840px)] min-h-[min(80vh,640px)] flex-col overflow-hidden"
      : "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 300,
          duration: 0.2,
        }}
        className={`relative w-full ${widthCls} ${shellCls} rounded-[28px] bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-base font-extrabold text-slate-900">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
        <div className={bodyCls}>{children}</div>
      </motion.div>
    </div>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50 bg-white";

export const selectCls = `${inputCls} cursor-pointer`;

export const textareaCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50 resize-none";

export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

export function PrimaryBtn({
  children,
  disabled,
  type = "button",
  onClick,
  form,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  form?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      form={form}
      className="flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DangerBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 items-center justify-center rounded-xl bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
