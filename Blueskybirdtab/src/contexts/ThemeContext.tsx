import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemePresetId = 'midnight' | 'orca' | 'nebula' | 'dawn' | 'aurora' | 'custom';
export type ThemeTexture = 'glass' | 'matte' | 'grain';
export type ThemeBlur = 'none' | 'low' | 'high';
export type ThemeFont = 'inter' | 'inter-tight' | 'roboto' | 'system' | 'mono';
export type ShadowPreset = 'soft' | 'medium' | 'deep';
export type SpacingPreset = 'compact' | 'comfortable' | 'spacious';
export type RadiusPreset = 'sharp' | 'subtle' | 'rounded' | 'pill' | 'full';

export interface GradientConfig {
  enabled: boolean;
  startColor: string;
  endColor: string;
  angle: number;
  intensity: number;
}

export interface GlassEffects {
  enabled: boolean;
  opacity: number;
  borderOpacity: number;
  noiseTexture: boolean;
}

export interface HomepageConfig {
  background: string;
  gradient: GradientConfig;
  pattern: string | null;
  brightness: number;
  logoSize: number;
}

export interface AnimationConfig {
  hoverDuration: number;
  transitionDuration: number;
  easing: string;
}

export interface ThemeColors {
  background: string;
  sidebar: string;
  surface: string;
  surfaceHover: string;
  borderPrimary: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
}

export interface ThemeSettings {
  presetId: ThemePresetId;
  colors: ThemeColors;
  texture: ThemeTexture;
  blur: ThemeBlur;
  blurValue: number;
  font: ThemeFont;
  radius: RadiusPreset;
  radiusValue: number;
  shadow: ShadowPreset;
  shadowValue: number;
  spacing: SpacingPreset;
  spacingValue: number;
  glass: GlassEffects;
  homepage: HomepageConfig;
  animations: AnimationConfig;
}

const PRESETS: Record<ThemePresetId, ThemeColors> = {
  midnight: {
    background: '#000000',
    sidebar: '#050508',
    surface: '#0a0a0e',
    surfaceHover: '#131319',
    borderPrimary: '#1f1f28',
    borderSubtle: '#ffffff08',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    accent: '#3b82f6',
    accentHover: '#60a5fa',
  },
  orca: {
    background: '#0a0a0f',
    sidebar: '#0f0f16',
    surface: '#161620',
    surfaceHover: '#1f1f2e',
    borderPrimary: '#2a2a3d',
    borderSubtle: '#ffffff0a',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    accent: '#f43f5e',
    accentHover: '#fb7185',
  },
  nebula: {
    background: '#080510',
    sidebar: '#0d081a',
    surface: '#150c28',
    surfaceHover: '#201238',
    borderPrimary: '#352058',
    borderSubtle: '#ffffff10',
    textPrimary: '#faf5ff',
    textSecondary: '#c4b5fd',
    accent: '#a855f7',
    accentHover: '#c084fc',
  },
  dawn: {
    background: '#fafafa',
    sidebar: '#f5f5f5',
    surface: '#ffffff',
    surfaceHover: '#f0f0f5',
    borderPrimary: '#e5e5eb',
    borderSubtle: '#00000006',
    textPrimary: '#1a1a1a',
    textSecondary: '#6b7280',
    accent: '#0ea5e9',
    accentHover: '#38bdf8',
  },
  aurora: {
    background: '#051414',
    sidebar: '#091f1f',
    surface: '#0d2a2a',
    surfaceHover: '#123737',
    borderPrimary: '#1a4a4a',
    borderSubtle: '#ffffff0a',
    textPrimary: '#ecfdf5',
    textSecondary: '#99f6e4',
    accent: '#10b981',
    accentHover: '#34d399',
  },
  custom: {
    background: '#000000',
    sidebar: '#050508',
    surface: '#0a0a0e',
    surfaceHover: '#131319',
    borderPrimary: '#1f1f28',
    borderSubtle: '#ffffff08',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    accent: '#3b82f6',
    accentHover: '#60a5fa',
  }
};

const DEFAULT_THEME: ThemeSettings = {
  presetId: 'midnight',
  colors: PRESETS.midnight,
  texture: 'glass',
  blur: 'high',
  blurValue: 24,
  font: 'inter-tight',
  radius: 'rounded',
  radiusValue: 8,
  shadow: 'medium',
  shadowValue: 24,
  spacing: 'comfortable',
  spacingValue: 12,
  glass: {
    enabled: true,
    opacity: 0.85,
    borderOpacity: 0.12,
    noiseTexture: false,
  },
  homepage: {
    background: PRESETS.midnight.background,
    gradient: {
      enabled: false,
      startColor: PRESETS.midnight.background,
      endColor: PRESETS.midnight.surface,
      angle: 135,
      intensity: 15,
    },
    pattern: null,
    brightness: 0,
    logoSize: 64,
  },
  animations: {
    hoverDuration: 200,
    transitionDuration: 700,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => void;
  applyPreset: (id: ThemePresetId) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('arc_theme_settings_v2');
    return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
  });

  useEffect(() => {
    const root = document.documentElement;
    const { colors, texture, blur, blurValue, font, radius, radiusValue, shadow, shadowValue, spacing, spacingValue, glass, homepage, animations } = settings;

    // 1. Color Variables
    root.style.setProperty('--bg-background', colors.background);
    root.style.setProperty('--bg-sidebar', colors.sidebar);
    root.style.setProperty('--bg-surface', colors.surface);
    root.style.setProperty('--bg-surface-hover', colors.surfaceHover);
    root.style.setProperty('--border-primary', colors.borderPrimary);
    root.style.setProperty('--border-subtle', colors.borderSubtle);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-accent-hover', colors.accentHover);

    // 2. Blur / Glass
    const blurValuePx = blur === 'none' ? '0px' : blur === 'low' ? '8px' : `${blurValue}px`;
    root.style.setProperty('--theme-blur', blurValuePx);
    root.style.setProperty('--theme-blur-value', `${blurValue}px`);

    const glassOpacity = texture === 'glass' ? '0.7' : texture === 'matte' ? '0.95' : '0.85';
    root.style.setProperty('--glass-opacity', glassOpacity);
    root.style.setProperty('--glass-enabled', glass.enabled ? '1' : '0');
    root.style.setProperty('--glass-surface-opacity', glass.opacity.toString());
    root.style.setProperty('--glass-border-opacity', glass.borderOpacity.toString());
    root.style.setProperty('--glass-noise', glass.noiseTexture ? '1' : '0');

    // 3. Typography
    const fontMap = {
      'inter': '"Inter", system-ui, sans-serif',
      'inter-tight': '"Inter Tight", "Inter", system-ui, sans-serif',
      'roboto': '"Roboto", system-ui, sans-serif',
      'system': 'system-ui, -apple-system, sans-serif',
      'mono': '"JetBrains Mono", "Fira Code", monospace'
    };
    root.style.setProperty('--theme-font', fontMap[font]);

    // 4. Radius
    const radiusMap = { sharp: '0px', subtle: '4px', rounded: '8px', pill: '16px', full: '24px' };
    root.style.setProperty('--theme-radius', radiusMap[radius]);
    root.style.setProperty('--theme-radius-value', `${radiusValue}px`);

    // 5. Shadow
    const shadowMap = { soft: 12, medium: 24, deep: 40 };
    root.style.setProperty('--theme-shadow', `${shadowMap[shadow]}px`);
    root.style.setProperty('--theme-shadow-value', `${shadowValue}px`);

    // 6. Spacing
    const spacingMap = { compact: 8, comfortable: 12, spacious: 16 };
    root.style.setProperty('--theme-spacing', `${spacingMap[spacing]}px`);
    root.style.setProperty('--theme-spacing-value', `${spacingValue}px`);

    // 7. Homepage
    root.style.setProperty('--homepage-background', homepage.background);
    if (homepage.gradient.enabled) {
      root.style.setProperty('--homepage-gradient', `linear-gradient(${homepage.gradient.angle}deg, ${homepage.gradient.startColor} 0%, ${homepage.gradient.endColor} 100%)`);
    } else {
      root.style.removeProperty('--homepage-gradient');
    }
    root.style.setProperty('--homepage-brightness', `${homepage.brightness}%`);
    root.style.setProperty('--homepage-logo-size', `${homepage.logoSize}px`);

    // 8. Animations
    root.style.setProperty('--hover-duration', `${animations.hoverDuration}ms`);
    root.style.setProperty('--transition-duration', `${animations.transitionDuration}ms`);
    root.style.setProperty('--theme-easing', animations.easing);

    localStorage.setItem('arc_theme_settings_v3', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<ThemeSettings>) => {
    setSettings(prev => {
      // If changing color manually, switch to custom preset automatically
      const isColorChange = updates.colors && JSON.stringify(updates.colors) !== JSON.stringify(prev.colors);
      return {
        ...prev,
        ...updates,
        presetId: isColorChange ? 'custom' : (updates.presetId || prev.presetId)
      };
    });
  };

  const applyPreset = (id: ThemePresetId) => {
    setSettings(prev => ({
      ...prev,
      presetId: id,
      colors: { ...PRESETS[id] } // Deep copy color values
    }));
  };

  const resetTheme = () => setSettings(DEFAULT_THEME);

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, applyPreset, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
