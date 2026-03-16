// Simple placeholder; real logic can be more advanced later
export function computeMatchScoreFromExtracted(extracted, resumeText) {
  if (!extracted || !resumeText) return 0;

  const lowerResume = resumeText.toLowerCase();
  const skills = [
    ...(extracted.requiredSkills || []),
    ...(extracted.preferredSkills || [])
  ];

  let hits = 0;
  skills.forEach((s) => {
    if (lowerResume.includes(s.toLowerCase())) hits++;
  });

  if (skills.length === 0) return 0;
  const ratio = hits / skills.length;
  return Math.round(ratio * 100);
}