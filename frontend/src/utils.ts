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

const assigneeColorMap = new Map<string, string>();
const ASSIGNEE_COLORS = [
  '0, 196, 180', // #00C4B4
  '249, 115, 22' // #f97316
];

/**
 * Gets a consistent color for an assignee. 
 * The first and second unique assignees get specific brand colors.
 */
export function getAssigneeColor(assignee: string, alpha = 1): string {
  if (!assignee) return `hsla(0, 0%, 50%, ${alpha})`;

  if (!assigneeColorMap.has(assignee)) {
    const idx = assigneeColorMap.size;
    if (idx < ASSIGNEE_COLORS.length) {
      assigneeColorMap.set(assignee, ASSIGNEE_COLORS[idx]);
    } else {
      let hash = 0;
      for (let i = 0; i < assignee.length; i++) {
        hash = assignee.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % 360;
      assigneeColorMap.set(assignee, hue.toString());
    }
  }

  const val = assigneeColorMap.get(assignee)!;
  if (val.includes(',')) {
    return `rgba(${val}, ${alpha})`;
  }
  return `hsla(${val}, 70%, 50%, ${alpha})`;
}
