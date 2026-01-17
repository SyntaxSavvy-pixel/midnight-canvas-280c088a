import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        relative w-14 h-14 rounded-2xl
        bg-card/40 backdrop-blur-xl
        border border-border/20
        hover:bg-card/60 hover:border-border/40
        transition-all duration-300 ease-out
        overflow-hidden
        group
      "
      aria-label="Toggle theme"
    >
      {/* Background glow effect */}
      <div className="
        absolute inset-0 opacity-0 group-hover:opacity-100
        bg-gradient-to-br from-primary/20 to-transparent
        transition-opacity duration-500
      " />

      {/* Icon container with rotation animation */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun icon - visible in dark mode */}
        <Sun
          className={`
            absolute w-5 h-5 text-foreground/70
            transition-all duration-700 ease-out
            ${theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-180 scale-0'
            }
          `}
        />

        {/* Moon icon - visible in light mode */}
        <Moon
          className={`
            absolute w-5 h-5 text-foreground/70
            transition-all duration-700 ease-out
            ${theme === 'light'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-180 scale-0'
            }
          `}
        />
      </div>

      {/* Ripple effect on click */}
      <div className="
        absolute inset-0
        before:absolute before:inset-0
        before:rounded-2xl before:bg-primary/20
        before:scale-0 before:opacity-0
        active:before:scale-100 active:before:opacity-100
        before:transition-all before:duration-500
      " />
    </button>
  );
};

export default ThemeToggle;
