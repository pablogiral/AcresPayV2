export const FRIEND_COLORS = [
  "#FF6B6B",
  "#FF8E3C",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#FB7185",
  "#F97316",
  "#10B981",
  "#2DD4BF",
  "#38BDF8",
  "#818CF8",
  "#C084FC",
  "#F472B6"
] as const;

export function pickRandomFriendColor(except?: string) {
  const options = FRIEND_COLORS.filter((color) => color !== except);
  const pool = options.length > 0 ? options : [...FRIEND_COLORS];
  return pool[Math.floor(Math.random() * pool.length)];
}
