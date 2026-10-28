export const analyzePosterPalette = async (imageUrl: string): Promise<number[][] | null> => {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;
      img.onload = () => {
        // Simple fallback canvas-based color extraction to avoid colorthief type mismatch
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        const colors: number[][] = [];
        for (let i = 0; i < data.length; i += 400) {
          colors.push([data[i], data[i + 1], data[i + 2]]);
        }
        resolve(colors.slice(0, 5));
      };
      img.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error("Failed to analyze palette", error);
    return null;
  }
};
