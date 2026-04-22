export function extractJobDescriptionGeneric() {
  // Very simple heuristic: look for main content blocks
  const selectors = [
    "section",
    "article",
    "[data-test='job-description']",
    "[data-testid='jobDescriptionText']",
    ".jobsearch-JobComponent-description",
    ".jobs-description__content",
    ".description",
    ".job-description"
  ];

  let bestText = "";
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const text = el.innerText || "";
      if (text.length > bestText.length) {
        bestText = text;
      }
    });
  });

  if (!bestText) {
    bestText = document.body.innerText || "";
  }

  return bestText;
}