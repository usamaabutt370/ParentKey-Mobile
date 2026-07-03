export type ColorPalette = {
  background: {
    primary: string;
    secondary: string;
    accent: string;
    accentStrong: string;
  };
  text: {
    primary: string;
    secondary: string;
    placeholder: string;
    brand: string;
  };
  brand: {
    teal: string;
    tealLight: string;
    tealDark: string;
  };
  button: {
    gradientStart: string;
    gradientEnd: string;
    primary: string;
    glow: string;
    text: string;
  };
  input: {
    background: string;
    border: string;
    focusBorder: string;
    text: string;
    shadow: string;
  };
  border: {
    default: string;
    strong: string;
  };
  error: string;
  success: string;
};

export const darkColors: ColorPalette = {
  background: {
    primary: '#050A14',
    secondary: 'rgba(8, 145, 178, 0.17)',
    accent: 'rgba(20, 184, 166, 0.24)',
    accentStrong: 'rgba(20, 184, 166, 0.42)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    placeholder: '#64748B',
    brand: '#2DD4BF',
  },
  brand: {
    teal: '#14B8A6',
    tealLight: '#2DD4BF',
    tealDark: '#0D9488',
  },
  button: {
    gradientStart: '#10B981',
    gradientEnd: '#0891B2',
    primary: '#14B8A6',
    glow: 'rgba(20, 184, 166, 0.5)',
    text: '#FFFFFF',
  },
  input: {
    background: 'rgba(15, 23, 42, 0.72)',
    border: 'rgba(148, 163, 184, 0.30)',
    focusBorder: '#14B8A6',
    text: '#F8FAFC',
    shadow: '#000000',
  },
  border: {
    default: 'rgba(148, 163, 184, 0.24)',
    strong: 'rgba(148, 163, 184, 0.40)',
  },
  error: '#F87171',
  success: '#34D399',
};

export const lightColors: ColorPalette = {
  background: {
    primary: '#ECFEFF',
    secondary: 'rgba(16, 185, 129, 0.22)',
    accent: 'rgba(8, 145, 178, 0.3)',
    accentStrong: 'rgba(20, 184, 166, 0.42)',
  },
  text: {
    primary: '#000000',
    secondary: '#000000',
    placeholder: '#94A3B8',
    brand: '#0D9488',
  },
  brand: {
    teal: '#14B8A6',
    tealLight: '#0D9488',
    tealDark: '#0F766E',
  },
  button: {
    gradientStart: '#10B981',
    gradientEnd: '#0891B2',
    primary: '#14B8A6',
    glow: 'rgba(20, 184, 166, 0.3)',
    text: '#FFFFFF',
  },
  input: {
    background: '#FFFFFF',
    border: 'rgba(148, 163, 184, 0.9)',
    focusBorder: '#14B8A6',
    text: '#0F172A',
    shadow: 'rgba(13, 148, 136, 0.45)',
  },
  border: {
    default: 'rgba(148, 163, 184, 0.35)',
    strong: 'rgba(100, 116, 139, 0.5)',
  },
  error: '#DC2626',
  success: '#059669',
};

/** @deprecated Use `useTheme().colors` for theme-aware colors. */
export const colors = darkColors;

export function getColors(isDark: boolean): ColorPalette {
  return isDark ? darkColors : lightColors;
}
