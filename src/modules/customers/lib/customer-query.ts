/** PostgREST filter: storefront + ERP customers, excluding staff roles. */
export const CUSTOMER_ROLE_OR_FILTER = "role.is.null,role.eq.customer";

export {
  buildIlikePattern,
  escapeIlikePattern,
  sanitizePostgrestOrTerm,
} from "@/lib/postgrest-search";
