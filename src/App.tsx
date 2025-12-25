import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SesiLive from "./pages/SesiLive";
import Payroll from "./pages/Payroll";
import Kreator from "./pages/Kreator";
import KreatorDetail from "./pages/KreatorDetail";
import Sales from "./pages/Sales";
import Konten from "./pages/Konten";
import Konfigurasi from "./pages/Konfigurasi";
import Keuangan from "./pages/Keuangan";
import Profil from "./pages/Profil";
import Inventaris from "./pages/Inventaris";
import Leaderboard from "./pages/Leaderboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Super Admin Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sesi-live"
                element={
                  <ProtectedRoute allowedRoles={["CREATOR", "ADMIN", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <SesiLive />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Payroll />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kreator"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Kreator />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kreator/:creatorId"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <KreatorDetail />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CREATOR", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Sales />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/konten"
                element={
                  <ProtectedRoute allowedRoles={["CREATOR", "ADMIN", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Konten />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/konfigurasi"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Konfigurasi />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/keuangan"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Keuangan />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profil"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CREATOR", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Profil />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventaris"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Inventaris />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CREATOR", "INVESTOR", "AGENCY_OWNER"]}>
                    <DashboardLayout>
                      <Leaderboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;