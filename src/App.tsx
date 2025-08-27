import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Strategies from "./pages/Strategies";
import Alerts from "./pages/Alerts";
import Journal from "./pages/Journal";
import Settings from "./pages/Settings";
import Monitor from "./pages/Monitor";
import NotFound from "./pages/NotFound";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider

const queryClient = new QueryClient();

const App = () => {
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider> {/* Wrap the entire application with AuthProvider */}
              <div className="flex h-screen">
                <Sidebar activePage={activePage} setActivePage={setActivePage} />
                <main className="flex-1 md:ml-64 pt-16 md:pt-0 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/strategies" element={<Strategies />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/monitor" element={<Monitor />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;