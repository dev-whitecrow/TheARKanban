/**
 * Generates a deterministic HSL color string based on the input string.
 * This ensures that the same name (e.g., "Morpheus") always gets the same color.
 *
 * @param str The input string (e.g., assignee or epic name)
 * @param saturation The saturation level (0-100%)
 * @param lightness The lightness level (0-100%)
 * @param alpha The alpha transparency (0-1)
 * @returns A valid CSS hsla string
 */
export function stringToColor(
  str: string,
  saturation = 70,
  lightness = 50,
  alpha = 1
): string {
  if (!str) return `hsla(0, 0%, 50%, ${alpha})`; // fallback gray

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Ensure hash is positive and within 360 degrees
  const hue = Math.abs(hash) % 360;

  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
}
