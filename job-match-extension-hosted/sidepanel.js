// ─── State ────────────────────────────────────────────────────────────────────
let savedResume = "";
let currentJD = "";
let matchResults = null;
let highlightActive = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadStorage();
  bindEvents();
  renderHistory();
});

async function loadStorage() {
  const data = await chrome.storage.local.get(["resume", "history"]);
  savedResume = data.resume || "";
  if (savedResume) {
    $("resume-input").value = savedResume;
    showStatus("resume-status", "Resume saved ✓");
  }
}

// ─── Bindings ─────────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );
  $("save-resume-btn").addEventListener("click", saveResume);
  $("clear-resume-btn").addEventListener("click", clearResume);
  $("resume-file").addEventListener("change", handleFileUpload);
  $("scrape-jd-btn").addEventListener("click", scrapeJD);
  $("analyze-btn").addEventListener("click", analyzeMatch);
  $("highlight-btn").addEventListener("click", toggleHighlight);
  $("generate-btn").addEventListener("click", generateATS);
  $("copy-btn").addEventListener("click", copyATS);
  $("clear-history-btn").addEventListener("click", clearHistory);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  document.querySelectorAll(".tab-content").forEach((c) =>
    c.classList.toggle("hidden", c.id !== `tab-${tab}`)
  );
  if (tab === "history") renderHistory();
}

// ─── Resume ───────────────────────────────────────────────────────────────────
async function saveResume() {
  const text = $("resume-input").value.trim();
  if (!text) return alert("Please paste your resume text first.");
  savedResume = text;
  await chrome.storage.local.set({ resume: text });
  showStatus("resume-status", "Resume saved ✓");
}

async function clearResume() {
  savedResume = "";
  $("resume-input").value = "";
  await chrome.storage.local.remove("resume");
  $("resume-status").classList.add("hidden");
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { $("resume-input").value = ev.target.result; };
  reader.readAsText(file);
}

// ─── JD Scraper ───────────────────────────────────────────────────────────────
async function scrapeJD() {
  $("scrape-jd-btn").textContent = "Scraping…";
  $("scrape-jd-btn").disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_JD_TEXT" });
    if (response?.text) $("jd-input").value = response.text;
    else alert("Could not extract job description. Please paste it manually.");
  } catch (e) {
    alert("Could not scrape page. Please paste JD manually.");
  }
  $("scrape-jd-btn").textContent = "← Scrape Page";
  $("scrape-jd-btn").disabled = false;
}

// ─── Analyze Match ────────────────────────────────────────────────────────────
async function analyzeMatch() {
  const resume = $("resume-input").value.trim() || savedResume;
  const jd = $("jd-input").value.trim();
  if (!resume) return alert("Please paste or upload your resume.");
  if (!jd) return alert("Please paste a job description or click 'Scrape Page'.");

  currentJD = jd;
  showLoading("Analyzing skills match…");

  const result = await chrome.runtime.sendMessage({ type: "ANALYZE", resume, jd });
  hideLoading();

  if (!result?.ok) {
    alert("Error: " + (result?.error || "Unknown error. Is the backend running?"));
    return;
  }

  matchResults = result.data;
  renderMatchResults(result.data);
  await saveToHistory(result.data, jd);
}

function renderMatchResults(data) {
  $("match-results").classList.remove("hidden");

  const pct = Math.min(100, Math.max(0, data.score));
  const circumference = 251.2;
  const offset = circumference - (pct / 100) * circumference;
  const arc = $("score-arc");
  arc.style.strokeDashoffset = offset;
  arc.style.stroke = pct >= 75 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171";
  $("score-num").textContent = pct + "%";
  $("score-label").textContent = data.scoreLabel || "Match Score";
  $("score-desc").textContent = (data.analysis || "").split(".")[0] + ".";

  const matchedEl = $("matched-skills");
  const missingEl = $("missing-skills");
  matchedEl.innerHTML = "";
  missingEl.innerHTML = "";
  (data.matchedSkills || []).forEach((s) => {
    const p = document.createElement("span");
    p.className = "pill matched";
    p.textContent = s;
    matchedEl.appendChild(p);
  });
  (data.missingSkills || []).forEach((s) => {
    const p = document.createElement("span");
    p.className = "pill missing";
    p.textContent = s;
    missingEl.appendChild(p);
  });

  $("analysis-text").textContent = data.analysis || "";
  highlightActive = false;
  $("highlight-btn").textContent = "Highlight keywords on page";
}

// ─── Highlight ────────────────────────────────────────────────────────────────
async function toggleHighlight() {
  if (!matchResults) return;
  highlightActive = !highlightActive;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  if (highlightActive) {
    await chrome.tabs.sendMessage(tab.id, {
      type: "HIGHLIGHT_KEYWORDS",
      keywords: matchResults.allJDKeywords || [],
      matched: matchResults.matchedSkills || [],
    });
    $("highlight-btn").textContent = "Remove highlights";
  } else {
    await chrome.tabs.sendMessage(tab.id, { type: "CLEAR_HIGHLIGHTS" });
    $("highlight-btn").textContent = "Highlight keywords on page";
  }
}

// ─── ATS Generator ───────────────────────────────────────────────────────────
async function generateATS() {
  const resume = $("resume-input").value.trim() || savedResume;
  const jd = $("jd-input").value.trim() || currentJD;
  const section = $("section-select").value;
  const tone = $("tone-select").value;
  if (!resume) return alert("Please provide your resume.");
  if (!jd) return alert("Please provide the job description first (go to Match tab).");

  showLoading("Generating ATS-optimized content…");

  const result = await chrome.runtime.sendMessage({ type: "GENERATE", resume, jd, section, tone });
  hideLoading();

  if (!result?.ok) {
    alert("Error: " + (result?.error || "Generation failed."));
    return;
  }

  const sectionNames = {
    summary: "Professional Summary", bullets: "Work Experience Bullets",
    skills: "Skills Section", cover: "Cover Letter Opening",
  };

  $("ats-section-title").textContent = sectionNames[section];
  $("ats-output").textContent = result.data.content || "";

  const tipsEl = $("ats-tips");
  tipsEl.innerHTML = "";
  (result.data.tips || []).forEach((t) => {
    const div = document.createElement("div");
    div.className = "ats-tip";
    div.innerHTML = `<span class="tip-icon">💡</span><span>${t}</span>`;
    tipsEl.appendChild(div);
  });

  $("ats-result").classList.remove("hidden");
  switchTab("resume");
}

function copyATS() {
  const text = $("ats-output").textContent;
  navigator.clipboard.writeText(text).then(() => {
    $("copy-btn").textContent = "Copied!";
    setTimeout(() => ($("copy-btn").textContent = "Copy"), 2000);
  });
}

// ─── History ──────────────────────────────────────────────────────────────────
async function saveToHistory(data, jd) {
  const storage = await chrome.storage.local.get("history");
  const history = storage.history || [];
  history.unshift({
    score: data.score, scoreLabel: data.scoreLabel,
    matchedCount: data.matchedSkills?.length || 0,
    missingCount: data.missingSkills?.length || 0,
    jdSnippet: jd.slice(0, 120),
    date: new Date().toLocaleDateString(), data,
  });
  await chrome.storage.local.set({ history: history.slice(0, 20) });
}

async function renderHistory() {
  const storage = await chrome.storage.local.get("history");
  const history = storage.history || [];
  const list = $("history-list");
  if (!history.length) {
    list.innerHTML = '<p class="hint" style="padding:10px 0">No analyses yet. Run a match first!</p>';
    return;
  }
  list.innerHTML = history.map((h, i) => `
    <div class="history-item" data-index="${i}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="history-site">${h.date}</span>
        <span class="history-score-badge" style="background:${scoreColor(h.score)[0]};color:${scoreColor(h.score)[1]}">${h.score}% ${h.scoreLabel || ""}</span>
      </div>
      <div class="history-meta">${h.matchedCount} matched · ${h.missingCount} missing · ${h.jdSnippet.slice(0, 80)}…</div>
    </div>`).join("");

  list.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const s = await chrome.storage.local.get("history");
      const h = (s.history || [])[parseInt(item.dataset.index)];
      if (h?.data) { matchResults = h.data; renderMatchResults(h.data); switchTab("match"); }
    });
  });
}

async function clearHistory() {
  if (!confirm("Clear all history?")) return;
  await chrome.storage.local.remove("history");
  renderHistory();
}

function scoreColor(score) {
  if (score >= 75) return ["#d1fae5", "#065f46"];
  if (score >= 50) return ["#fef3c7", "#92400e"];
  return ["#fee2e2", "#991b1b"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function showLoading(text) {
  $("loading-text").textContent = text || "Loading…";
  $("loading-overlay").classList.remove("hidden");
}
function hideLoading() { $("loading-overlay").classList.add("hidden"); }
function showStatus(id, msg, isError = false) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove("hidden", "error");
  if (isError) el.classList.add("error");
}
