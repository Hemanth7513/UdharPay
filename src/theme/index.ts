// UdharPay Design System
// Warm, premium palette — saffron primary, deep navy background, cream surface

export const Colors = {
  // Primary — Saffron
  primary: '#E8722A',
  primaryLight: '#F59A5A',
  primaryDark: '#C45A18',
  primaryMuted: '#FDF0E8',

  // Background — Deep Navy / Off-black
  background: '#0F1219',
  backgroundCard: '#171C27',
  backgroundElevated: '#1E2535',

  // Surface — Warm Cream (for cards, modals)
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F0',

  // Semantic
  success: '#27AE60',
  successLight: '#E8F8F0',
  warning: '#F2994A',
  warningLight: '#FEF3E8',
  danger: '#EB5757',
  dangerLight: '#FDEAEA',
  info: '#2F80ED',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9BA3B8',
  textMuted: '#5C657A',
  textInverse: '#0F1219',
  textDark: '#1A1F2E',

  // Status colors
  statusUnpaid: '#EB5757',
  statusPaid: '#27AE60',
  statusPartial: '#F2994A',
  statusDisputed: '#9B51E0',
  statusWrittenOff: '#9BA3B8',
  statusPaused: '#2F80ED',

  // Borders
  borderLight: 'rgba(255,255,255,0.08)',
  borderMedium: 'rgba(255,255,255,0.14)',

  // Overlay
  overlay: 'rgba(0,0,0,0.6)',

  // Gradient stops
  gradientStart: '#E8722A',
  gradientEnd: '#C45A18',
};

export const Typography = {
  // Font families
  heading: 'Poppins_600SemiBold',
  headingBold: 'Poppins_700Bold',
  body: 'Inter_400Regular',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  // Font sizes
  size: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
    hero: 52,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
  '5xl': 72,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#E8722A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadows: Shadows,
};

export type ThemeType = typeof Theme;
