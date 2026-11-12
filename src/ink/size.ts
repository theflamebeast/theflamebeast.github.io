const MAX_PIXEL_RATIO = 2;

export function canvasSize(cssWidth: number, cssHeight: number, pixelRatio: number, maxPixels: number): [number, number] {
  const uncapped = Math.min(pixelRatio, MAX_PIXEL_RATIO);
  const capped = Math.sqrt(maxPixels / Math.max(1, cssWidth * cssHeight));
  const scale = Math.min(uncapped, capped);
  // Flooring under the cap keeps the product at or below it; rounding could step over.
  const fit = scale < uncapped ? Math.floor : Math.round;
  return [Math.max(2, fit(cssWidth * scale)), Math.max(2, fit(cssHeight * scale))];
}

export function gridSize(resolution: number, width: number, height: number): [number, number] {
  const short = Math.min(resolution, width, height);
  const long = Math.round((short * Math.max(width, height)) / Math.min(width, height));
  return width >= height ? [long, short] : [short, long];
}
