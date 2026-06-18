export const colors = {
  // Backgrounds
  background: '#07111f',
  panel: '#0e1b2d',

  // Text
  text: '#eef7ff',
  muted: '#a8bdd4',

  // Accents
  cyan: '#22d3ee',
  blue: '#60a5fa',
  green: '#34d399',
  yellow: '#facc15',
  red: '#fb7185',

  // Semantic
  primary: '#22d3ee',
  secondary: '#60a5fa',
  success: '#34d399',
  warning: '#facc15',
  danger: '#fb7185',

  // Score colors
  scoreHigh: '#34d399',   // >= 75
  scoreMed: '#facc15',    // 50-74
  scoreLow: '#fb7185',    // < 50

  // Border
  border: '#1e3048',
  borderLight: '#2a4060',

  // Overlay
  overlay: 'rgba(7, 17, 31, 0.85)',
} as const;

export type ColorKey = keyof typeof colors;
