import { signOutAction } from "@/modules/auth/actions/auth.actions";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
