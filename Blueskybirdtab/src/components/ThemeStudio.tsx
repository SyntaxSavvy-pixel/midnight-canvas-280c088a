import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, RefreshCcw, Monitor, Moon, Sun, Layers, Palette, Layout, Grid } from 'lucide-react';
import { useTheme, ThemePresetId } from '@/contexts/ThemeContext';
import ColorWheel from './theme/ColorWheel';
import PresetColors from './theme/PresetColors';
import GradientBuilder from './theme/GradientBuilder';
import ShadowControl from './theme/ShadowControl';
import SpacingControl from './theme/SpacingControl';
import BlurControl from './theme/BlurControl';
import RadiusControl from './theme/RadiusControl';
import GlassEffects from './theme/GlassEffects';
import BackgroundPicker from './theme/BackgroundPicker';
import ThemePreviewPane from './theme/ThemePreviewPane';

type StudioTab = 'presets' | 'colors' | 'design' | 'homepage';

const ThemeStudio = () => {
  const { settings, updateSettings, applyPreset, resetTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('presets');
  const [showPreview, setShowPreview] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const presets: { id: ThemePresetId; label: string; icon: any; color: string }[] = [
    { id: 'midnight', label: 'Midnight', icon: Moon, color: '#000000' },
    { id: 'orca', label: 'Orca', icon: Monitor, color: '#0f0f16' },
    { id: 'nebula', label: 'Nebula', icon: Sparkles, color: '#12081c' },
    { id: 'dawn', label: 'Dawn', icon: Sun, color: '#fafafa' },
    { id: 'aurora', label: 'Aurora', icon: Sparkles, color: '#051414' },
  ];

  const tabs = [
    { id: 'presets' as StudioTab, label: 'Presets', icon: Palette },
    { id: 'colors' as StudioTab, label: 'Colors', icon: Palette },
    { id: 'design' as StudioTab, label: 'Design', icon: Layout },
    { id: 'homepage' as StudioTab, label: 'Homepage', icon: Sun },
  ];

  const handleAccentChange = (color: string) => {
    updateSettings({
      colors: {
        ...settings.colors,
        accent: color,
        accentHover: color,
      },
    });
  };

  const handleHomepageChange = (updates: BackgroundPicker['propTypes']['onChange']['_arg0'][0]) => {
    updateSettings({
      homepage: {
        ...settings.homepage,
        ...updates,
      },
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative w-10 h-10 rounded-xl
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen ? 'bg-[var(--theme-accent)] text-black rotate-90' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'}
          border border-[var(--border-subtle)]
        `}
        title="Theme Studio"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {/* Pop-up Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 bg-[var(--bg-surface)] backdrop-blur-3xl border border-[var(--border-primary)] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 z-[100]" style={{ width: '900px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[var(--theme-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Theme Studio</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                title="Toggle Preview"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={resetTheme}
                className="p-2 rounded-lg hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Reset to Default"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Controls */}
            <div className="flex-1 overflow-y-auto">
              {/* Tabs */}
              <div className="flex bg-[var(--bg-background)] border-b border-[var(--border-subtle)] px-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 py-3 px-4 text-[11px] font-medium transition-all duration-200 flex items-center gap-2 border-b-2
                      ${activeTab === tab.id
                        ? 'text-[var(--text-primary)] border-[var(--theme-accent)]'
                        : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                      }
                    `}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Presets Tab */}
                {activeTab === 'presets' && (
                  <div className="space-y-6">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 block">Theme Presets</label>
                    <div className="grid grid-cols-5 gap-3">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className={`
                            flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover-lift
                            ${settings.presetId === preset.id
                              ? 'bg-[var(--bg-surface-hover)] border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]/20'
                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-primary)]'
                            }
                          `}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: preset.color }}
                          >
                            <preset.icon className={`w-5 h-5 ${preset.id === 'dawn' ? 'text-black' : 'text-white'}`} />
                          </div>
                          <span className="text-[11px] font-medium text-[var(--text-primary)]">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 block">Accent Color</label>
                      <PresetColors activeColor={settings.colors.accent} onChange={handleAccentChange} />
                    </div>

                    <div className="h-[1px] bg-[var(--border-subtle)] my-4" />

                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 block">Custom Color</label>
                      <ColorWheel color={settings.colors.accent} onChange={handleAccentChange} />
                    </div>
                  </div>
                )}

                {/* Design Tab */}
                {activeTab === 'design' && (
                  <div className="space-y-6">
                    {/* Shadows */}
                    <ShadowControl
                      shadow={settings.shadow}
                      shadowValue={settings.shadowValue}
                      onChange={(shadow, shadowValue) => updateSettings({ shadow, shadowValue })}
                    />

                    <div className="h-[1px] bg-[var(--border-subtle)]" />

                    {/* Spacing */}
                    <SpacingControl
                      spacing={settings.spacing}
                      spacingValue={settings.spacingValue}
                      onChange={(spacing, spacingValue) => updateSettings({ spacing, spacingValue })}
                    />

                    <div className="h-[1px] bg-[var(--border-subtle)]" />

                    {/* Blur */}
                    <BlurControl
                      blur={settings.blur}
                      blurValue={settings.blurValue}
                      onChange={(blur, blurValue) => updateSettings({ blur, blurValue })}
                    />

                    <div className="h-[1px] bg-[var(--border-subtle)]" />

                    {/* Radius */}
                    <RadiusControl
                      radius={settings.radius}
                      radiusValue={settings.radiusValue}
                      onChange={(radius, radiusValue) => updateSettings({ radius, radiusValue })}
                    />

                    <div className="h-[1px] bg-[var(--border-subtle)]" />

                    {/* Glass Effects */}
                    <GlassEffects
                      glass={settings.glass}
                      onChange={(glass) => updateSettings({ glass })}
                    />
                  </div>
                )}

                {/* Homepage Tab */}
                {activeTab === 'homepage' && (
                  <div className="space-y-6">
                    <BackgroundPicker
                      background={settings.homepage.background}
                      gradient={settings.homepage.gradient}
                      pattern={settings.homepage.pattern}
                      brightness={settings.homepage.brightness}
                      onChange={handleHomepageChange}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Preview */}
            {showPreview && (
              <div className="w-96 border-l border-[var(--border-subtle)] overflow-y-auto">
                <div className="p-6 h-full">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Live Preview</div>
                  <ThemePreviewPane />
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default ThemeStudio;
