/** Admin routes that render a print-focused invoice (minimal chrome in shell). */
export function isAdminInvoicePrintPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    /^\/admin\/orders\/[^/]+\/invoice\/?$/.test(pathname) ||
    /^\/admin\/purchase-orders\/[^/]+\/invoice\/?$/.test(pathname)
  );
}
