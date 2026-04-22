import { extractJobDescriptionGeneric } from "./extractors/generic.js";
import { normalizeJobDescription } from "../utils/normalize.js";

(function init() {
  if (window.__UJMT_INJECTED__) return;
  window.__UJMT_INJECTED__ = true;

  // Wait a bit for job pages to render
  setTimeout(() => {
    tryInjectDrawer();
  }, 1500);
})();

function tryInjectDrawer() {
  const jobDescription = normalizeJobDescription(extractJobDescriptionGeneric());
  if (!jobDescription || jobDescription.length < 200) {
    return;
  }

  injectDrawer(jobDescription);
}

function injectDrawer(jobDescription) {
  if (document.getElementById("ujmt-drawer-tab")) return;

  const tab = document.createElement("div");
  tab.id = "ujmt-drawer-tab";
  tab.textContent = "JF";
  Object.assign(tab.style, {
    position: "fixed",
    top: "40%",
    right: "0",
    width: "28px",
    height: "60px",
    background: "#1e1e1e",
    color: "#d4d4d4",
    borderLeft: "2px solid #007acc",
    borderTop: "1px solid #3c3c3c",
    borderBottom: "1px solid #3c3c3c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Consolas, 'Fira Code', monospace",
    fontSize: "14px",
    cursor: "pointer",
    zIndex: "2147483647"
  });

  const iframe = document.createElement("iframe");
  iframe.id = "ujmt-drawer-iframe";
  iframe.src = chrome.runtime.getURL("content/sidebar/sidebar.html");
  Object.assign(iframe.style, {
    position: "fixed",
    top: "0",
    right: "-420px",
    width: "420px",
    height: "100vh",
    border: "none",
    zIndex: "2147483646",
    boxShadow: "0 0 12px rgba(0,0,0,0.6)",
    transition: "right 0.22s cubic-bezier(0.4, 0, 0.2, 1)"
  });

  let open = false;
  tab.addEventListener("click", () => {
    open = !open;
    iframe.style.right = open ? "0" : "-420px";
  });

  document.body.appendChild(tab);
  document.body.appendChild(iframe);

  iframe.addEventListener("load", () => {
    iframe.contentWindow.postMessage(
      {
        type: "UJMT_INIT",
        jobDescription
      },
      "*"
    );
  });

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "UJMT_REQUEST_ANALYSIS") return;

    chrome.runtime.sendMessage(
      {
        type: "ANALYZE_JOB",
        jobDescription
      },
      (response) => {
        iframe.contentWindow.postMessage(
          {
            type: "UJMT_ANALYSIS_RESULT",
            payload: response
          },
          "*"
        );
      }
    );
  });

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "UJMT_MICRO_TAILOR") return;

    chrome.runtime.sendMessage(
      {
        type: "MICRO_TAILOR_BULLET",
        bullet: data.bullet,
        mode: data.mode,
        jobDescription
      },
      (response) => {
        iframe.contentWindow.postMessage(
          {
            type: "UJMT_MICRO_TAILOR_RESULT",
            payload: response,
            requestId: data.requestId
          },
          "*"
        );
      }
    );
  });

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "UJMT_GENERATE_SUMMARY") return;

    chrome.runtime.sendMessage(
      {
        type: "GENERATE_SUMMARY",
        jobDescription
      },
      (response) => {
        iframe.contentWindow.postMessage(
          {
            type: "UJMT_GENERATE_SUMMARY_RESULT",
            payload: response
          },
          "*"
        );
      }
    );
  });
}