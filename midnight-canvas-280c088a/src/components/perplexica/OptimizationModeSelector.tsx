import { Zap, Sliders, Star, ChevronDown } from 'lucide-react';
import { usePerplexicaChat, OptimizationMode } from '@/contexts/PerplexicaChatContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const modes = [
  {
    key: 'speed' as OptimizationMode,
    title: 'Speed',
    description: 'Quick answers with minimal processing',
    icon: Zap,
    color: 'text-orange-500',
  },
  {
    key: 'balanced' as OptimizationMode,
    title: 'Balanced',
    description: 'Balance between speed and quality',
    icon: Sliders,
    color: 'text-green-500',
  },
  {
    key: 'quality' as OptimizationMode,
    title: 'Quality',
    description: 'Best quality with deep research',
    icon: Star,
    color: 'text-blue-500',
  },
];

const OptimizationModeSelector = () => {
  const { optimizationMode, setOptimizationMode } = usePerplexicaChat();
  const [open, setOpen] = useState(false);

  const currentMode = modes.find(m => m.key === optimizationMode) || modes[1];
  const Icon = currentMode.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/80 transition duration-200 flex items-center gap-1"
      >
        <Icon size={16} className={currentMode.color} />
        <ChevronDown
          size={14}
          className={cn(
            'transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {modes.map((mode) => {
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => {
                    setOptimizationMode(mode.key);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full p-3 text-left hover:bg-secondary/50 transition-colors duration-150 flex items-start gap-3',
                    optimizationMode === mode.key && 'bg-secondary/30'
                  )}
                >
                  <ModeIcon size={18} className={cn('mt-0.5', mode.color)} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{mode.title}</p>
                      {mode.key === 'quality' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                          Beta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default OptimizationModeSelector;
