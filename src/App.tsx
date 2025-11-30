import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { RoleGuard } from "@/components/RoleGuard";
import { AdminLayout } from "@/components/AdminLayout";
import Champions from "./pages/Champions";
import Matchups from "./pages/Matchups";
import Draft from "./pages/Draft";
import Coach from "./pages/Coach";
import Player from "./pages/Player";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminContracts from "./pages/admin/Contracts";
import AdminEvaluations from "./pages/admin/Evaluations";
import AdminMessages from "./pages/admin/Messages";
import AdminWayPoints from "./pages/admin/WayPoints";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <RoleGuard allowedRoles={["admin"]}>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/dashboard" element={<AdminDashboard />} />
                    <Route path="/users" element={<AdminUsers />} />
                    <Route path="/contracts" element={<AdminContracts />} />
                    <Route path="/evaluations" element={<AdminEvaluations />} />
                    <Route path="/messages" element={<AdminMessages />} />
                    <Route path="/waypoints" element={<AdminWayPoints />} />
                  </Routes>
                </AdminLayout>
              </RoleGuard>
            } />

            {/* Coach Route */}
            <Route path="/coach" element={
              <RoleGuard allowedRoles={["coach", "admin"]}>
                <Coach />
              </RoleGuard>
            } />

            {/* Player Route */}
            <Route path="/player" element={
              <RoleGuard allowedRoles={["player", "admin"]}>
                <Player />
              </RoleGuard>
            } />

            {/* Public Routes */}
            <Route path="/*" element={
              <>
                <Navigation />
                <Routes>
                  <Route path="/" element={<Champions />} />
                  <Route path="/matchups" element={<Matchups />} />
                  <Route path="/draft" element={<Draft />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </>
            } />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
