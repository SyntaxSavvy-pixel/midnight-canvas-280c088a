import { useState } from 'react';
import { Palette, Image as ImageIcon, Sparkles } from 'lucide-react';

interface BackgroundPickerProps {
  background: string;
  gradient: {
    enabled: boolean;
    startColor: string;
    endColor: string;
    angle: number;
    intensity: number;
  };
  pattern: string | null;
  brightness: number;
  onChange: (updates: {
    background?: string;
    gradient?: BackgroundPickerProps['gradient'];
    pattern?: string | null;
    brightness?: number;
  }) => void;
}

const PATTERNS = [
  { id: 'dots', name: 'Dots', class: 'bg-dots' },
  { id: 'waves', name: 'Waves', class: 'bg-waves' },
  { id: 'grid', name: 'Grid', class: 'bg-grid' },
  { id: 'mesh', name: 'Mesh', class: 'bg-mesh' },
  { id: 'noise', name: 'Noise', class: 'bg-noise' },
  { id: 'geometric', name: 'Geometric', class: 'bg-geometric' },
  { id: 'circles', name: 'Circles', class: 'bg-circles' },
  { id: 'lines', name: 'Lines', class: 'bg-lines' },
];

const BackgroundPicker: React.FC<BackgroundPickerProps> = ({ background, gradient, pattern, brightness, onChange }) => {
  const [useGradient, setUseGradient] = useState(gradient.enabled);

  const handleBackgroundChange = (color: string) => {
    onChange({ background: color });
  };

  const handlePatternClick = (patternId: string | null) => {
    onChange({ pattern: patternId });
  };

  const handleBrightnessChange = (value: number) => {
    onChange({ brightness: value });
  };

  const toggleGradient = () => {
    const newEnabled = !useGradient;
    setUseGradient(newEnabled);
    onChange({ gradient: { ...gradient, enabled: newEnabled } });
  };

  const getBackgroundStyle = () => {
    if (gradient.enabled) {
      return `linear-gradient(${gradient.angle}deg, ${gradient.startColor} 0%, ${gradient.endColor} 100%)`;
    }
    return background;
  };

  return (
    <div className="space-y-5">
      {/* Toggle Gradient */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--theme-accent)]" />
          <div>
            <label className="text-xs font-medium text-[var(--text-primary)] block">Gradient Background</label>
            <span className="text-[10px] text-[var(--text-secondary)]">Use gradient instead of solid color</span>
          </div>
        </div>
        <button
          onClick={toggleGradient}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${gradient.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--border-subtle)]'}
          `}
        >
          <span
            className={`
              absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
              ${gradient.enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {gradient.enabled ? (
        <>
          {/* Gradient Color Pickers */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 block">Start Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradient.startColor}
                    onChange={(e) => onChange({ gradient: { ...gradient, startColor: e.target.value } })}
                    className="w-12 h-12 rounded-lg border border-[var(--border-subtle)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={gradient.startColor}
                    onChange={(e) => onChange({ gradient: { ...gradient, startColor: e.target.value } })}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 block">End Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradient.endColor}
                    onChange={(e) => onChange({ gradient: { ...gradient, endColor: e.target.value } })}
                    className="w-12 h-12 rounded-lg border border-[var(--border-subtle)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={gradient.endColor}
                    onChange={(e) => onChange({ gradient: { ...gradient, endColor: e.target.value } })}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Angle Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
              <span>Gradient Angle</span>
              <span>{gradient.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={gradient.angle}
              onChange={(e) => onChange({ gradient: { ...gradient, angle: Number(e.target.value) } })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </>
      ) : (
        <>
          {/* Solid Color Picker */}
          <div className="space-y-3">
            <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 block">Background Color</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={background}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="w-16 h-16 rounded-xl border border-[var(--border-subtle)] cursor-pointer"
              />
              <input
                type="text"
                value={background}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
              />
            </div>
          </div>
        </>
      )}

      {/* Brightness Control */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Brightness</span>
          <span>{brightness > 0 ? '+' : ''}{brightness}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={brightness}
          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-[var(--text-secondary)] opacity-60">
          <span>Darker</span>
          <span>Lighter</span>
        </div>
      </div>

      {/* Pattern Library */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--text-secondary)]" />
          <label className="text-[10px] font-medium text-[var(--text-secondary)]">Background Pattern (Optional)</label>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* None option */}
          <button
            onClick={() => handlePatternClick(null)}
            className={`
              aspect-square rounded-lg border-2 transition-all duration-200 flex items-center justify-center hover-lift
              ${pattern === null
                ? 'border-[var(--theme-accent)] bg-[var(--bg-surface-hover)]'
                : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)] bg-[var(--bg-surface)]'
              }
            `}
            title="No Pattern"
          >
            <div className="text-[9px] font-medium text-[var(--text-secondary)]">None</div>
          </button>

          {/* Pattern options */}
          {PATTERNS.map((p) => {
            const isActive = pattern === p.id;
            const patternStyle = getPatternStyle(p.id);

            return (
              <button
                key={p.id}
                onClick={() => handlePatternClick(p.id)}
                className={`
                  aspect-square rounded-lg border-2 transition-all duration-200 overflow-hidden hover-lift relative
                  ${isActive ? 'border-[var(--theme-accent)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'}
                `}
                style={patternStyle}
                title={p.name}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[var(--theme-accent)]" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Preview */}
      <div
        className="w-full h-24 rounded-xl border-2 border-[var(--border-subtle)] relative overflow-hidden"
        style={{
          background: getBackgroundStyle(),
          filter: `brightness(${1 + brightness / 100})`,
        }}
      >
        {pattern && (
          <div
            className="absolute inset-0 opacity-20"
            style={getPatternStyle(pattern)}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-[var(--text-primary)] drop-shadow-lg">Homepage Preview</span>
        </div>
      </div>
    </div>
  );
};

// Pattern styles
function getPatternStyle(patternId: string) {
  const patterns: Record<string, any> = {
    dots: {
      backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      color: 'rgba(255, 255, 255, 0.1)',
    },
    waves: {
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)',
      backgroundSize: '20px 20px',
      color: 'rgba(255, 255, 255, 0.05)',
    },
    grid: {
      backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      color: 'rgba(255, 255, 255, 0.08)',
    },
    mesh: {
      backgroundImage: 'linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor), linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor)',
      backgroundSize: '20px 20px',
      color: 'rgba(255, 255, 255, 0.03)',
    },
    noise: {
      backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
      opacity: '0.03',
    },
    geometric: {
      backgroundImage: 'linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor), linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 10px 10px',
      color: 'rgba(255, 255, 255, 0.05)',
    },
    circles: {
      backgroundImage: 'radial-gradient(circle, currentColor 2px, transparent 2px)',
      backgroundSize: '20px 20px',
      color: 'rgba(255, 255, 255, 0.08)',
    },
    lines: {
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, currentColor 19px, currentColor 20px)',
      backgroundSize: '20px 20px',
      color: 'rgba(255, 255, 255, 0.05)',
    },
  };

  return patterns[patternId] || {};
}

export default BackgroundPicker;
