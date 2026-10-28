/**
 * Palette mapping logic
 * Maps color palettes to FlameForge rendering parameters.
 */

export const getAestheticParams = (palette: number[][]) => {
  if (!palette || palette.length === 0) return {};

  // Simple heuristic: map dominant colors to accent settings
  const primary = palette[0];
  const accentHex = `#${((1 << 24) + (primary[0] << 16) + (primary[1] << 8) + primary[2]).toString(16).slice(1)}`;

  return {
    tintColor: accentHex,
    badgeStyle: 'glass', // Cinematic feel
    gradientHeight: '75', // Deeper gradient for drama
  };
};
