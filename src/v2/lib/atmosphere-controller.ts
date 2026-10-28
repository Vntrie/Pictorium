/**
 * Cinematic Atmosphere Controller
 * Connects reverse-engineered parameters to the actual rendering engine
 * (This would be used by a cinematic editor component).
 */

import { getPosterUrl } from "@/v2/lib/poster-client";

export const getAtmosphericPosterUrl = (
  type: 'movie' | 'series',
  id: string,
  aestheticParams: Record<string, string>
) => {
  // Merge aesthetic params with necessary engine defaults
  const params = {
    ...aestheticParams,
    // Ensure quality and style overrides from the cinematic vision
    blur: '1',
    quality: '4k'
  };

  return getPosterUrl({ type, id, params });
};
