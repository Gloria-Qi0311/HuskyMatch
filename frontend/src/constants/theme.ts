/**
 * HuskyMatch theme tokens — brand palette plus light/dark semantic colors,
 * spacing, and fonts. Derived from the v2 design.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Raw brand palette (HuskyMatch v2 design). */
export const Brand = {
  violet50: '#F6F5FE',
  violet100: '#EDEBFC',
  violet500: '#6D5DE7', // primary
  violet600: '#5848C9',
  violet700: '#4736A8',
  coral: '#FF8A5C', // accent
  coralSoft: '#FFE9DF',
  green: '#3FB984', // "interested" / positive
  greenSoft: '#E3F6EE',
} as const;

export const Colors = {
  light: {
    text: '#1B1B1F',
    background: '#FFFFFF',
    backgroundElement: '#F4F3FB',
    backgroundSelected: '#EDEBFC',
    textSecondary: '#6B6B76',
    tint: Brand.violet500,
    accent: Brand.coral,
    border: '#E6E5EE',
  },
  dark: {
    text: '#F4F3FB',
    background: '#121117',
    backgroundElement: '#1E1D26',
    backgroundSelected: '#2A2833',
    textSecondary: '#A6A5B0',
    tint: Brand.violet500,
    accent: Brand.coral,
    border: '#2E2C38',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
