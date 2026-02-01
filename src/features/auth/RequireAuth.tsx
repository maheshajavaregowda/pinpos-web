import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const userId = localStorage.getItem("pinpos_user_id");
  const userType = localStorage.getItem("pinpos_user_type"); // 'owner' or 'crew'

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  // Strictly block Crew from Dashboard/Admin management routes
  const dashboardRoutes = ["/dashboard", "/crew", "/devices", "/reports", "/settings"];
  const isDashboardRoute = dashboardRoutes.some(route => window.location.pathname.startsWith(route));

  if (userType === "crew" && isDashboardRoute) {
    return <Navigate to="/terminal" replace />;
  }

  return <>{children}</>;
}
