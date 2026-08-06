/** Lightweight placeholder while TanStack Query loads admin data. */
export function AdminPageSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-3 py-4 sm:px-4 sm:py-5">
      <div className="h-7 w-48 rounded-lg bg-slate-200" />
      <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-[24px] bg-slate-100" />
    </div>
  );
}
