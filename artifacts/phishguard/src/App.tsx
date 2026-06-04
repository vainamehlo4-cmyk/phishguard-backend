import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Training from "@/pages/training";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminSimulations from "@/pages/admin-simulations";
import AdminCampaigns from "@/pages/admin-campaigns";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => {
        // Simple redirect component
        window.location.replace("/login");
        return null;
      }} />
      <Route>
        <Layout>
          <Switch>
            <ProtectedRoute path="/dashboard" component={Dashboard} />
            <ProtectedRoute path="/inbox" component={Inbox} />
            <ProtectedRoute path="/training" component={Training} />
            <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly />
            <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly />
            <ProtectedRoute path="/admin/simulations" component={AdminSimulations} adminOnly />
            <ProtectedRoute path="/admin/campaigns" component={AdminCampaigns} adminOnly />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
