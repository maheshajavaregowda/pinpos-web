import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Kitchen from "@/pages/Kitchen";
import Devices from "@/pages/Devices";
import Crew from "@/pages/Crew";
import Menu from "@/pages/Menu";
import Integrations from "@/pages/Integrations";
import Billing from "@/pages/Billing";
import Terminal from "@/pages/Terminal";
import NotFound from "@/pages/NotFound";
import RequireAuth from "./features/auth/RequireAuth";
import DashboardLayout from "./components/layout/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terminal" element={<Terminal />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <RequireAuth>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </RequireAuth>
        } />
        <Route path="/devices" element={
          <RequireAuth>
            <DashboardLayout>
              <Devices />
            </DashboardLayout>
          </RequireAuth>
        } />
        <Route path="/kitchen" element={
          <RequireAuth>
            <DashboardLayout>
              <Kitchen />
            </DashboardLayout>
          </RequireAuth>
        } />
        <Route path="/crew" element={
          <RequireAuth>
            <DashboardLayout>
              <Crew />
            </DashboardLayout>
          </RequireAuth>
        } />
        <Route path="/menu" element={
          <RequireAuth>
            <DashboardLayout>
              <Menu />
            </DashboardLayout>
          </RequireAuth>
        } />
        <Route path="/integrations" element={
          <RequireAuth>
            <DashboardLayout>
              <Integrations />
            </DashboardLayout>
          </RequireAuth>
        } />
        <Route path="/billing" element={
          <RequireAuth>
            <DashboardLayout>
              <Billing />
            </DashboardLayout>
          </RequireAuth>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
