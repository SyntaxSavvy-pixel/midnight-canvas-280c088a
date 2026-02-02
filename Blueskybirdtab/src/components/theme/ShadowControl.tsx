import { Layers, Zap } from 'lucide-react';

interface ShadowControlProps {
  shadow: 'soft' | 'medium' | 'deep';
  shadowValue: number;
  onChange: (shadow: 'soft' | 'medium' | 'deep', shadowValue: number) => void;
}

const SHADOW_PRESETS = {
  soft: { value: 12, label: 'Soft', description: 'Subtle elevation' },
  medium: { value: 24, label: 'Medium', description: 'Balanced depth' },
  deep: { value: 40, label: 'Deep', description: 'Pronounced depth' },
};

const ShadowControl: React.FC<ShadowControlProps> = ({ shadow, shadowValue, onChange }) => {
  const handlePresetClick = (preset: keyof typeof SHADOW_PRESETS) => {
    onChange(preset, SHADOW_PRESETS[preset].value);
  };

  const handleSliderChange = (value: number) => {
    // Find closest preset
    const presets = Object.keys(SHADOW_PRESETS) as Array<keyof typeof SHADOW_PRESETS>;
    let closest = presets[0];
    let closestDiff = Math.abs(value - SHADOW_PRESETS[closest].value);

    for (const preset of presets) {
      const diff = Math.abs(value - SHADOW_PRESETS[preset].value);
      if (diff < closestDiff) {
        closest = preset;
        closestDiff = diff;
      }
    }

    onChange(closest, value);
  };

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="flex bg-[var(--bg-background)] p-1 rounded-xl border border-[var(--border-subtle)]">
        {Object.entries(SHADOW_PRESETS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key as keyof typeof SHADOW_PRESETS)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-[11px] font-medium transition-all duration-200 flex flex-col items-center gap-1
              ${shadow === key
                ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }
            `}
          >
            <Zap className={`w-3.5 h-3.5 ${shadow === key ? 'text-[var(--theme-accent)]' : ''}`} />
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Shadow Depth</span>
          <span>{shadowValue}px</span>
        </div>
        <input
          type="range"
          min="8"
          max="60"
          value={shadowValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Preview Cards */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(SHADOW_PRESETS).map(([key, config]) => (
          <div
            key={key}
            className="relative p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover-lift transition-all cursor-pointer"
            style={{
              boxShadow: `0 ${config.value}px ${config.value * 2.5}px rgba(0, 0, 0, ${key === 'soft' ? 0.08 : key === 'medium' ? 0.12 : 0.16})`,
            }}
            onClick={() => handlePresetClick(key as keyof typeof SHADOW_PRESETS)}
          >
            <div className="absolute top-2 right-2">
              {shadow === key && <Layers className="w-3.5 h-3.5 text-[var(--theme-accent)]" />}
            </div>
            <div className="text-[10px] font-medium text-[var(--text-primary)] mb-1">{config.label}</div>
            <div className="text-[9px] text-[var(--text-secondary)]">{config.description}</div>
            <div className="text-[9px] text-[var(--text-secondary)] mt-1 opacity-70">{config.value}px</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShadowControl;
