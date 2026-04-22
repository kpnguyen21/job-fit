import { analyzeJobAndResume, microTailorBullet, generateSummary } from "../api/ai.js";
import { loadResume } from "../storage/resume-handler.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "ANALYZE_JOB") {
      const resume = await loadResume();
      const result = await analyzeJobAndResume(message.jobDescription, resume);
      sendResponse({ ok: true, data: result });
    } else if (message.type === "MICRO_TAILOR_BULLET") {
      const { bullet, mode, jobDescription } = message;
      const tailored = await microTailorBullet(bullet, mode, jobDescription);
      sendResponse({ ok: true, data: tailored });
    } else if (message.type === "GENERATE_SUMMARY") {
      const resume = await loadResume();
      const summary = await generateSummary(message.jobDescription, resume);
      sendResponse({ ok: true, data: summary });
    } else {
      sendResponse({ ok: false, error: "Unknown message type" });
    }
  })();

  return true; // keep channel open for async
});