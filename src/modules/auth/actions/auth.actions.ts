"use server";

import { redirect } from "next/navigation";

import {
  INITIAL_AUTH_ACTION_STATE,
  UserRole,
  type AuthActionState,
  type RequestAccessRole,
} from "@/common/auth/types";
import {
  getAccessRedirectPath,
  canAccessRolePath,
} from "@/modules/auth/access.control";
import {
  AUTH_ROUTES,
  getDashboardRouteForRole,
} from "@/modules/auth/services/auth-route.service";
import {
  requestAccess,
  signInWithPassword,
  signOutCurrentUser,
} from "@/modules/auth/services/auth.service";

function readTrimmedField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getValidatedRole(value: string): RequestAccessRole | null {
  if (
    value === UserRole.Admin ||
    value === UserRole.Vendor ||
    value === UserRole.Delivery
  ) {
    return value;
  }

  return null;
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readTrimmedField(formData, "email");
  const password = readTrimmedField(formData, "password");

  if (!email || !password) {
    return {
      ...INITIAL_AUTH_ACTION_STATE,
      errorMessage: "Enter both email and password.",
    };
  }

  try {
    const { profile } = await signInWithPassword({
      email,
      password,
    });

    if (!profile) {
      return {
        ...INITIAL_AUTH_ACTION_STATE,
        errorMessage: "Your account profile could not be loaded.",
      };
    }

    if (!profile.role) {
      return {
        ...INITIAL_AUTH_ACTION_STATE,
        errorMessage: "Your account role is not allowed in this portal.",
      };
    }

    redirect(getAccessRedirectPath(profile));
  } catch (error) {
    return {
      ...INITIAL_AUTH_ACTION_STATE,
      errorMessage:
        error instanceof Error ? error.message : "Unable to sign you in.",
    };
  }
}

export async function requestAccessAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = readTrimmedField(formData, "name");
  const email = readTrimmedField(formData, "email");
  const phone = readTrimmedField(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const role = getValidatedRole(readTrimmedField(formData, "role"));

  if (!name || !email || !phone || !password || !role) {
    return {
      ...INITIAL_AUTH_ACTION_STATE,
      errorMessage: "Fill in all fields to request access.",
    };
  }

  if (password.length < 8) {
    return {
      ...INITIAL_AUTH_ACTION_STATE,
      errorMessage: "Password must be at least 8 characters.",
    };
  }

  try {
    await requestAccess({
      name,
      email,
      phone,
      password,
      role,
    });

    return {
      ...INITIAL_AUTH_ACTION_STATE,
      successMessage:
        "Access requested. An administrator must verify your account before sign-in.",
    };
  } catch (error) {
    return {
      ...INITIAL_AUTH_ACTION_STATE,
      errorMessage:
        error instanceof Error ? error.message : "Unable to request access.",
    };
  }
}

export async function signOutAction() {
  await signOutCurrentUser();
  redirect(AUTH_ROUTES.signIn);
}

export async function redirectAuthorizedUserAction(role: UserRole, path: string) {
  if (canAccessRolePath(path, role)) {
    return;
  }

  redirect(getDashboardRouteForRole(role));
}
