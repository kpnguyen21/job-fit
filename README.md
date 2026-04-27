# AI Job Match Chrome Extension

Develop a Chrome extension that matches skills with job descriptions and automatically tailors resume.

<h2 id="Table-of-Contents">Table of Contents</h2>

<ul>
    <li><a href="#Introduction">Introduction</a></li>
    <li><a href="#Architecture">Architecture Overview</a></li>
    <li><a href="#UI">User Interface</a></li>
    <li><a href="#Setup">Installation & Setup</a></li>
    <li><a href="#Supported-Sites">Supported Sites</a></li>
    <li><a href="#Code-Description">Code Description</a></li>
</ul>

---

<h3 id="Introduction">Introduction</h3>

Searching for jobs that truly match your skills has become increasingly time-consuming. With the rapid growth of AI-generated job postings and the sheer volume of listings across different platforms, job seekers often spend significant time manually reviewing job descriptions to determine whether they are a good fit.

Platforms like LinkedIn provide a `Show Match Details` feature that compares a candidate's skills with the skills listed in a job description. This helps job seekers quickly understand how well their background aligns with a role. However, this capability is largely limited to LinkedIn and is not available on many other popular job boards such as Indeed.

This project aims to solve that problem by developing a Chrome extension that brings similar skill-matching functionality to multiple job search platforms.

---

<h3 id="Architecture">Architecture Overview</h3>

The architecture is organized into four layers (see Figure 1):
- User layer: The job boards where the user is browsing. These are the entry points into the system.
- Extension layer: Three JavaScript modules work together inside the Chrome extension.
    - `content.js` runs directly on the job posting page and extracts the job description.
    - `sidepanel.js` provides the user interface, allowing the user to paste their resume and view the analysis results.
    - `background.js` acts as the communication hub, receiving messages from the side panel and forwarding requests to the backend.
- Backend layer: A Cloudflare Worker (`worker.js`) handles all network‑side responsibilities. It manages CORS, validates request origins, and enforces rate limits using a KV store (30 requests per hour per IP). The Worker also proxies requests to Groq so the API key remains securely on the server.
- AI layer: Groq's Llama 3.3 70B model performs the core analysis. It processes the job description and resume to generate the match score, identify matched and missing skills, and produce ATS‑optimized resume sections.

<p align="center">
  <img src="/figures/architecture.jpg" width="900" />
</p>
<p align="center"><b>Figure 1. Architecture Overview. Job boards provide the source text, which is scraped and processed by the Chrome extension (content.js, sidepanel.js, background.js). Requests are routed through a Cloudflare Worker backend, which forwards them to the AI layer using Groq’s Llama 3.3 70B model to generate match scores.
</b></p>

I use Groq's free tier for the AI layer. It allows up to 14,400 requests per day at no cost, which is more than enough for development, testing, and typical user traffic. This makes the system inexpensive to run while still providing fast inference through Groq's Llama 3.3 70B model.

---

<h3 id="UI">User Interface</h3>

<p align="center">
  <img src="/figures/match.jpg" width="900" />
</p>
<p align="center"><b>Figure 2. Match.
</b></p>

<p align="center">
  <img src="/figures/ATS_all.jpg" width="900" />
</p>
<p align="center"><b>Figure 3. ATS.
</b></p>

<p align="center">
  <img src="/figures/history.jpg" width="900" />
</p>
<p align="center"><b>Figure 4. History.
</b></p>

---

<h3 id="Setup">Installation & Setup</h3>

Follow these steps to install and run the extension in Chrome:

- Download/clone the repo
- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked** -> Select the `job-match-extension-hosted` folder
- Navigate to a job posting on Indeed or LinkedIn
- Click the extension icon and start using it.

---

<h3 id="Supported-Sites">Supported Sites</h3>

The extension supports job postings from `Indeed`, `Workday`, `Greenhouse`, `Lever`, `iCIMS`, `SmartRecruiters`, `Jobvite`, `Ashby`, `Google Careers`, and `Amazon Jobs`. It also works with any other website by manually pasting the job description.

---

<h3 id="Code-Description">Code Description</h3>

The project is organized into two main components:
- `job-match-extension-hosted` — the Chrome extension (frontend + manifest + UI)
- `jobmatch-cloudflare` — the Cloudflare Worker backend for API routing and model calls

Below is the full directory tree:

```text
├── job-match-extension-hosted
│   ├── icons
    |   ├── icon128.png
        ├── icon16.png
        ├── icon48.png
    ├── src
    |   ├── background.js
        ├── content.js
    ├── manifest.json
    ├── sidepanel.css
    ├── sidepanel.html
    └── sidepanel.js
├── jobmatch-cloudflare
│   ├── package.json
    ├── worker.js
    └── wrangler.toml
├── LICENSE
└── README.md
```


