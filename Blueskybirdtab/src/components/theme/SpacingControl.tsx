import { Minus, Plus } from 'lucide-react';

interface SpacingControlProps {
  spacing: 'compact' | 'comfortable' | 'spacious';
  spacingValue: number;
  onChange: (spacing: 'compact' | 'comfortable' | 'spacious', spacingValue: number) => void;
}

const SPACING_PRESETS = {
  compact: { value: 8, label: 'Compact', description: '4px gaps, 8px padding' },
  comfortable: { value: 12, label: 'Comfortable', description: '8px gaps, 12px padding' },
  spacious: { value: 16, label: 'Spacious', description: '12px gaps, 16px padding' },
};

const SpacingControl: React.FC<SpacingControlProps> = ({ spacing, spacingValue, onChange }) => {
  const handlePresetClick = (preset: keyof typeof SPACING_PRESETS) => {
    onChange(preset, SPACING_PRESETS[preset].value);
  };

  const handleSliderChange = (value: number) => {
    const presets = Object.keys(SPACING_PRESETS) as Array<keyof typeof SPACING_PRESETS>;
    let closest = presets[0];
    let closestDiff = Math.abs(value - SPACING_PRESETS[closest].value);

    for (const preset of presets) {
      const diff = Math.abs(value - SPACING_PRESETS[preset].value);
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
        {Object.entries(SPACING_PRESETS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key as keyof typeof SPACING_PRESETS)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-[11px] font-medium transition-all duration-200 flex flex-col items-center gap-1
              ${spacing === key
                ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }
            `}
          >
            <Minus className={`w-3.5 h-3.5 ${key === 'compact' ? 'text-[var(--theme-accent)]' : ''}`} />
            <Plus className={`w-3.5 h-3.5 ${key === 'spacious' ? 'text-[var(--theme-accent)]' : ''}`} />
            <span className="text-[10px]">{config.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Spacing</span>
          <span>{spacingValue}px</span>
        </div>
        <input
          type="range"
          min="4"
          max="24"
          value={spacingValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Preview Comparison */}
      <div className="space-y-3">
        <div className="text-[10px] font-medium text-[var(--text-secondary)]">Preview</div>

        {Object.entries(SPACING_PRESETS).map(([key, config]) => (
          <div
            key={key}
            className={`
              relative p-3 rounded-xl bg-[var(--bg-surface)] border-2 transition-all cursor-pointer
              ${spacing === key
                ? 'border-[var(--theme-accent)] bg-[var(--bg-surface-hover)]'
                : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'
              }
            `}
            style={{
              gap: `${config.value}px`,
              padding: `${config.value}px`,
            }}
            onClick={() => handlePresetClick(key as keyof typeof SPACING_PRESETS)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-[var(--text-primary)]">{config.label}</div>
                <div className="text-[9px] text-[var(--text-secondary)]">{config.description}</div>
              </div>
              <div className="text-[9px] font-mono text-[var(--text-secondary)] opacity-70">{config.value}px</div>
            </div>

            {/* Sample UI elements */}
            <div
              className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)]"
              style={{ gap: `${Math.floor(config.value * 0.7)}px` }}
            >
              <div
                className="h-8 w-16 rounded bg-[var(--theme-accent)]"
                style={{ borderRadius: `${Math.floor(config.value * 0.5)}px` }}
              />
              <div
                className="h-8 flex-1 rounded bg-[var(--border-subtle)]"
                style={{ borderRadius: `${Math.floor(config.value * 0.5)}px` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpacingControl;
