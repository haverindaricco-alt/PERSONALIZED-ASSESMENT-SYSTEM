import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

const ADMIN_KEY = "pas.admin.v1";

export function setAdminAuth(value: boolean): void {
  try {
    if (value) {
      window.sessionStorage.setItem(ADMIN_KEY, "1");
    } else {
      window.sessionStorage.removeItem(ADMIN_KEY);
    }
  } catch {
    /* abaikan */
  }
}

export function isAdminAuthed(): boolean {
  try {
    return window.sessionStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  if (!isAdminAuthed()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
