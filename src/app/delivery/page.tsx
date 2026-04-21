import { UserRole } from "@/common/auth/types";
import { RoleDashboardView } from "@/modules/auth/components/role-dashboard-view";
import { requireRoleAccess } from "@/modules/auth/services/auth-guard.service";

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const profile = await requireRoleAccess(UserRole.Delivery, "/delivery");

  return (
    <RoleDashboardView
      description="Delivery operators are restricted to fulfillment and delivery execution surfaces."
      profile={profile}
      roleLabel="Delivery Portal"
      title="Delivery Dashboard"
    />
  );
}
