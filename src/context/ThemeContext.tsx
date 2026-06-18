import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme, type ColorSchemeName } from 'react-native';
import { darkColors, getColors, type ColorPalette } from '../theme/colors';
import { radii, spacing, typography } from '../theme/index';

type ThemeContextValue = {
  colors: ColorPalette;
  colorScheme: ColorSchemeName;
  isDark: boolean;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(scheme: ColorSchemeName): boolean {
  return scheme !== 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(
    systemScheme ?? Appearance.getColorScheme() ?? 'dark',
  );

  useEffect(() => {
    setColorScheme(systemScheme ?? Appearance.getColorScheme() ?? 'dark');
  }, [systemScheme]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: next }) => {
      setColorScheme(next ?? 'dark');
    });

    return () => subscription.remove();
  }, []);

  const isDark = resolveIsDark(colorScheme);
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const value = useMemo(
    () => ({
      colors,
      colorScheme,
      isDark,
      spacing,
      radii,
      typography,
    }),
    [colors, colorScheme, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      colors: darkColors,
      colorScheme: 'dark',
      isDark: true,
      spacing,
      radii,
      typography,
    };
  }

  return context;
}
