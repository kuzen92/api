import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Migrations from "@/pages/Migrations";
import ApiSettings from "@/pages/ApiSettings";
import MigrationDetails from "@/pages/MigrationDetails";
import NewMigration from "@/pages/NewMigration";
import SelectProductsPage from "@/pages/SelectProductsPage";
import CategoryMappingPage from "@/pages/CategoryMappingPage";
import ProductMappingPage from "@/pages/ProductMappingPage";
import AuthPage from "@/pages/auth-page";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/migrations" component={Migrations} />
      <ProtectedRoute path="/migrations/:id" component={MigrationDetails} />
      <ProtectedRoute path="/new-migration" component={NewMigration} />
      <ProtectedRoute path="/products" component={SelectProductsPage} />
      <ProtectedRoute path="/category-mapping" component={CategoryMappingPage} />
      <ProtectedRoute path="/product-mapping/:productId/:direction" component={ProductMappingPage} />
      <ProtectedRoute path="/api-settings" component={ApiSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route>
              <Layout>
                <Router />
              </Layout>
            </Route>
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
