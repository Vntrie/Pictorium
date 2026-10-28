/**
 * PosterClient
 * Bridge between V2 Cinematic UI and the V1 Core Engine API
 */

export interface PosterConfig {
  type: 'movie' | 'series';
  id: string;
  params?: Record<string, string>;
}

export const getPosterUrl = ({ type, id, params }: PosterConfig): string => {
  const baseUrl = `/api/poster/${type}/${id}`;
  if (!params) return baseUrl;

  const queryString = new URLSearchParams(params).toString();
  return `${baseUrl}?${queryString}`;
};
