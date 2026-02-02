import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ArcLayout from "./layouts/ArcLayout";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Documentation from "./pages/Documentation";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import HistoryPage from "./pages/HistoryPage";

import { LayoutProvider } from "@/contexts/LayoutContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LayoutProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<ArcLayout />}>
              {/* Home - default anchor */}
              <Route path="/" element={<Index />} />

              {/* Memory Anchor routes - deep linking to specific anchors and chats */}
              <Route path="/tma/:anchorId" element={<Index />} />
              <Route path="/tma/:anchorId/chat/:chatId" element={<Index />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/history" element={<HistoryPage />} />

              {/* Help pages */}
              <Route path="/docs" element={<Documentation />} />
              <Route path="/faq" element={<FAQ />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LayoutProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
