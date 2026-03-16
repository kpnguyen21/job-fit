export function normalizeJobDescription(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}
