"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  Users,
  Truck,
  Bell,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  LayoutGrid,
  LogOut,
  ChevronRight,
  Settings2,
  Percent,
} from "lucide-react";

import { SignOutForm } from "@/modules/auth/components/sign-out-form";
import { useAdminSession } from "@/modules/admin/providers/admin-session-provider";

const BRAND = "#2563EB";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const HERO_TINT =
  "linear-gradient(135deg, rgba(209, 20, 57, 0.08), rgba(99, 102, 241, 0.1))";

function SectionEyebrow({
  icon: Icon,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      {Icon ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm shadow-slate-900/[0.03] ring-1 ring-white/80">
          <Icon className="size-3" aria-hidden />
        </span>
      ) : null}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {children}
      </h2>
    </div>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`group ${CARD} flex items-stretch gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}
      >
        <Icon className={`size-6 ${iconColor}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-[13px] font-medium leading-snug text-slate-500">
          {description}
        </p>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-slate-300 transition group-hover:text-slate-400"
        aria-hidden
      />
    </Link>
  );
}

function SettingPlaceholderCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`${CARD} flex cursor-not-allowed items-start gap-4 p-5 opacity-[0.72]`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-slate-50 text-slate-400">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-semibold text-slate-800">{title}</p>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Soon
          </span>
        </div>
        <p className="mt-1 text-[12px] font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function AdminConfigView() {
  const profile = useAdminSession();

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
        <p className="text-sm font-medium text-slate-500">Loading profile…</p>
      </div>
    );
  }

  const initial = profile.name?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-3 sm:px-4 sm:py-4">
      <header className="mb-8 lg:mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Config
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
          Account details, admin shortcuts, and future system preferences. Sign
          out when you are done on a shared device.
        </p>
      </header>

      <section aria-label="Signed-in account" className="mb-8 lg:mb-10">
        <SectionEyebrow icon={Sparkles}>Your account</SectionEyebrow>
        <div className={`${CARD} overflow-hidden`}>
          <div
            className="relative border-b border-slate-100/80 px-5 py-8 sm:px-8 sm:py-10"
            style={{ background: HERO_TINT }}
          >
            <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-white/50 blur-2xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg ring-4 ring-white/80"
                style={{
                  background: `linear-gradient(145deg, ${BRAND}, #9f1239)`,
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Signed in as
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {profile.name ?? "Administrator"}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-slate-600">
                  {profile.email}
                </p>
                {profile.phone ? (
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    {profile.phone}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-8">
            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              {profile.role}
            </span>
            {profile.is_verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/60">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/60">
                Unverified
              </span>
            )}
          </div>
        </div>
      </section>

    

      <section aria-label="System settings" className="mb-8 lg:mb-10">
        <SectionEyebrow icon={Settings2}>System settings</SectionEyebrow>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          <ShortcutCard
            href="/admin/config/tax"
            icon={Percent}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            title="Tax Rates"
            description="Configure GST rates and tax rules."
          />
          <SettingPlaceholderCard
            icon={Bell}
            title="Push notifications"
            description="Alerts and quiet hours will live here."
          />
          <SettingPlaceholderCard
            icon={ShieldCheck}
            title="Security"
            description="Sessions, passwords, and 2FA when available."
          />
          <SettingPlaceholderCard
            icon={HelpCircle}
            title="Help & support"
            description="Docs and contact options for your team."
          />
        </div>
      </section>

      <section
        aria-label="Sign out"
        className={`${CARD} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 text-slate-500">
            <LogOut className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Session</p>
            <p className="text-[12px] font-medium text-slate-500">
              End your session on this browser.
            </p>
          </div>
        </div>
        <SignOutForm />
      </section>

      <p className="mt-8 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
        BuyHub Manage · v0.1.0
      </p>
    </div>
  );
}
