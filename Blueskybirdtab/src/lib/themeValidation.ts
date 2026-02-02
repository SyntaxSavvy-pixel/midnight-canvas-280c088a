/**
 * Theme Validation and Smart Constraints
 * Ensures themes always look polished and accessible
 */

import {
  meetsWCAG_AA,
  meetsWCAG_AAA,
  getContrastRatio,
  hexToHsl,
  adjustLightness,
  isLightColor,
} from './colorUtils';

export interface ThemeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate opacity value
 */
export function validateOpacity(value: number, min: number = 0, max: number = 1): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value < min) {
    errors.push({
      field: 'opacity',
      message: `Opacity must be at least ${min}`,
      severity: 'error',
    });
  }

  if (value > max) {
    errors.push({
      field: 'opacity',
      message: `Opacity must be at most ${max}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate border radius
 */
export function validateRadius(value: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value < 0) {
    errors.push({
      field: 'radius',
      message: 'Radius cannot be negative',
      severity: 'error',
    });
  }

  if (value > 32) {
    errors.push({
      field: 'radius',
      message: 'Radius exceeds maximum of 32px',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate blur intensity
 */
export function validateBlur(value: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value < 0) {
    errors.push({
      field: 'blur',
      message: 'Blur cannot be negative',
      severity: 'error',
    });
  }

  if (value > 48) {
    errors.push({
      field: 'blur',
      message: 'Blur exceeds maximum of 48px',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate spacing value
 */
export function validateSpacing(value: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value < 4) {
    errors.push({
      field: 'spacing',
      message: 'Spacing must be at least 4px',
      severity: 'warning',
    });
  }

  if (value > 24) {
    errors.push({
      field: 'spacing',
      message: 'Spacing exceeds recommended maximum of 24px',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate shadow darkness
 */
export function validateShadow(color: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { l } = hexToHsl(color);

  if (l < 5) {
    warnings.push({
      field: 'shadow',
      message: 'Shadow color is very dark, may be too harsh',
      suggestion: 'Increase lightness to at least 10%',
    });
  }

  if (l > 50) {
    warnings.push({
      field: 'shadow',
      message: 'Shadow color is too light for visibility',
      suggestion: 'Decrease lightness to below 30%',
    });
  }

  return warnings;
}

/**
 * Validate color contrast between text and background
 */
export function validateColorContrast(
  textColor: string,
  backgroundColor: string
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const ratio = getContrastRatio(textColor, backgroundColor);

  if (!meetsWCAG_AA(textColor, backgroundColor)) {
    warnings.push({
      field: 'contrast',
      message: `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA (4.5:1)`,
      suggestion: 'Increase contrast by adjusting text or background color',
    });
  } else if (!meetsWCAG_AAA(textColor, backgroundColor)) {
    warnings.push({
      field: 'contrast',
      message: `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AAA (7:1)`,
      suggestion: 'For better accessibility, increase contrast further',
    });
  }

  return warnings;
}

/**
 * Suggest text color based on background
 */
export function suggestTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

/**
 * Suggest border color based on background
 */
export function suggestBorderColor(backgroundColor: string): string {
  const { h, s, l } = hexToHsl(backgroundColor);

  if (l > 90) {
    // Light background - dark border
    return adjustLightness(backgroundColor, -30);
  } else if (l < 10) {
    // Dark background - light border
    return adjustLightness(backgroundColor, 30);
  } else {
    // Medium - slight adjustment
    const adjustment = l > 50 ? -15 : 15;
    return adjustLightness(backgroundColor, adjustment);
  }
}

/**
 * Suggest surface color based on background
 */
export function suggestSurfaceColor(backgroundColor: string): string {
  const { l } = hexToHsl(backgroundColor);

  if (l > 90) {
    // Light background - darker surface
    return adjustLightness(backgroundColor, -5);
  } else if (l < 10) {
    // Dark background - lighter surface
    return adjustLightness(backgroundColor, 5);
  } else {
    // Medium - slight adjustment
    const adjustment = l > 50 ? -2 : 2;
    return adjustLightness(backgroundColor, adjustment);
  }
}

/**
 * Validate entire theme color palette
 */
export function validateColorPalette(colors: {
  background: string;
  sidebar: string;
  surface: string;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}): ThemeValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check text-primary vs background contrast
  const textBgContrast = validateColorContrast(colors.textPrimary, colors.background);
  warnings.push(...textBgContrast);

  // Check text-primary vs surface contrast
  const textSurfaceContrast = validateColorContrast(colors.textPrimary, colors.surface);
  warnings.push(...textSurfaceContrast);

  // Check text-secondary vs background contrast
  const secondaryBgContrast = validateColorContrast(colors.textSecondary, colors.background);
  warnings.push(...secondaryBgContrast);

  // Check accent contrast
  const accentBgContrast = validateColorContrast(colors.accent, colors.surface);
  if (accentBgContrast.length > 0) {
    warnings.push({
      field: 'accent',
      message: 'Accent color may not be visible on surface',
      suggestion: 'Try a lighter or darker accent color',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Auto-fix common color issues
 */
export function autoFixColors(colors: {
  background: string;
  textPrimary: string;
  textSecondary: string;
}): {
  textPrimary: string;
  textSecondary: string;
} {
  const fixedColors = {
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
  };

  // Fix primary text contrast
  if (!meetsWCAG_AA(colors.textPrimary, colors.background)) {
    fixedColors.textPrimary = suggestTextColor(colors.background);
  }

  // Fix secondary text contrast (can be slightly lower)
  const secondaryContrast = getContrastRatio(colors.textSecondary, colors.background);
  if (secondaryContrast < 3.5) {
    const { l } = hexToHsl(suggestTextColor(colors.background));
    const fixedSecondary = hexToHsl(colors.textSecondary);
    fixedColors.textSecondary = `hsl(${fixedSecondary.h}, ${fixedSecondary.s}%, ${l}%)`;
  }

  return fixedColors;
}

/**
 * Suggest complementary accent color based on theme
 */
export function suggestAccentColor(
  background: string,
  isDark: boolean = true
): string {
  if (isDark) {
    // Dark themes work well with vibrant, light accents
    return '#3b82f6'; // Default blue
  } else {
    // Light themes work with rich, deep accents
    return '#0ea5e9'; // Default sky blue
  }
}

/**
 * Validate animation duration
 */
export function validateAnimationDuration(value: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value < 100) {
    errors.push({
      field: 'animationDuration',
      message: 'Animation duration is too fast (<100ms)',
      severity: 'warning',
    });
  }

  if (value > 2000) {
    errors.push({
      field: 'animationDuration',
      message: 'Animation duration is too slow (>2000ms)',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Check if theme follows dark/light conventions
 */
export function detectThemeType(colors: {
  background: string;
  sidebar: string;
  surface: string;
}): 'dark' | 'light' | 'mixed' {
  const bgLightness = hexToHsl(colors.background).l;

  if (bgLightness < 50) return 'dark';
  if (bgLightness > 50) return 'light';
  return 'mixed';
}

/**
 * Suggest preset level for a given value
 */
export function suggestPresetLevel(
  value: number,
  presetMap: Record<string, number>
): string {
  const keys = Object.keys(presetMap);
  let closest = keys[0];
  let closestDiff = Math.abs(value - presetMap[closest]);

  for (const key of keys) {
    const diff = Math.abs(value - presetMap[key]);
    if (diff < closestDiff) {
      closest = key;
      closestDiff = diff;
    }
  }

  return closest;
}

/**
 * Validate theme settings comprehensively
 */
export function validateTheme(settings: any): ThemeValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate colors
  if (settings.colors) {
    const colorValidation = validateColorPalette(settings.colors);
    errors.push(...colorValidation.errors);
    warnings.push(...colorValidation.warnings);
  }

  // Validate spacing
  if (typeof settings.spacing === 'number') {
    errors.push(...validateSpacing(settings.spacing));
  }

  // Validate radius
  if (typeof settings.radius === 'number') {
    errors.push(...validateRadius(settings.radius));
  }

  // Validate blur
  if (typeof settings.blur === 'number') {
    errors.push(...validateBlur(settings.blur));
  }

  // Validate glass opacity
  if (settings.glass?.opacity !== undefined) {
    errors.push(...validateOpacity(settings.glass.opacity, 0.6, 0.98));
  }

  // Validate glass border opacity
  if (settings.glass?.borderOpacity !== undefined) {
    errors.push(...validateOpacity(settings.glass.borderOpacity, 0, 1));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
