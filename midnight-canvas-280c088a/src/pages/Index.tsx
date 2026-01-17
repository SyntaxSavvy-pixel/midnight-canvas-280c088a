import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PerplexicaChatProvider, usePerplexicaChat } from '@/contexts/PerplexicaChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import PerplexicaChat from '@/components/perplexica/PerplexicaChat';
import PerplexicaSidebar from '@/components/perplexica/PerplexicaSidebar';
import SettingsModal from '@/components/perplexica/SettingsModal';
import AuthModal from '@/components/AuthModal';
import { Settings, Moon, Sun } from 'lucide-react';

const IndexContent = () => {
  const { isAuthenticated, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { sendMessage } = usePerplexicaChat();
  const [searchParams] = useSearchParams();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Handle URL search query (?q=search+term)
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      sendMessage(query);
    }
  }, [searchParams]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <PerplexicaSidebar onSettingsClick={() => setSettingsOpen(true)} />

      {/* Main content */}
      <div className="lg:pl-[280px]">
        <div className="max-w-4xl lg:mx-auto mx-4">
          {/* Mobile header with settings */}
          <div className="lg:hidden fixed top-0 right-0 z-50 p-4 flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-foreground/70" />
              ) : (
                <Moon size={18} className="text-foreground/70" />
              )}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Settings size={18} className="text-foreground/70" />
            </button>
          </div>

          {/* Chat interface */}
          <PerplexicaChat />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

const Index = () => {
  return (
    <PerplexicaChatProvider>
      <IndexContent />
    </PerplexicaChatProvider>
  );
};

export default Index;
