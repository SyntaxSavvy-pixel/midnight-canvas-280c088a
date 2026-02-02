import { Square, Circle } from 'lucide-react';

interface RadiusControlProps {
  radius: 'sharp' | 'subtle' | 'rounded' | 'pill' | 'full';
  radiusValue: number;
  onChange: (radius: 'sharp' | 'subtle' | 'rounded' | 'pill' | 'full', radiusValue: number) => void;
}

const RADIUS_PRESETS = {
  sharp: { value: 0, label: 'Sharp', description: 'No rounding' },
  subtle: { value: 4, label: 'Subtle', description: 'Slight rounding' },
  rounded: { value: 8, label: 'Rounded', description: 'Balanced corners' },
  pill: { value: 16, label: 'Pill', description: 'Soft corners' },
  full: { value: 24, label: 'Full', description: 'Maximum rounding' },
};

const RadiusControl: React.FC<RadiusControlProps> = ({ radius, radiusValue, onChange }) => {
  const handlePresetClick = (preset: keyof typeof RADIUS_PRESETS) => {
    onChange(preset, RADIUS_PRESETS[preset].value);
  };

  const handleSliderChange = (value: number) => {
    const presets = Object.keys(RADIUS_PRESETS) as Array<keyof typeof RADIUS_PRESETS>;
    let closest = presets[0];
    let closestDiff = Math.abs(value - RADIUS_PRESETS[closest].value);

    for (const preset of presets) {
      const diff = Math.abs(value - RADIUS_PRESETS[preset].value);
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
        {Object.entries(RADIUS_PRESETS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key as keyof typeof RADIUS_PRESETS)}
            className={`
              flex-1 py-2 px-2 rounded-lg text-[10px] font-medium transition-all duration-200 flex flex-col items-center gap-1
              ${radius === key
                ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }
            `}
            style={{
              borderRadius: `${config.value}px`,
            }}
          >
            {key === 'sharp' && <Square className="w-3.5 h-3.5" />}
            {key !== 'sharp' && (
              <div
                className="w-3.5 h-3.5 rounded bg-[var(--text-secondary)]"
                style={{
                  borderRadius: `${Math.min(config.value, 8)}px`,
                  backgroundColor: radius === key ? 'var(--theme-accent)' : 'var(--text-secondary)',
                }}
              />
            )}
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Corner Radius</span>
          <span>{radiusValue}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="32"
          value={radiusValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Preview Cards */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(RADIUS_PRESETS).map(([key, config]) => {
          const isActive = radius === key;

          return (
            <div
              key={key}
              className={`
                relative p-3 rounded-xl bg-[var(--bg-surface)] border-2 transition-all cursor-pointer hover-lift
                ${isActive ? 'border-[var(--theme-accent)] bg-[var(--bg-surface-hover)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'}
              `}
              style={{
                borderRadius: `${config.value}px`,
              }}
              onClick={() => handlePresetClick(key as keyof typeof RADIUS_PRESETS)}
            >
              <div className="absolute top-2 right-2">
                {isActive && (
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-[var(--theme-accent)] flex items-center justify-center"
                    style={{ borderRadius: '50%' }}
                  >
                    <Circle className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>

              {/* Preview shape */}
              <div
                className="h-12 w-full bg-[var(--theme-accent)]/20 mb-2"
                style={{ borderRadius: `${config.value}px` }}
              />

              <div className="text-[10px] font-medium text-[var(--text-primary)]">{config.label}</div>
              <div className="text-[9px] text-[var(--text-secondary)]">{config.description}</div>
              <div className="text-[9px] text-[var(--text-secondary)] mt-1 opacity-70">{config.value}px</div>
            </div>
          );
        })}
      </div>

      {/* Combined Preview */}
      <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div className="text-[10px] font-medium text-[var(--text-secondary)] mb-3">Live Preview</div>
        <div
          className="flex gap-2"
          style={{ borderRadius: `${radiusValue}px` }}
        >
          <button
            className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-xs font-medium hover-lift press-down"
            style={{ borderRadius: `${radiusValue}px` }}
          >
            Button
          </button>
          <div
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs"
            style={{ borderRadius: `${radiusValue}px` }}
          >
            Input field
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadiusControl;
