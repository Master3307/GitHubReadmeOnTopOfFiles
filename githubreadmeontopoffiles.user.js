// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      7.0.0
// @author       MrKoby07
// @description  Displays the rendered README above the file list on GitHub repository home pages
// @license      MIT
// @match        https://github.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  https://github.com/Master3307/GitHubReadmeOnTopOfFiles
// @supportURL   https://github.com/Master3307/GitHubReadmeOnTopOfFiles/issues
// @icon         https://github.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/Master3307/GitHubReadmeOnTopOfFiles/refs/heads/master/githubreadmeontopoffiles.userscript.js
// @downloadURL  https://raw.githubusercontent.com/Master3307/GitHubReadmeOnTopOfFiles/refs/heads/master/githubreadmeontopoffiles.userscript.js
// ==/UserScript==

(() => {
  "use strict";

  // Keep the old key so existing preferences survive the update.
  const TOGGLE_KEY = "move-file-browser-above-readme";

  const ATTR = "data-gh-readme-layout";
  const STYLE_ID = "gh-readme-before-files-style";

  let enabled = Boolean(GM_getValue(TOGGLE_KEY, true));
  let timer = null;
  let markedElements = new Map();

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /*
     * Flatten only the file-browser wrapper visually.
     * All elements retain their original DOM parents.
     */
    [${ATTR}="host"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }

    [${ATTR}="browser"] {
      display: contents !important;
    }

    [${ATTR}="commit"] {
      order: 10 !important;
      margin: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    [${ATTR}="readme"] {
      order: 20 !important;
      min-width: 0 !important;
      width: 100% !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      position: relative !important;
      z-index: auto !important;
      isolation: auto !important;
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
    }

    [${ATTR}="readme-card"],
    [${ATTR}="readme-header"] {
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
    }

    [${ATTR}="heading"] {
      order: 30 !important;
    }

    [${ATTR}="files"] {
      order: 40 !important;
      min-width: 0 !important;
      margin-top: var(--base-size-8, 8px) !important;
    }

    [${ATTR}="files"] table {
      margin-top: 0 !important;
      border-top-left-radius: var(--borderRadius-medium, 6px) !important;
      border-top-right-radius: var(--borderRadius-medium, 6px) !important;
      border-bottom-left-radius: var(--borderRadius-medium, 6px) !important;
      border-bottom-right-radius: var(--borderRadius-medium, 6px) !important;
    }

    [${ATTR}="after-files"] {
      order: 50 !important;
    }
  `;

  function isRepoHome() {
    return (
      location.hostname === "github.com" &&
      /^\/[^/]+\/[^/]+\/?$/.test(location.pathname)
    );
  }

  // Return the direct child of parent that contains node.
  function directChild(parent, node) {
    if (!parent || !node || parent === node) return null;

    let current = node;

    while (current && current.parentElement !== parent) {
      current = current.parentElement;
    }

    return current || null;
  }

  function detectLayout() {
    const root =
      document.querySelector('react-app[app-name="code-view"]') ||
      document.querySelector("#repo-content-pjax-container");

    if (!root) return null;

    const heading = root.querySelector("#folders-and-files");
    const table = root.querySelector(
      'table[aria-labelledby~="folders-and-files"]',
    );
    const latestCommit = root.querySelector('[data-testid="latest-commit"]');

    if (!heading || !table || !latestCommit) return null;

    // Find the smallest shared wrapper of the heading, table and commit.
    let browser = heading.parentElement;

    while (
      browser &&
      browser !== root &&
      (!browser.contains(table) || !browser.contains(latestCommit))
    ) {
      browser = browser.parentElement;
    }

    if (!browser || browser === root) return null;

    const host = browser.parentElement;
    if (!host) return null;

    // Find the README branch beside the file browser, including its tabs.
    const readme = Array.from(host.children).find(
      (element) =>
        element !== browser && element.querySelector("article.markdown-body"),
    );

    if (!readme) return null;

    const commit = directChild(browser, latestCommit);
    const files = directChild(browser, table);
    const headingBlock = directChild(browser, heading);

    if (
      !commit ||
      !files ||
      !headingBlock ||
      commit === files ||
      commit === headingBlock ||
      files === headingBlock
    ) {
      return null;
    }

    const article = readme.querySelector("article.markdown-body");

    // Locate the card that contains both the README header and markdown.
    // This avoids depending on GitHub's generated Box_* class names.
    let contentBranch = article;
    let card = null;

    while (
      contentBranch.parentElement &&
      contentBranch.parentElement !== host
    ) {
      const parent = contentBranch.parentElement;

      if (parent.children.length > 1) {
        card = parent;
        break;
      }

      contentBranch = parent;
    }

    const header =
      card && card.firstElementChild !== contentBranch
        ? card.firstElementChild
        : null;

    return {
      host,
      browser,
      commit,
      readme,
      card,
      header,
      files,
      heading: headingBlock,
    };
  }

  function restoreLayout() {
    for (const [element, role] of markedElements) {
      if (element.getAttribute(ATTR) === role) {
        element.removeAttribute(ATTR);
      }
    }

    markedElements.clear();
  }

  function applyLayout() {
    if (!enabled || !isRepoHome()) {
      restoreLayout();
      return;
    }

    const layout = detectLayout();

    if (!layout) {
      restoreLayout();
      return;
    }

    const next = new Map();

    function mark(element, role) {
      if (element) next.set(element, role);
    }

    mark(layout.host, "host");
    mark(layout.browser, "browser");
    mark(layout.commit, "commit");
    mark(layout.readme, "readme");
    mark(layout.files, "files");
    mark(layout.heading, "heading");

    // A node must not receive two different roles.
    if (layout.card !== layout.readme) {
      mark(layout.card, "readme-card");
    }

    mark(layout.header, "readme-header");

    // Keep dropzones and other trailing browser elements after the files.
    let passedFiles = false;

    for (const child of layout.browser.children) {
      if (child === layout.files) {
        passedFiles = true;
        continue;
      }

      if (passedFiles && !next.has(child)) {
        mark(child, "after-files");
      }
    }

    // Remove stale annotations after React replaces part of the page.
    for (const [element, role] of markedElements) {
      if (next.get(element) !== role && element.getAttribute(ATTR) === role) {
        element.removeAttribute(ATTR);
      }
    }

    for (const [element, role] of next) {
      if (element.getAttribute(ATTR) !== role) {
        element.setAttribute(ATTR, role);
      }
    }

    markedElements = next;
  }

  function scheduleLayout() {
    if (timer !== null) return;

    timer = window.setTimeout(() => {
      timer = null;

      if (!style.isConnected) {
        (document.head || document.documentElement).append(style);
      }

      applyLayout();
    }, 75);
  }

  GM_registerMenuCommand("Toggle README above files", () => {
    enabled = !enabled;
    GM_setValue(TOGGLE_KEY, enabled);

    if (enabled) {
      scheduleLayout();
    } else {
      restoreLayout();
    }
  });

  // Restore native presentation before Turbo stores its page snapshot.
  document.addEventListener("turbo:before-cache", restoreLayout);

  for (const event of [
    "turbo:load",
    "turbo:render",
    "pjax:end",
    "soft-nav:end",
  ]) {
    document.addEventListener(event, scheduleLayout);
  }

  window.addEventListener("pageshow", scheduleLayout);
  window.addEventListener("popstate", scheduleLayout);

  // Handles delayed rendering and React navigation without polling.
  // Attribute changes made by this script do not trigger this observer.
  const observer = new MutationObserver(scheduleLayout);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scheduleLayout();
})();
