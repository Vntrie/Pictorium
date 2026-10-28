import { getPalette } from 'colorthief';

export const analyzePosterPalette = async (imageUrl: string) => {
  try {
    // In a real browser environment, ColorThief works on image elements.
    // For this bridge, we assume the client component handles the image loading.
    // This helper provides the logic for the "Reverse Engineer" feature.
    return await getPalette(imageUrl, 5);
  } catch (error) {
    console.error("Failed to analyze palette", error);
    return null;
  }
};
