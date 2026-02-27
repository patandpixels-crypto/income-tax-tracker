// Design System - Modern Dark UI Theme
export const colors = {
  // Primary
  primary: '#00D66F', // Bright green for buttons and accents
  primaryDark: '#00B85C',
  primaryLight: '#00FF85',

  // Background - Dark Theme
  background: '#0A0E27', // Deep dark blue/black
  backgroundSecondary: '#131829', // Slightly lighter dark
  backgroundCard: '#1A1F3A', // Card background
  backgroundDark: '#0D1226', // Darker variant

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8B92B2',
  textTertiary: '#5A6080',
  textLight: '#E8EAED',

  // Status
  success: '#00D66F',
  warning: '#FFB800',
  error: '#FF4757',
  info: '#4C6EF5',

  // Tax categories
  taxable: '#00D66F', // Green
  exempt: '#4C6EF5', // Blue
  repayable: '#FFB800', // Yellow/Gold
  unclassified: '#8B92B2', // Gray

  // Cards & Surfaces
  cardBackground: '#1A1F3A',
  cardBorder: '#252B48',
  border: '#252B48',
  borderLight: '#2F3550',

  // Gradients
  gradientStart: '#0A0E27',
  gradientEnd: '#1A1F3A',
  accentGradientStart: '#00D66F',
  accentGradientEnd: '#00B85C',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
