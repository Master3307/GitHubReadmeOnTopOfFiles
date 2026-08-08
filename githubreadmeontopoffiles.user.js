// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      5.4.0
// @author       MrKoby07
// @description  Moves the entire rendered README section (nav, edit button, article) above the entire file list section on GitHub repo home pages
// @license      MIT
// @match        https://github.com/*/*
// @match        https://github.com/*/*/
// @exclude      https://github.com/*/*/blob/*
// @exclude      https://github.com/*/*/tree/*
// @exclude      https://github.com/*/*/issues*
// @exclude      https://github.com/*/*/pull*
// @exclude      https://github.com/*/*/actions*
// @exclude      https://github.com/*/*/projects*
// @exclude      https://github.com/*/*/wiki*
// @exclude      https://github.com/*/*/settings*
// @exclude      https://github.com/*/*/security*
// @exclude      https://github.com/*/*/network*
// @exclude      https://github.com/*/*/stargazers*
// @exclude      https://github.com/*/*/watchers*
// @exclude      https://github.com/*/*/forks*
// @exclude      https://github.com/*/*/releases*
// @exclude      https://github.com/*/*/tags*
// @exclude      https://github.com/*/*/commits*
// @exclude      https://github.com/*/*/branches*
// @exclude      https://github.com/*/*/compare/*
// @run-at       document-idle
// @grant        none
// @homepageURL  https://github.com/Master3307/GitHubReadmeOnTopOfFiles
// @supportURL   https://github.com/Master3307/GitHubReadmeOnTopOfFiles/issues
// @icon         https://github.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/Master3307/GitHubReadmeOnTopOfFiles/refs/heads/master/githubreadmeontopoffiles.userscript.js
// @downloadURL  https://raw.githubusercontent.com/Master3307/GitHubReadmeOnTopOfFiles/refs/heads/master/githubreadmeontopoffiles.userscript.js
// ==/UserScript==

(() => {
  "use strict";

  let scheduled = false;

  function isRepoHome() {
    const parts = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    return location.hostname === "github.com" && parts.length === 2;
  }

  // Stable anchor: the "Folders and files" heading always has this id.
  function getFilesTable() {
    const heading = document.getElementById("folders-and-files");
    return (
      heading?.closest("table") ||
      document.querySelector('table[aria-labelledby="folders-and-files"]')
    );
  }

  // Stable anchor: the README section's outer wrapper is the OUTERMOST
  // element whose class starts with "OverviewRepoFiles-module". It contains
  // the file-type nav (README/LICENSE tabs), the edit-pencil slot, and the
  // markdown article as one unit — nothing gets left behind.
  function getReadmeBlock() {
    const candidates = Array.from(
      document.querySelectorAll('[class*="OverviewRepoFiles-module"]'),
    );
    if (!candidates.length) return null;

    // Keep only nodes not nested inside another candidate.
    const outermost = candidates.filter(
      (el) => !candidates.some((other) => other !== el && other.contains(el)),
    );

    // Prefer the one that actually contains a markdown article.
    return (
      outermost.find((el) => el.querySelector("article.markdown-body")) ||
      outermost[0] ||
      null
    );
  }

  function getDirectChildOf(parent, child) {
    let node = child;
    while (node?.parentElement && node.parentElement !== parent) {
      node = node.parentElement;
    }
    return node?.parentElement === parent ? node : null;
  }

  function getLowestCommonAncestor(a, b) {
    const ancestors = new Set();
    for (let n = a; n; n = n.parentElement) ancestors.add(n);
    for (let n = b; n; n = n.parentElement) if (ancestors.has(n)) return n;
    return null;
  }

  function moveReadme() {
    if (!isRepoHome()) return;

    const filesTable = getFilesTable();
    const readmeBlock = getReadmeBlock();
    if (!filesTable || !readmeBlock) return;

    const container = getLowestCommonAncestor(filesTable, readmeBlock);
    if (!container) return;

    const filesBlock = getDirectChildOf(container, filesTable);
    const readmeBlockDirect = getDirectChildOf(container, readmeBlock);
    if (!filesBlock || !readmeBlockDirect) return;
    if (filesBlock === readmeBlockDirect) return;
    if (
      filesBlock.contains(readmeBlockDirect) ||
      readmeBlockDirect.contains(filesBlock)
    )
      return;

    const alreadyBefore = Boolean(
      filesBlock.compareDocumentPosition(readmeBlockDirect) &
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    if (alreadyBefore) return;

    container.insertBefore(readmeBlockDirect, filesBlock);
  }

  function scheduleMove() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      moveReadme();
    });
  }

  const observer = new MutationObserver(scheduleMove);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  document.addEventListener("turbo:render", scheduleMove);
  document.addEventListener("pjax:end", scheduleMove);
  window.addEventListener("pageshow", scheduleMove);

  scheduleMove();
})();
