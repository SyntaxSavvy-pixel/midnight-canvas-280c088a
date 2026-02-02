/**
 * Color Utility Functions for Theme System
 * Handles color conversions, brightness calculations, and harmony generation
 */

/**
 * Convert HSL to HEX
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Convert HEX to HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Calculate color brightness (0-255)
 */
export function getBrightness(hex: string): number {
  const { h, s, l } = hexToHsl(hex);
  return (l / 100) * 255;
}

/**
 * Determine if color is light or dark
 */
export function isLightColor(hex: string): boolean {
  const brightness = getBrightness(hex);
  return brightness > 128;
}

/**
 * Get contrasting text color (black or white) based on background
 */
export function getContrastTextColor(backgroundColor: string): string {
  const brightness = getBrightness(backgroundColor);
  return brightness > 128 ? '#000000' : '#ffffff';
}

/**
 * Generate complementary color
 */
export function getComplementaryColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + 180) % 360, s, l);
}

/**
 * Generate analogous color (30° shift)
 */
export function getAnalogousColor(hex: string, shift: number = 30): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + shift) % 360, s, l);
}

/**
 * Generate triadic colors (120° apart)
 */
export function getTriadicColors(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex);
  return [
    hslToHex(h, s, l),
    hslToHex((h + 120) % 360, s, l),
    hslToHex((h + 240) % 360, s, l),
  ];
}

/**
 * Adjust color lightness
 */
export function adjustLightness(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + amount)));
}

/**
 * Adjust color saturation
 */
export function adjustSaturation(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, Math.max(0, Math.min(100, s + amount)), l);
}

/**
 * Generate a color palette from base color
 */
export function generatePalette(hex: string): {
  primary: string;
  lighter: string;
  darker: string;
  complementary: string;
  analogous: string;
} {
  return {
    primary: hex,
    lighter: adjustLightness(hex, 20),
    darker: adjustLightness(hex, -20),
    complementary: getComplementaryColor(hex),
    analogous: getAnalogousColor(hex),
  };
}

/**
 * Calculate contrast ratio (WCAG)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance
 */
export function getLuminance(hex: string): number {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }

  const toLinear = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Check if color meets WCAG AA contrast (4.5:1 for normal text)
 */
export function meetsWCAG_AA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if color meets WCAG AAA contrast (7:1 for normal text)
 */
export function meetsWCAG_AAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7.0;
}

/**
 * Suggest text color that meets WCAG AA
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  const whiteContrast = getContrastRatio('#ffffff', backgroundColor);
  const blackContrast = getContrastRatio('#000000', backgroundColor);

  if (whiteContrast >= 4.5 && whiteContrast > blackContrast) {
    return '#ffffff';
  } else if (blackContrast >= 4.5) {
    return '#000000';
  }

  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}

/**
 * Adjust hex color with alpha
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  if (hex.length === 4) {
    const r = hex[1] + hex[1];
    const g = hex[2] + hex[2];
    const b = hex[3] + hex[3];
    return `#${r}${g}${b}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  } else if (hex.length === 7) {
    return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  }
  return hex;
}

/**
 * Generate a gradient string
 */
export function generateGradient(
  startColor: string,
  endColor: string,
  angle: number = 135
): string {
  return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`;
}

/**
 * Generate radial gradient string
 */
export function generateRadialGradient(
  color: string,
  opacity: number = 0.15
): string {
  return `radial-gradient(ellipse at center, ${hexWithAlpha(color, opacity)} 0%, transparent 70%)`;
}

/**
 * Calculate shadow color with opacity
 */
export function getShadowColor(hex: string, opacity: number = 0.5): string {
  return hexWithAlpha(hex, opacity);
}
