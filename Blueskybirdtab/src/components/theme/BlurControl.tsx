import { Droplet, Droplets } from 'lucide-react';

interface BlurControlProps {
  blur: 'none' | 'low' | 'high';
  blurValue: number;
  onChange: (blur: 'none' | 'low' | 'high', blurValue: number) => void;
}

const BLUR_PRESETS = {
  none: { value: 0, label: 'None', description: 'No blur effect' },
  low: { value: 8, label: 'Subtle', description: 'Light blur' },
  high: { value: 24, label: 'Standard', description: 'Balanced blur' },
};

const BlurControl: React.FC<BlurControlProps> = ({ blur, blurValue, onChange }) => {
  const handlePresetClick = (preset: keyof typeof BLUR_PRESETS) => {
    onChange(preset, BLUR_PRESETS[preset].value);
  };

  const handleSliderChange = (value: number) => {
    // Find closest preset
    const presets = Object.keys(BLUR_PRESETS) as Array<keyof typeof BLUR_PRESETS>;
    let closest = presets[0];
    let closestDiff = Math.abs(value - BLUR_PRESETS[closest].value);

    for (const preset of presets) {
      const diff = Math.abs(value - BLUR_PRESETS[preset].value);
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
        {Object.entries(BLUR_PRESETS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key as keyof typeof BLUR_PRESETS)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-[11px] font-medium transition-all duration-200 flex flex-col items-center gap-1
              ${blur === key
                ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }
            `}
          >
            {key === 'none' && <Droplet className="w-3.5 h-3.5" />}
            {key !== 'none' && <Droplets className={`w-3.5 h-3.5 ${blur === key ? 'text-[var(--theme-accent)]' : ''}`} />}
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Blur Intensity</span>
          <span>{blurValue}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="48"
          value={blurValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Preview Cards */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(BLUR_PRESETS).map(([key, config]) => {
          const isActive = blur === key;

          return (
            <div
              key={key}
              className={`
                relative p-3 rounded-xl border-2 transition-all cursor-pointer
                ${isActive ? 'border-[var(--theme-accent)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'}
              `}
              style={{
                background: config.value === 0
                  ? 'rgba(255, 255, 255, 0.05)'
                  : `rgba(255, 255, 255, 0.85)`,
                backdropFilter: config.value === 0 ? 'none' : `blur(${config.value}px)`,
              }}
              onClick={() => handlePresetClick(key as keyof typeof BLUR_PRESETS)}
            >
              <div className="absolute top-2 right-2">
                {isActive && <Droplets className="w-3.5 h-3.5 text-[var(--theme-accent)]" />}
              </div>
              <div className="text-[10px] font-medium text-[var(--text-primary)] mb-1">{config.label}</div>
              <div className="text-[9px] text-[var(--text-secondary)]">{config.description}</div>
              <div className="text-[9px] text-[var(--text-secondary)] mt-1 opacity-70">{config.value}px</div>

              {/* Background pattern to show blur */}
              <div
                className="mt-2 h-8 rounded bg-[repeating-linear-gradient(45deg,_#444_0,_#444_1px,_#555_0,_#555_2px)] opacity-30"
                style={{ backdropFilter: 'none' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BlurControl;
