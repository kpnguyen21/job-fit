// JobMatch AI — Cloudflare Worker Backend
// Handles CORS, rate limiting, and proxies requests to Groq API

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// ─── CORS headers ─────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  // Allow Chrome extensions and local dev
  const allowed =
    !origin ||
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");

  if (!allowed) return null;

  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── Rate limiting (uses Cloudflare KV) ──────────────────────────────────────
async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT) return true; // KV not configured, skip
  const key = `rl:${ip}`;
  const current = await env.RATE_LIMIT.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= 30) return false; // 30 requests/hour
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3600 });
  return true;
}

// ─── Call Groq ────────────────────────────────────────────────────────────────
async function callGroq(system, userMsg, apiKey) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin) || {};

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return json({ status: "ok", service: "JobMatch AI", model: MODEL }, 200, headers);
    }

    // Only POST from here
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, headers);
    }

    // CORS guard
    if (!corsHeaders(origin)) {
      return json({ error: "Forbidden" }, 403);
    }

    // Rate limit
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const allowed = await checkRateLimit(ip, env);
    if (!allowed) {
      return json({ error: "Too many requests. Try again in an hour." }, 429, headers);
    }

    // Get API key from environment
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return json({ error: "Server misconfigured — API key missing." }, 500, headers);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, headers);
    }

    // ── Route: /api/analyze ──────────────────────────────────────────────────
    if (url.pathname === "/api/analyze") {
      const { resume, jd } = body;
      if (!resume || !jd) {
        return json({ error: "resume and jd are required" }, 400, headers);
      }
      if (resume.length > 10000 || jd.length > 10000) {
        return json({ error: "Text too long (max 10000 chars each)" }, 400, headers);
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
        const raw = await callGroq(system, userMsg, apiKey);
        const parsed = parseJSON(raw);
        return json(parsed, 200, headers);
      } catch (err) {
        console.error("Analyze error:", err.message);
        // return json({ error: "Analysis failed. Please try again." }, 500, headers);
        return json({ error: err.message }, 500, headers);
      }
    }

    // ── Route: /api/generate ─────────────────────────────────────────────────
    if (url.pathname === "/api/generate") {
      const { resume, jd, section, tone } = body;
      if (!resume || !jd || !section) {
        // return json({ error: "resume, jd, and section are required" }, 400, headers);
        return json({ error: err.message }, 500, headers);
      }

      const sectionNames = {
        summary: "Professional Summary",
        bullets: "Work Experience Bullet Points",
        skills: "Skills Section",
        cover: "Cover Letter Opening Paragraph",
      };
      if (!sectionNames[section]) {
        return json({ error: "Invalid section type" }, 400, headers);
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
}`;
        const userMsg = `Generate a ${sectionNames[section]}.\n\nRESUME:\n${resume.slice(0, 3000)}\n\nJOB DESCRIPTION:\n${jd.slice(0, 3000)}\n\nTone: ${tone || "professional"}. Return JSON only.`;
        const raw = await callGroq(system, userMsg, apiKey);
        const parsed = parseJSON(raw);
        return json(parsed, 200, headers);
      } catch (err) {
        console.error("Generate error:", err.message);
        return json({ error: "Generation failed. Please try again." }, 500, headers);
      }
    }

    return json({ error: "Not found" }, 404, headers);
  },
};
