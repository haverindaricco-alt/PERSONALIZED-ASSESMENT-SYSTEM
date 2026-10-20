import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Entry from "./pages/student/Entry";
import Quiz from "./pages/student/Quiz";
import Result from "./pages/student/Result";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import { RequireAdmin } from "./components/guards";
import { loadSession } from "./lib/storage";

function RequireStudent({ children }: { children: ReactNode }) {
  if (!loadSession()) {
    return <Navigate to="/student/entry" replace />;
  }
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student/entry" element={<Entry />} />
        <Route
          path="/student/quiz"
          element={
            <RequireStudent>
              <Quiz />
            </RequireStudent>
          }
        />
        <Route path="/student/result" element={<Result />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
