import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { hslToHex, hexToHsl } from '@/lib/colorUtils';

interface GradientConfig {
  enabled: boolean;
  startColor: string;
  endColor: string;
  angle: number;
  intensity: number;
}

interface GradientBuilderProps {
  config: GradientConfig;
  onChange: (config: GradientConfig) => void;
}

const GRADIENT_PRESETS = [
  { name: 'Midnight Aurora', start: '#000000', end: '#1a1a2e', angle: 135 },
  { name: 'Ocean Depths', start: '#0c1445', end: '#1a237e', angle: 180 },
  { name: 'Sunset Glow', start: '#1a1a1a', end: '#4a2c2a', angle: 135 },
  { name: 'Forest Mist', start: '#0d1b0d', end: '#1a3a1a', angle: 135 },
  { name: 'Purple Haze', start: '#120a1a', end: '#2d1b4e', angle: 150 },
  { name: 'Ocean Breeze', start: '#0a1628', end: '#0f3460', angle: 180 },
  { name: 'Warm Ember', start: '#1a0a0a', end: '#3d1a1a', angle: 135 },
  { name: 'Cool Slate', start: '#1a1a1a', end: '#2d3748', angle: 135 },
  { name: 'Deep Space', start: '#000000', end: '#0a0a1a', angle: 135 },
  { name: 'Aurora Borealis', start: '#051414', end: '#1a3a3a', angle: 135 },
];

const GradientBuilder: React.FC<GradientBuilderProps> = ({ config, onChange }) => {
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const handleColorChange = (field: 'startColor' | 'endColor', value: string) => {
    setActivePreset(null);
    onChange({ ...config, [field]: value });
  };

  const handleAngleChange = (value: number) => {
    setActivePreset(null);
    onChange({ ...config, angle: value });
  };

  const handleIntensityChange = (value: number) => {
    setActivePreset(null);
    onChange({ ...config, intensity: value });
  };

  const handlePresetClick = (preset: typeof GRADIENT_PRESETS[0], index: number) => {
    setActivePreset(index);
    onChange({
      ...config,
      startColor: preset.start,
      endColor: preset.end,
      angle: preset.angle,
    });
  };

  const toggleEnabled = () => {
    onChange({ ...config, enabled: !config.enabled });
  };

  const gradientString = config.enabled
    ? `linear-gradient(${config.angle}deg, ${config.startColor} 0%, ${config.endColor} 100%)`
    : config.startColor;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--theme-accent)]" />
          <label className="text-xs font-medium text-[var(--text-primary)]">Gradient Background</label>
        </div>
        <button
          onClick={toggleEnabled}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${config.enabled ? 'bg-[var(--theme-accent)]' : 'bg-[var(--border-subtle)]'}
          `}
        >
          <span
            className={`
              absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
              ${config.enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Color Pickers */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 block">Start Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.startColor}
                    onChange={(e) => handleColorChange('startColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-[var(--border-subtle)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.startColor}
                    onChange={(e) => handleColorChange('startColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 block">End Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.endColor}
                    onChange={(e) => handleColorChange('endColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-[var(--border-subtle)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.endColor}
                    onChange={(e) => handleColorChange('endColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Angle Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
              <span>Angle</span>
              <span>{config.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={config.angle}
              onChange={(e) => handleAngleChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Intensity Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
              <span>Intensity</span>
              <span>{config.intensity}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={config.intensity}
              onChange={(e) => handleIntensityChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Preset Gradients */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-[var(--text-secondary)] block">Preset Gradients</label>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENT_PRESETS.map((preset, index) => {
                const presetGradient = `linear-gradient(${preset.angle}deg, ${preset.start} 0%, ${preset.end} 100%)`;
                const isActive = activePreset === index;

                return (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset, index)}
                    className={`
                      aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95
                      ${isActive ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]/20' : 'border-[var(--border-subtle)] hover:border-[var(--border-primary)]'}
                    `}
                    style={{ background: presetGradient }}
                    title={preset.name}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      <div
        className="w-full h-16 rounded-lg border border-[var(--border-subtle)] transition-all duration-300"
        style={{ background: gradientString }}
      />
    </div>
  );
};

export default GradientBuilder;
export type { GradientConfig };
