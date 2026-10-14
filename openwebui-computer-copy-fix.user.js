
// ==UserScript==
// @name         Open WebUI Computer - Better Copy Response
// @namespace    local.openwebui.computer.copyfix
// @version      1.2.0
// @description  Add a button to copy the complete assistant response while preserving Markdown formatting.
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // Only run on port 8000.
  // No personal IP address, hostname, token, or API key is included.
  if (location.port !== "8000") return;

  const STYLE_ID = "owc-better-copy-response-style";
  const BUTTON_CLASS = "owc-better-copy-response-button";
  const DONE_ATTR = "data-owc-better-copy-added";

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      button[aria-label*="Copy response"],
      button[aria-label*="复制回答"],
      button[aria-label*="复制回复"] {
        min-width: 32px;
      }

      .${BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 10px;
        margin-left: 6px;
        border: 1px solid var(--border-color, #d1d5db);
        border-radius: 8px;
        background: var(--background-color, transparent);
        color: var(--text-color, inherit);
        font-size: 12px;
        line-height: 1.4;
        cursor: pointer;
        white-space: nowrap;
      }

      .${BUTTON_CLASS}:hover {
        opacity: 0.8;
      }

      .${BUTTON_CLASS}:disabled {
        opacity: 0.6;
        cursor: default;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Convert a response DOM node into readable text.
   * Preserve paragraph breaks, lists, tables and code blocks.
   */
  function markdownToText(root) {
    if (!root) return "";

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName.toUpperCase();

      // Ignore interactive or non-content elements.
      if (
        [
          "SCRIPT",
          "STYLE",
          "BUTTON",
          "TEXTAREA",
          "INPUT",
          "SVG",
          "NOSCRIPT"
        ].includes(tag)
      ) {
        return "";
      }

      if (tag === "BR") {
        return "\n";
      }

      // Preserve code-block line breaks and indentation.
      if (tag === "PRE") {
        const code = node.innerText ?? node.textContent ?? "";
        return "\n" + code.replace(/\n+$/, "") + "\n";
      }

      if (tag === "HR") {
        return "\n---\n";
      }

      if (tag === "LI") {
        const parentTag = node.parentElement?.tagName?.toUpperCase();
        let prefix = "- ";

        if (parentTag === "OL") {
          const siblings = Array.from(node.parentElement.children);
          const index = siblings.indexOf(node);
          const start = Number(node.parentElement.getAttribute("start") || 1);
          const value = Number(node.getAttribute("value"));

          prefix = `${Number.isFinite(value) && value > 0
            ? value
            : start + index}. `;
        }

        const content = Array.from(node.childNodes)
          .map(walk)
          .join("")
          .trim();

        return prefix + content + "\n";
      }

      if (tag === "TABLE") {
        const rows = Array.from(node.querySelectorAll("tr"));

        const tableText = rows
          .map((row) =>
            Array.from(row.children)
              .filter((cell) =>
                ["TH", "TD"].includes(cell.tagName.toUpperCase())
              )
              .map((cell) =>
                Array.from(cell.childNodes)
                  .map(walk)
                  .join("")
                  .replace(/\s+/g, " ")
                  .trim()
              )
              .join("\t")
          )
          .join("\n");

        return "\n" + tableText + "\n";
      }

      const blockTags = new Set([
        "ADDRESS",
        "ARTICLE",
        "ASIDE",
        "BLOCKQUOTE",
        "DD",
        "DETAILS",
        "DIV",
        "DL",
        "DT",
        "FIELDSET",
        "FIGCAPTION",
        "FIGURE",
        "FOOTER",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "HEADER",
        "MAIN",
        "NAV",
        "OL",
        "P",
        "SECTION",
        "UL"
      ]);

      const isBlock = blockTags.has(tag);

      const content = Array.from(node.childNodes)
        .map(walk)
        .join("");

      return isBlock ? "\n" + content + "\n" : content;
    }

    let text = walk(root);

    // Normalize excessive blank lines without flattening paragraphs.
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text;
  }

  /**
   * Locate the response content associated with a native copy button.
   */
  function findResponseContainer(copyButton) {
    let current = copyButton.parentElement;
    let fallback = null;

    while (current && current !== document.body) {
      const proseNodes = current.querySelectorAll(".prose");

      if (proseNodes.length > 0) {
        // Prefer the nearest prose block preceding the copy button.
        const candidates = Array.from(proseNodes).filter(
          (node) =>
            !node.contains(copyButton) &&
            (
              node.compareDocumentPosition(copyButton) &
              Node.DOCUMENT_POSITION_FOLLOWING
            )
        );

        if (candidates.length > 0) {
          fallback = candidates[candidates.length - 1];
        }

        // Stop at the first ancestor containing a suitable response.
        if (fallback) return fallback;
      }

      current = current.parentElement;
    }

    // Fallback: search previous prose blocks in document order.
    const allProse = Array.from(document.querySelectorAll(".prose"));

    const previous = allProse.filter(
      (node) =>
        node.compareDocumentPosition(copyButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    );

    return previous.length > 0
      ? previous[previous.length - 1]
      : fallback;
  }

  async function copyText(text) {
    if (!text) {
      throw new Error("No response text found.");
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for environments where Clipboard API is unavailable.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let successful = false;

    try {
      successful = document.execCommand("copy");
    } finally {
      textarea.remove();
    }

    if (!successful) {
      throw new Error("Clipboard copy failed.");
    }
  }

  function createCopyButton(nativeButton) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = "复制完整回答";
    button.title = "复制完整回答并保留段落、列表、表格和代码块换行";

    button.addEventListener("click", async () => {
      const response = findResponseContainer(nativeButton);

      if (!response) {
        button.textContent = "未找到回答";
        setTimeout(() => {
          button.textContent = "复制完整回答";
        }, 1800);
        return;
      }

      const text = markdownToText(response);

      button.disabled = true;

      try {
        await copyText(text);
        button.textContent = "复制成功 ✓";
      } catch (error) {
        console.error("[Better Copy Response] Copy failed:", error);
        button.textContent = "复制失败";
      } finally {
        setTimeout(() => {
          button.textContent = "复制完整回答";
          button.disabled = false;
        }, 1800);
      }
    });

    return button;
  }

  function findNativeCopyButtons() {
    const selectors = [
      'button[aria-label*="Copy response"]',
      'button[aria-label*="复制回答"]',
      'button[aria-label*="复制回复"]',
      'button[title*="Copy response"]',
      'button[title*="复制回答"]',
      'button[title*="复制回复"]'
    ];

    return Array.from(document.querySelectorAll(selectors.join(",")));
  }

  function addButtons() {
    findNativeCopyButtons().forEach((nativeButton) => {
      if (nativeButton.hasAttribute(DONE_ATTR)) return;

      // Avoid adding a duplicate button.
      const parent = nativeButton.parentElement;

      if (!parent) return;

      if (parent.querySelector(`.${BUTTON_CLASS}`)) {
        nativeButton.setAttribute(DONE_ATTR, "true");
        return;
      }

      const button = createCopyButton(nativeButton);

      nativeButton.insertAdjacentElement("afterend", button);
      nativeButton.setAttribute(DONE_ATTR, "true");
    });
  }

  function init() {
    addStyle();
    addButtons();

    // Open WebUI may render new responses dynamically.
    const observer = new MutationObserver(() => {
      addButtons();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
