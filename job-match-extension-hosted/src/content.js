let highlightedKeywords = [];
let originalNodes = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_KEYWORDS") {
    clearHighlights();
    highlightedKeywords = message.keywords || [];
    if (highlightedKeywords.length > 0) {
      highlightInPage(highlightedKeywords, message.matched || []);
    }
    sendResponse({ ok: true });
  }
  if (message.type === "CLEAR_HIGHLIGHTS") {
    clearHighlights();
    sendResponse({ ok: true });
  }
});

function highlightInPage(all, matched) {
  const matchedSet = new Set(matched.map((k) => k.toLowerCase()));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodesToProcess = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (
      node.parentElement &&
      !["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(
        node.parentElement.tagName
      ) &&
      node.textContent.trim()
    ) {
      nodesToProcess.push(node);
    }
  }

  const escapedKeywords = all.map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  if (!escapedKeywords.length) return;
  const regex = new RegExp(`\\b(${escapedKeywords.join("|")})\\b`, "gi");

  nodesToProcess.forEach((node) => {
    const text = node.textContent;
    if (!regex.test(text)) return;
    regex.lastIndex = 0;

    const span = document.createElement("span");
    span.className = "__jobmatch_wrap__";
    span.innerHTML = text.replace(regex, (match) => {
      const isMatch = matchedSet.has(match.toLowerCase());
      const bg = isMatch ? "#d1fae5" : "#fef9c3";
      const color = isMatch ? "#065f46" : "#713f12";
      const border = isMatch ? "#6ee7b7" : "#fcd34d";
      return `<mark style="background:${bg};color:${color};border:1px solid ${border};border-radius:3px;padding:0 2px;font-weight:500;">${match}</mark>`;
    });

    originalNodes.set(span, node.cloneNode());
    node.parentNode.replaceChild(span, node);
  });
}

function clearHighlights() {
  document.querySelectorAll(".__jobmatch_wrap__").forEach((span) => {
    const original = originalNodes.get(span);
    if (original) {
      span.parentNode.replaceChild(original, span);
      originalNodes.delete(span);
    } else {
      span.outerHTML = span.innerHTML;
    }
  });
  highlightedKeywords = [];
}
