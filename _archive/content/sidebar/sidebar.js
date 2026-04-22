let currentJobDescription = "";
let lastAnalysis = null;

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "UJMT_INIT") {
    currentJobDescription = data.jobDescription || "";
    requestAnalysis();
  } else if (data.type === "UJMT_ANALYSIS_RESULT") {
    handleAnalysisResult(data.payload);
  } else if (data.type === "UJMT_MICRO_TAILOR_RESULT") {
    handleMicroTailorResult(data);
  } else if (data.type === "UJMT_GENERATE_SUMMARY_RESULT") {
    handleSummaryResult(data.payload);
  }
});

function requestAnalysis() {
  const statusEl = document.querySelector("#status .status-line");
  statusEl.textContent = "Analyzing job description and stored resume...";
  window.parent.postMessage({ type: "UJMT_REQUEST_ANALYSIS" }, "*");
}

function handleAnalysisResult(response) {
  const statusEl = document.querySelector("#status .status-line");
  if (!response || !response.ok) {
    statusEl.textContent = "Analysis failed or no resume stored.";
    return;
  }

  const data = response.data;
  lastAnalysis = data;

  statusEl.textContent = "Analysis complete.";

  const matchSection = document.getElementById("match-section");
  const insightsSection = document.getElementById("insights-section");
  matchSection.classList.remove("hidden");
  insightsSection.classList.remove("hidden");

  const matchScoreEl = document.getElementById("match-score");
  matchScoreEl.textContent = (data.matchScore ?? "--") + "%";

  const strengthsEl = document.getElementById("strengths");
  const missingEl = document.getElementById("missing-skills");
  const insightsEl = document.getElementById("insights");

  strengthsEl.innerHTML = "";
  (data.strengths || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    strengthsEl.appendChild(li);
  });

  missingEl.innerHTML = "";
  (data.missingSkills || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    missingEl.appendChild(li);
  });

  insightsEl.innerHTML = "";
  (data.insights || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    insightsEl.appendChild(li);
  });
}

// ---- Micro tailoring ----

const bulletInput = document.getElementById("bullet-input");
const bulletOutput = document.getElementById("bullet-output");
const buttons = document.querySelectorAll("#bullets-section button");

let pendingRequestId = 0;

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    const bullet = bulletInput.value.trim();
    if (!bullet) {
      bulletOutput.textContent = "Paste a bullet first.";
      return;
    }

    const requestId = ++pendingRequestId;
    bulletOutput.textContent = "Tailoring bullet...";
    window.parent.postMessage(
      {
        type: "UJMT_MICRO_TAILOR",
        bullet,
        mode,
        requestId
      },
      "*"
    );
  });
});

function handleMicroTailorResult(message) {
  const { payload, requestId } = message;
  if (!payload || !payload.ok) {
    bulletOutput.textContent = "Tailoring failed.";
    return;
  }
  bulletOutput.textContent = payload.data;
}

// ---- Summary ----

const summaryBtn = document.getElementById("generate-summary-btn");
const summaryOutput = document.getElementById("summary-output");

summaryBtn.addEventListener("click", () => {
  summaryOutput.textContent = "Generating summary...";
  window.parent.postMessage(
    {
      type: "UJMT_GENERATE_SUMMARY"
    },
    "*"
  );
});

function handleSummaryResult(payload) {
  if (!payload || !payload.ok) {
    summaryOutput.textContent = "Summary generation failed.";
    return;
  }
  summaryOutput.textContent = payload.data;
}