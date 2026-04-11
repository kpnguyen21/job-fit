// ─── Config ───────────────────────────────────────────────────────────────────
// After deploying your backend to Render, replace this URL with your live URL.
// Example: "https://jobmatch-ai-backend.onrender.com"
const BACKEND_URL = "https://jobmatch-ai-backend.onrender.com";

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "GET_JD_TEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => {
              const selectors = [
                '[class*="jobDescription"]','[class*="job-description"]',
                '[class*="jobsearch-jobDescriptionText"]','[data-testid*="description"]',
                '[class*="description"]','.job-desc','#job-description',
                '[class*="JobDescription"]','[class*="job_description"]','article','main'
              ];
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.innerText.trim().length > 200) return el.innerText.trim();
              }
              return document.body.innerText.trim().slice(0, 8000);
            },
          },
          (results) => sendResponse({ text: results?.[0]?.result || "" })
        );
      }
    });
    return true;
  }

  if (message.type === "ANALYZE") {
    fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: message.resume, jd: message.jd }),
    })
      .then((r) => r.json())
      .then((data) => sendResponse(data.error ? { ok: false, error: data.error } : { ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === "GENERATE") {
    fetch(`${BACKEND_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: message.resume, jd: message.jd, section: message.section, tone: message.tone }),
    })
      .then((r) => r.json())
      .then((data) => sendResponse(data.error ? { ok: false, error: data.error } : { ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
