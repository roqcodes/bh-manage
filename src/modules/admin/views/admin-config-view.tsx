"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  HelpCircle,
  LogOut,
  Percent,
  ShieldCheck,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutForm } from "@/modules/auth/components/sign-out-form";
import { useAdminSession } from "@/modules/admin/providers/admin-session-provider";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { RegionCurrencySettingsCard } from "@/modules/settings/components/region-currency-settings-card";
import { PaymentSettingsCard } from "@/modules/settings/components/payment-settings-card";
import { cn } from "@/lib/utils";

function SettingLinkCard({
  href,
  icon: Icon,
  iconClassName,
  title,
  description,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} scroll={false} className="group block">
      <Card
        className="border border-border py-0 ring-0 transition-colors hover:bg-accent/40"
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground"
            aria-hidden
          />
        </CardContent>
      </Card>
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
    <Card className="border border-border py-0 opacity-60 ring-0">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{title}</p>
            <Badge variant="secondary" className="text-[10px] uppercase">
              Soon
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminConfigView() {
  const profile = useAdminSession();

  if (!profile) {
    return <AdminPageSkeleton />;
  }

  const initial = profile.name?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Config</h1>
        <p className="text-sm text-muted-foreground">
          Account details, system preferences, and session controls.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="border border-border py-0 ring-0">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" aria-hidden />
              Your account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground"
                aria-hidden
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold tracking-tight">
                  {profile.name ?? "Administrator"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {profile.email}
                </p>
                {profile.phone ? (
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge variant="secondary" className="uppercase">
                  {profile.role}
                </Badge>
                {profile.is_verified ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-800"
                  >
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <RegionCurrencySettingsCard />

        <PaymentSettingsCard />

        <section aria-label="System settings">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            System settings
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SettingLinkCard
              href="/admin/config/tax"
              icon={Percent}
              iconClassName="bg-violet-100 text-violet-600"
              title="Tax rates"
              description="Configure GST rates and tax rules."
            />
            <SettingPlaceholderCard
              icon={Bell}
              title="Push notifications"
              description="Alerts and quiet hours."
            />
            <SettingPlaceholderCard
              icon={ShieldCheck}
              title="Security"
              description="Sessions, passwords, and 2FA."
            />
            <SettingPlaceholderCard
              icon={HelpCircle}
              title="Help & support"
              description="Docs and contact options."
            />
          </div>
        </section>

        <Card className="border border-border py-0 ring-0">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <LogOut className="size-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium">Session</p>
                <p className="text-xs text-muted-foreground">
                  End your session on this browser.
                </p>
              </div>
            </div>
            <SignOutForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
