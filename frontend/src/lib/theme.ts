type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

const DEFAULT_ACCENT_COLOR = '#dc2626';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string): Rgb | null => {
  const normalized = hex.trim();
  const match = normalized.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;

  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;

  if (max === red) {
    h = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    h = (blue - red) / delta + 2;
  } else {
    h = (red - green) / delta + 4;
  }

  return { h: h * 60, s, l };
};

const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const hueToRgb = (p: number, q: number, t: number) => {
    let next = t;
    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + (q - p) * 6 * next;
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
    return p;
  };

  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const normalizedHue = h / 360;
  return {
    r: Math.round(hueToRgb(p, q, normalizedHue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, normalizedHue) * 255),
    b: Math.round(hueToRgb(p, q, normalizedHue - 1 / 3) * 255),
  };
};

const rgbVarValue = ({ r, g, b }: Rgb) => `${r} ${g} ${b}`;

export const normalizeAccentColor = (value: unknown): string => {
  const normalized = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : DEFAULT_ACCENT_COLOR;
};

export const applyOrganizationTheme = (accentColor: unknown) => {
  if (typeof document === 'undefined') return;

  const color = normalizeAccentColor(accentColor);
  const rgb = hexToRgb(color) || hexToRgb(DEFAULT_ACCENT_COLOR)!;
  const hsl = rgbToHsl(rgb);
  const root = document.documentElement;

  const lightnessByShade: Record<string, number> = {
    50: 0.97,
    100: 0.92,
    200: 0.84,
    300: 0.74,
    400: 0.62,
    500: 0.52,
    600: clamp(hsl.l, 0.34, 0.46),
    700: 0.34,
    800: 0.26,
    900: 0.19,
    950: 0.11,
  };

  Object.entries(lightnessByShade).forEach(([shade, lightness]) => {
    const shadeRgb = hslToRgb({
      h: hsl.h,
      s: clamp(hsl.s, 0.42, 0.86),
      l: lightness,
    });
    root.style.setProperty(`--color-primary-${shade}`, rgbVarValue(shadeRgb));
  });

  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--color-primary-dim', `rgb(${rgbVarValue(rgb)} / 0.15)`);
};
