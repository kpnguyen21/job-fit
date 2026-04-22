const RESUME_KEY = "user_resume_text";

export async function saveResume(text) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [RESUME_KEY]: text || "" }, () => resolve(true));
  });
}

export async function loadResume() {
  return new Promise((resolve) => {
    chrome.storage.local.get([RESUME_KEY], (result) => {
      resolve(result[RESUME_KEY] || "");
    });
  });
}
