import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Strategies from "./pages/Strategies";
import Alerts from "./pages/Alerts";
import Journal from "./pages/Journal";
import Settings from "./pages/Settings";
import Chatbot from "./pages/Chatbot"; // Import the new Chatbot page
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { Bell } from "lucide-react";

const queryClient = new QueryClient();

const RealtimeAlerts = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newAlert = payload.new as any;
          toast(`${newAlert.strategy_name}: ${newAlert.symbol}`, {
            description: `New ${newAlert.type} signal at $${newAlert.price}`,
            icon: <Bell className="w-4 h-4" />,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null; // This component doesn't render anything
};

const App = () => {
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" storageKey="ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <RealtimeAlerts />
              <div className="flex h-screen">
                <Sidebar activePage={activePage} setActivePage={setActivePage} />
                <main className="flex-1 md:ml-64 pt-16 md:pt-0 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/strategies" element={<Strategies />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/assistant" element={<Chatbot />} />
                    <Route path="/settings" element={<Settings />} />
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