import { saveResume, loadResume } from "../storage/resume-handler.js";

const textarea = document.getElementById("resume-input");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

(async function init() {
  const existing = await loadResume();
  textarea.value = existing;
})();

saveBtn.addEventListener("click", async () => {
  const text = textarea.value || "";
  await saveResume(text);
  statusEl.textContent = "Resume saved locally.";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
});