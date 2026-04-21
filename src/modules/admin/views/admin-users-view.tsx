"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { AdminUser, DBUser } from "@/common/admin/types";
import { PageHeader } from "@/modules/admin/components/page-header";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { StoresPanel } from "@/modules/users/components/stores-panel";
import { PortalStaffPanel } from "@/modules/users/components/portal-staff-panel";
import { AccessRequestsPanel } from "@/modules/users/components/access-requests-panel";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const USER_SEGMENTS = [
  { id: "stores", label: "Stores" },
  { id: "vendor", label: "Vendor" },
  { id: "delivery", label: "Delivery" },
  { id: "admin", label: "Admin" },
] as const;

type UserSegment = (typeof USER_SEGMENTS)[number]["id"];

type UsersApiContent =
  | { kind: "requests"; pending: DBUser[] }
  | { kind: "stores"; data: AdminUser[]; total: number }
  | { kind: "vendor"; data: DBUser[]; total: number }
  | { kind: "delivery"; data: DBUser[]; total: number }
  | { kind: "admin"; data: DBUser[]; total: number };

export function AdminUsersView() {
  const searchParams = useSearchParams();
  const primary = searchParams.get("tab") === "requests" ? "requests" : "users";
  const rawSegment = searchParams.get("segment");
  const normalizedSegment =
    rawSegment === "restaurants" ? "stores" : rawSegment;
  const segment: UserSegment =
    normalizedSegment === "vendor" ||
    normalizedSegment === "delivery" ||
    normalizedSegment === "admin"
      ? (normalizedSegment as UserSegment)
      : "stores";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.users(primary, segment, page),
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("tab", primary);
      q.set("segment", segment);
      if (page > 0) q.set("page", String(page));
      return adminGet<{
        pendingCount: number;
        primary: "users" | "requests";
        segment: UserSegment;
        page: number;
        content: UsersApiContent;
      }>(`users?${q.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="px-4 py-10 text-sm font-semibold text-red-600 sm:px-8">
        {error instanceof Error ? error.message : "Failed to load users."}
      </div>
    );
  }
  if (!data) return <AdminPageSkeleton />;

  const { pendingCount, content } = data;
  const subtitle =
    primary === "requests"
      ? "Review and approve portal access requests."
      : "Retail store customers and verified portal staff.";

  function segmentHref(seg: UserSegment) {
    const q = new URLSearchParams({ tab: "users", segment: seg });
    return `/admin/users?${q.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader title="Users" subtitle={subtitle} />

      <div className="mb-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
        <Link
          href={`/admin/users?tab=users&segment=${segment}`}
          scroll={false}
          className={[
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition",
            primary === "users"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          Users
        </Link>
        <Link
          href="/admin/users?tab=requests"
          scroll={false}
          className={[
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition",
            primary === "requests"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          Requests
          {pendingCount > 0 && (
            <span className="rounded-full bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {primary === "users" && (
        <div className="mb-6 flex min-w-0 flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {USER_SEGMENTS.map((s) => (
            <Link
              key={s.id}
              href={segmentHref(s.id)}
              scroll={false}
              className={[
                "min-w-[100px] flex-1 rounded-xl px-4 py-2 text-center text-sm font-bold transition",
                segment === s.id
                  ? "bg-[#2563EB]/10 text-[#2563EB]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              ].join(" ")}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {content.kind === "stores" && (
        <StoresPanel
          users={content.data}
          total={content.total}
          page={page}
        />
      )}

      {content.kind === "vendor" && (
        <PortalStaffPanel
          users={content.data}
          total={content.total}
          page={page}
          segment="vendor"
        />
      )}

      {content.kind === "delivery" && (
        <PortalStaffPanel
          users={content.data}
          total={content.total}
          page={page}
          segment="delivery"
        />
      )}

      {content.kind === "admin" && (
        <PortalStaffPanel
          users={content.data}
          total={content.total}
          page={page}
          segment="admin"
        />
      )}

      {content.kind === "requests" && (
        <AccessRequestsPanel pendingUsers={content.pending} />
      )}
    </div>
  );
}
