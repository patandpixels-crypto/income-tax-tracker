// Design System - Modern UI Theme
export const colors = {
  // Primary
  primary: '#00D66F', // Bright green for buttons and accents
  primaryDark: '#00B85C',

  // Background
  background: '#F8F9FA',
  backgroundDark: '#1A1D29', // Dark navy for cards

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#FFFFFF',

  // Status
  success: '#00D66F',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#3B82F6',

  // Tax categories
  taxable: '#00D66F',
  nonTaxable: '#3B82F6',
  unclassified: '#F59E0B',

  // Cards & Surfaces
  cardBackground: '#FFFFFF',
  cardDark: '#1A1D29',
  border: '#E5E7EB',
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
