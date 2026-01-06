
// Gradient Presets
export const Gradients = {
  primary: ['#22c55e', '#16a34a'],
  primaryLight: ['#4ade80', '#22c55e'],
  primarySoft: ['#dcfce7', '#bbf7d0'],
  sunset: ['#f97316', '#ea580c'],
  purple: ['#8b5cf6', '#7c3aed'],
  blue: ['#3b82f6', '#2563eb'],
  teal: ['#14b8a6', '#0d9488'],
  pink: ['#ec4899', '#db2777'],
  gold: ['#fbbf24', '#f59e0b'],
  dark: ['#334155', '#1e293b'],
  success: ['#10b981', '#059669'],
  authBackground: ['#f0fdf4', '#dcfce7', '#bbf7d0'],
};

// Animation timing constants
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 100,
  },
  springFast: {
    damping: 20,
    stiffness: 400,
  },
};

export const Colors = {
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',
  secondary: '#64748b',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  error: '#ef4444',
  errorLight: '#fecaca',
  warning: '#f59e0b',
  warningLight: '#fed7aa',
  success: '#10b981',
  successLight: '#d1fae5',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // App specific colors
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  }
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    color: Colors.text,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: Colors.text,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.text,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.text,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.text,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: Colors.textLight,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  }
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const Layout = {
  screenPadding: 16,
  headerHeight: 60,
  bottomTabHeight: 60,
  maxWidth: 420,
};

export const AppTheme = {
  Colors,
  Gradients,
  Animation,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
};

export default AppTheme;