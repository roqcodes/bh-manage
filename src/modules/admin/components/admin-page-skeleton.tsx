/** Lightweight placeholder while TanStack Query loads admin data. */
export function AdminPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4 py-8 sm:px-8 sm:py-10">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-[24px] bg-slate-100" />
    </div>
  );
}
