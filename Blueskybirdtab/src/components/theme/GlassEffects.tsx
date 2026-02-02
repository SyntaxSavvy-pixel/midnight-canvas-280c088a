import { Layers, Sparkles } from 'lucide-react';

interface GlassEffectsProps {
  glass: {
    enabled: boolean;
    opacity: number;
    borderOpacity: number;
    noiseTexture: boolean;
  };
  onChange: (glass: GlassEffectsProps['glass']) => void;
}

const GlassEffects: React.FC<GlassEffectsProps> = ({ glass, onChange }) => {
  const toggleEnabled = () => {
    onChange({ ...glass, enabled: !glass.enabled });
  };

  return (
    <div className="space-y-4">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--theme-accent)]" />
          <div>
            <label className="text-xs font-medium text-[var(--text-primary)] block">Glass Effect</label>
            <span className="text-[10px] text-[var(--text-secondary)]">Frosted glass appearance</span>
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${glass.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--border-subtle)]'}
          `}
        >
          <span
            className={`
              absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
              ${glass.enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {glass.enabled && (
        <>
          {/* Surface Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
              <span>Surface Opacity</span>
              <span>{Math.round(glass.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="0.98"
              step="0.01"
              value={glass.opacity}
              onChange={(e) => onChange({ ...glass, opacity: Number(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-secondary)] opacity-60">
              <span>Transparent</span>
              <span>Solid</span>
            </div>
          </div>

          {/* Border Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
              <span>Border Opacity</span>
              <span>{Math.round(glass.borderOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={glass.borderOpacity}
              onChange={(e) => onChange({ ...glass, borderOpacity: Number(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-secondary)] opacity-60">
              <span>None</span>
              <span>Visible</span>
            </div>
          </div>

          {/* Noise Texture Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--text-secondary)]" />
              <div>
                <label className="text-xs font-medium text-[var(--text-primary)] block">Noise Texture</label>
                <span className="text-[10px] text-[var(--text-secondary)]">Subtle grain overlay</span>
              </div>
            </div>
            <button
              onClick={() => onChange({ ...glass, noiseTexture: !glass.noiseTexture })}
              className={`
                relative w-11 h-6 rounded-full transition-colors duration-200
                ${glass.noiseTexture ? 'bg-[var(--theme-accent)]' : 'bg-[var(--border-subtle)]'}
              `}
            >
              <span
                className={`
                  absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
                  ${glass.noiseTexture ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Preview Grid */}
          <div className="space-y-3">
            <div className="text-[10px] font-medium text-[var(--text-secondary)]">Preview</div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Subtle', opacity: 0.7, borderOpacity: 0.08, noise: false },
                { name: 'Medium', opacity: 0.85, borderOpacity: 0.12, noise: false },
                { name: 'Heavy', opacity: 0.7, borderOpacity: 0.2, noise: true },
              ].map((preset) => {
                const isActive =
                  Math.abs(glass.opacity - preset.opacity) < 0.01 &&
                  Math.abs(glass.borderOpacity - preset.borderOpacity) < 0.01 &&
                  glass.noiseTexture === preset.noise;

                return (
                  <div
                    key={preset.name}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all cursor-pointer hover-lift
                      ${isActive ? 'border-[var(--theme-accent)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'}
                    `}
                    onClick={() => onChange({ ...glass, opacity: preset.opacity, borderOpacity: preset.borderOpacity, noiseTexture: preset.noise })}
                    style={{
                      background: `hsl(var(--bg-surface) / ${preset.opacity})`,
                      backdropFilter: 'blur(24px)',
                      borderColor: `hsl(var(--border-subtle) / ${preset.borderOpacity})`,
                    }}
                  >
                    <div className="text-[10px] font-medium text-[var(--text-primary)] mb-1">{preset.name}</div>
                    <div className="text-[9px] text-[var(--text-secondary)]">
                      {Math.round(preset.opacity * 100)}% · {preset.noise ? 'Noisy' : 'Clean'}
                    </div>

                    {/* Noise overlay */}
                    {preset.noise && (
                      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-noise" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Panel Preview */}
          <div
            className="p-4 rounded-xl border transition-all relative overflow-hidden"
            style={{
              background: `hsl(var(--bg-surface) / ${glass.opacity})`,
              backdropFilter: 'blur(24px)',
              borderColor: `hsl(var(--border-subtle) / ${glass.borderOpacity})`,
            }}
          >
            {glass.noiseTexture && (
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-noise" />
            )}

            <div className="relative z-10">
              <div className="text-xs font-medium text-[var(--text-primary)] mb-2">Glass Panel Preview</div>
              <div className="text-[10px] text-[var(--text-secondary)] mb-3">
                This demonstrates how the glass effect looks with your current settings.
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg bg-[var(--theme-accent)] text-white text-[10px] font-medium hover-lift press-down"
                >
                  Action
                </button>
                <div className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10px]">
                  Sample text content
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GlassEffects;
