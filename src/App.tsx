import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Unsubscribe from "./pages/Unsubscribe";
import Preferences from "./pages/Preferences";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NewsletterAdmin from "./pages/admin/newsletter/NewsletterAdmin";
import FacebookAdmin from "./pages/admin/facebook/FacebookAdmin";
import NotFound from "./pages/NorFound";
import { AuthProvider } from "./provider/AuthProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/newsletter" element={
              <ProtectedRoute>
                <NewsletterAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/facebook" element={
              <ProtectedRoute>
                <FacebookAdmin />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
