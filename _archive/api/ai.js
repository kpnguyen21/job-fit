// Toggle this when you get a real Gemini key
const USE_MOCK_AI = true;
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // optional for later

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not set");
  }

  // Example REST call shape (you'll adapt to actual Gemini endpoint later)
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

// ---- MOCKS tailored to Data/Quant roles ----

function mockAnalysis(jobDescription, resume) {
  return {
    matchScore: 78,
    strengths: [
      "Python",
      "SQL",
      "Statistical Modeling",
      "Time-Series Analysis"
    ],
    missingSkills: [
      "Airflow",
      "Docker"
    ],
    insights: [
      "This role emphasizes time-series forecasting — highlight any projects involving sequential or temporal data.",
      "Mention your experience communicating complex quantitative findings to non-technical stakeholders.",
      "If you have any work with A/B testing or experimentation, surface it prominently."
    ],
    extracted: {
      requiredSkills: [
        "Python",
        "SQL",
        "Machine Learning",
        "Statistical Modeling",
        "Time-Series Analysis"
      ],
      preferredSkills: [
        "AWS",
        "Airflow",
        "Docker",
        "Experimentation"
      ],
      keywords: [
        "predictive modeling",
        "data pipelines",
        "quantitative analysis",
        "risk modeling"
      ]
    }
  };
}

function mockMicroTailor(bullet, mode) {
  if (mode === "rewrite") {
    return `Developed and validated forecasting models using Python and statistical techniques, improving prediction accuracy by 14%.`;
  }
  if (mode === "metrics") {
    return `Improved model performance by 18% through feature engineering, hyperparameter tuning, and rigorous backtesting.`;
  }
  if (mode === "tone") {
    return `Collaborated with cross-functional partners to translate complex quantitative analyses into clear, actionable insights.`;
  }
  return bullet;
}

function mockSummary(jobDescription, resume) {
  return `Data-focused professional with experience in Python, SQL, and statistical modeling, applying quantitative methods to real-world problems. Skilled at building and validating predictive models, communicating insights, and aligning analysis with business and research goals.`;
}

// ---- Public API used by background ----

export async function analyzeJobAndResume(jobDescription, resume) {
  if (USE_MOCK_AI) {
    return mockAnalysis(jobDescription, resume);
  }

  const prompt = `
You are an ATS-like analyzer for tech roles, especially Data Scientist, Data Analyst, and Quantitative Researcher/Analyst.

Job Description:
${jobDescription}

Resume:
${resume || "(no resume provided)"}

1. Extract required skills, preferred skills, and important keywords.
2. Estimate a match score from 0-100.
3. List strengths (where the resume aligns well).
4. List missing skills.
5. Provide 2-3 recruiter-style insights.

Respond in JSON with:
{
  "matchScore": number,
  "strengths": string[],
  "missingSkills": string[],
  "insights": string[],
  "extracted": {
    "requiredSkills": string[],
    "preferredSkills": string[],
    "keywords": string[]
  }
}
  `.trim();

  const text = await callGemini(prompt);
  try {
    return JSON.parse(text);
  } catch {
    return mockAnalysis(jobDescription, resume);
  }
}

export async function microTailorBullet(bullet, mode, jobDescription) {
  if (USE_MOCK_AI) {
    return mockMicroTailor(bullet, mode);
  }

  const modeLabel =
    mode === "rewrite"
      ? "Rewrite this bullet to be more impactful and aligned with the job."
      : mode === "metrics"
      ? "Add realistic, quantifiable metrics to this bullet."
      : "Improve the tone to be clear, confident, and professional.";

  const prompt = `
You are tailoring a resume bullet for a Data/Quant role.

Job Description:
${jobDescription}

Original bullet:
${bullet}

Task:
${modeLabel}

Return ONLY the improved bullet, no explanation.
  `.trim();

  const text = await callGemini(prompt);
  return text.trim();
}

export async function generateSummary(jobDescription, resume) {
  if (USE_MOCK_AI) {
    return mockSummary(jobDescription, resume);
  }

  const prompt = `
You are writing a 2-3 sentence professional summary for a candidate applying to a Data Scientist / Data Analyst / Quantitative Researcher role.

Job Description:
${jobDescription}

Resume:
${resume || "(no resume provided)"}

Write a concise, ATS-friendly summary that:
- Highlights alignment with the role
- Mentions key technical skills (Python, SQL, statistics, modeling, etc.)
- Sounds confident but not exaggerated.

Return ONLY the summary text.
  `.trim();

  const text = await callGemini(prompt);
  return text.trim();
}