import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * Guard admin memakai sesi Supabase Auth (email + password).
 * Tanda "sudah login" bukan lagi flag sessionStorage yang bisa
 * dipalsukan dari console — status ditentukan JWT dari server.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "guest">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setStatus(data.session ? "authed" : "guest");
      })
      .catch(() => {
        if (alive) setStatus("guest");
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authed" : "guest");
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") return null;
  if (status === "guest") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
