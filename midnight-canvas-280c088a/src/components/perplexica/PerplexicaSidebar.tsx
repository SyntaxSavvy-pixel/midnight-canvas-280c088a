import { Home, Search, Clock, Compass, Settings, Plus, Moon, Sun, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface PerplexicaSidebarProps {
  onSettingsClick: () => void;
}

// TabKeep Logo Component
const TabKeepLogo = ({ size = 32 }: { size?: number }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <svg viewBox="0 0 375 375" width={size} height={size}>
      {/* T - Red */}
      <text x="95" y="250" fontSize="200" fontWeight="700" fill="#f93d3a" fontFamily="Inter, sans-serif">T</text>
      {/* A - Green */}
      <text x="195" y="250" fontSize="200" fontWeight="700" fill="#31a768" fontFamily="Inter, sans-serif">A</text>
      {/* Star sparkle - Gold */}
      <circle cx="230" cy="95" r="8" fill="#f6d636" />
    </svg>
  </div>
);

const PerplexicaSidebar = ({ onSettingsClick }: PerplexicaSidebarProps) => {
  const { theme, setTheme } = useTheme();

  const navLinks = [
    { icon: Home, label: 'Home', active: true, href: '/' },
    { icon: Compass, label: 'Discover', active: false, href: '#discover' },
    { icon: Clock, label: 'History', active: false, href: '#history' },
  ];

  const handleNewChat = () => {
    window.location.reload();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[280px] lg:flex-col border-r border-border">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-4 py-6">
          {/* Logo and brand */}
          <div className="flex items-center gap-3 px-2">
            <TabKeepLogo size={36} />
            <div>
              <h1 className="text-lg font-semibold text-foreground">TabKeep</h1>
              <p className="text-[10px] text-muted-foreground">AI-Powered Search</p>
            </div>
          </div>

          {/* New chat button */}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] font-medium text-sm tabkeep-glow"
          >
            <Plus size={18} />
            <span>New Search</span>
          </button>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1 mt-2">
            {navLinks.map((link, i) => (
              <button
                key={i}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm',
                  link.active
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                <link.icon size={18} />
                <span>{link.label}</span>
                {link.active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </nav>

          {/* Feature highlights */}
          <div className="mt-4 px-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Search Modes</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Speed - Quick answers</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Balanced - Best results</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">Quality - Deep research</span>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom controls */}
          <div className="border-t border-border pt-4 space-y-1">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors text-sm"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors text-sm"
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </div>

          {/* Version badge */}
          <div className="px-3 py-2 text-[10px] text-muted-foreground/60">
            TabKeep v1.0.0 • Powered by Brave + OpenAI
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 w-full z-50 flex flex-row items-center justify-around bg-card/95 backdrop-blur-lg border-t border-border px-2 py-3 lg:hidden safe-area-pb">
        {navLinks.map((link, i) => (
          <button
            key={i}
            className={cn(
              'relative flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all',
              link.active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <link.icon size={22} strokeWidth={link.active ? 2.5 : 2} />
            <p className="text-[10px] font-medium">{link.label}</p>
            {link.active && (
              <div className="absolute -top-1 w-8 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
        <button
          onClick={handleNewChat}
          className="flex flex-col items-center gap-1 px-4 py-1 text-muted-foreground"
        >
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
            <Plus size={18} />
          </div>
          <p className="text-[10px] font-medium">New</p>
        </button>
      </div>
    </>
  );
};

export default PerplexicaSidebar;
