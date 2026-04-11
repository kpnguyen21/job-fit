# JobMatch AI — Chrome Extension (Groq / Free)

Match your resume against any job description and generate ATS-optimized resume sections — **completely free** using Groq's free API tier.

## Why Groq?
- **Free** — 14,400 requests/day, no credit card needed
- **Fast** — responses in ~1 second (runs Llama 3.3 70B)
- **Private** — only your text is sent to Groq, nothing else

## Setup (5 minutes)

### 1. Get a Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free) → API Keys → Create API Key
3. Copy the key (starts with `gsk_`)

### 2. Load the Extension in Chrome
1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (toggle, top right)
3. Click **Load unpacked**
4. Select the `job-match-extension-groq` folder
5. The ⚡ icon appears in your toolbar

### 3. Add Your Groq API Key
1. Click the ⚡ icon → side panel opens
2. Click ⚙ gear icon
3. Paste your `gsk_...` key → Save

## How to Use

### Match Your Resume
1. Go to any job posting (Indeed, Workday, Greenhouse, Lever…)
2. Open the extension (⚡ icon)
3. Paste or upload your resume → **Save Resume**
4. Click **← Scrape Page** (or paste JD manually)
5. Click **Analyze Match** → score, matched/missing skills, analysis

### Highlight Keywords on Page
- After analyzing, click **Highlight keywords on page**
- Green = skills you have · Yellow = skills you're missing

### ATS Writer
1. **ATS Writer** tab → select section type + tone → **Generate**
2. Copy the output directly into your resume

## Supported Sites
Indeed, Workday, Greenhouse, Lever, iCIMS, SmartRecruiters, Jobvite, Ashby, Google Careers, Amazon Jobs + any site via manual paste.

## Model Used
`llama-3.3-70b-versatile` via Groq — a powerful open-source model with strong reasoning.

## Cost
**$0.00** — Groq's free tier covers 14,400 requests/day.
