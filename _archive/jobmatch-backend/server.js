require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Groq client ──────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));

// Allow requests from the Chrome extension and localhost
const allowedOrigins = [
  /^chrome-extension:\/\//,
  /^http:\/\/localhost/,
  /^https?:\/\/127\.0\.0\.1/,
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some((r) => r.test(origin))) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
  })
);

// Rate limiting — 30 requests per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in an hour." },
});
app.use("/api/", limiter);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function callGroq(system, userMsg) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
  });
  return completion.choices[0]?.message?.content || "";
}

function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "JobMatch AI Backend", model: MODEL });
});

// Analyze match between resume and JD
app.post("/api/analyze", async (req, res) => {
  const { resume, jd } = req.body;
  if (!resume || !jd) {
    return res.status(400).json({ error: "resume and jd are required" });
  }
  if (resume.length > 6000 || jd.length > 6000) {
    return res.status(400).json({ error: "Text too long (max 6000 chars each)" });
  }

  try {
    const system = `You are an expert ATS resume analyst. Analyze resume vs job description.
Return ONLY valid JSON with this exact shape:
{
  "score": <0-100 integer>,
  "matchedSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "allJDKeywords": ["keyword1", ...],
  "analysis": "<2-3 sentence summary>",
  "scoreLabel": "<one of: Excellent / Good / Fair / Needs Work>"
}`;

    const userMsg = `RESUME:\n${resume.slice(0, 4000)}\n\nJOB DESCRIPTION:\n${jd.slice(0, 4000)}`;
    const raw = await callGroq(system, userMsg);
    const parsed = parseJSON(raw);
    res.json(parsed);
  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

// Generate ATS-optimized resume section
app.post("/api/generate", async (req, res) => {
  const { resume, jd, section, tone } = req.body;
  if (!resume || !jd || !section) {
    return res.status(400).json({ error: "resume, jd, and section are required" });
  }

  const sectionNames = {
    summary: "Professional Summary",
    bullets: "Work Experience Bullet Points",
    skills: "Skills Section",
    cover: "Cover Letter Opening Paragraph",
  };

  if (!sectionNames[section]) {
    return res.status(400).json({ error: "Invalid section type" });
  }

  try {
    const system = `You are an expert ATS resume writer. Generate content that:
- Uses keywords naturally from the job description
- Passes Applicant Tracking Systems (ATS)
- Follows the requested tone: ${tone || "professional"}
- Is concise, achievement-focused, uses strong action verbs
- NEVER uses generic filler phrases

Return ONLY valid JSON:
{
  "content": "<the generated section>",
  "tips": ["tip1", "tip2", "tip3", "tip4"]
}
Where tips are specific ATS tips for this JD/resume combo.`;

    const userMsg = `Generate a ${sectionNames[section]} for this candidate.\n\nRESUME:\n${resume.slice(0, 3000)}\n\nJOB DESCRIPTION:\n${jd.slice(0, 3000)}\n\nTone: ${tone || "professional"}. Return JSON only.`;
    const raw = await callGroq(system, userMsg);
    const parsed = parseJSON(raw);
    res.json(parsed);
  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`JobMatch AI backend running on port ${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn("WARNING: GROQ_API_KEY is not set in environment variables!");
  }
});
