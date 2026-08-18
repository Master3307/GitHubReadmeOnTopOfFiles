// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      5.5.0
// @author       MrKoby07
// @description  Moves the entire rendered README section above the file list on GitHub repository home pages
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

  const RETRY_ATTEMPTS = 25;
  const RETRY_DELAY_MS = 100;

  let scheduled = false;
  let retryTimer = null;
  let observerTimer = null;
  let navigationId = 0;

  function isRepoHome() {
    const parts = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    return location.hostname === "github.com" && parts.length === 2;
  }

  function getRepositoryPath() {
    return location.pathname.replace(/\/$/, "");
  }

  function getFilesTable() {
    const heading = document.getElementById("folders-and-files");

    return (
      heading?.closest("table") ||
      document.querySelector('table[aria-labelledby="folders-and-files"]')
    );
  }

  function getReadmeBlock() {
    const candidates = [
      ...document.querySelectorAll('[class*="OverviewRepoFiles-module"]'),
    ];

    if (!candidates.length) return null;

    const outermost = candidates.filter(
      (element) =>
        !candidates.some(
          (other) => other !== element && other.contains(element),
        ),
    );

    return (
      outermost.find((element) =>
        element.querySelector("article.markdown-body"),
      ) ||
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

    for (let node = a; node; node = node.parentElement) {
      ancestors.add(node);
    }

    for (let node = b; node; node = node.parentElement) {
      if (ancestors.has(node)) return node;
    }

    return null;
  }

  function moveReadme() {
    if (!isRepoHome()) return false;

    const filesTable = getFilesTable();
    const readmeBlock = getReadmeBlock();

    if (!filesTable || !readmeBlock) return false;

    const container = getLowestCommonAncestor(filesTable, readmeBlock);
    if (!container) return false;

    const filesBlock = getDirectChildOf(container, filesTable);
    const readmeBlockDirect = getDirectChildOf(container, readmeBlock);

    if (!filesBlock || !readmeBlockDirect) return false;
    if (filesBlock === readmeBlockDirect) return false;

    if (
      filesBlock.contains(readmeBlockDirect) ||
      readmeBlockDirect.contains(filesBlock)
    ) {
      return false;
    }

    const readmeIsBeforeFiles = Boolean(
      filesBlock.compareDocumentPosition(readmeBlockDirect) &
      Node.DOCUMENT_POSITION_PRECEDING,
    );

    if (readmeIsBeforeFiles) return true;

    container.insertBefore(readmeBlockDirect, filesBlock);
    return true;
  }

  function scheduleMove() {
    if (scheduled) return;

    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      moveReadme();
    });
  }

  function scheduleMoveWithRetry({
    attempts = RETRY_ATTEMPTS,
    delay = RETRY_DELAY_MS,
  } = {}) {
    clearTimeout(retryTimer);

    const thisNavigation = ++navigationId;
    const expectedPath = getRepositoryPath();

    const attemptMove = (remaining) => {
      if (
        thisNavigation !== navigationId ||
        !isRepoHome() ||
        getRepositoryPath() !== expectedPath
      ) {
        return;
      }

      if (moveReadme()) return;

      if (remaining > 0) {
        retryTimer = setTimeout(() => attemptMove(remaining - 1), delay);
      }
    };

    requestAnimationFrame(() => attemptMove(attempts));
  }

  function handleNavigation() {
    scheduleMoveWithRetry();
  }

  document.addEventListener("turbo:load", handleNavigation);
  document.addEventListener("turbo:render", scheduleMove);
  document.addEventListener("pjax:end", handleNavigation);
  window.addEventListener("pageshow", handleNavigation);

  const observer = new MutationObserver(() => {
    if (!isRepoHome() || observerTimer) return;

    observerTimer = setTimeout(() => {
      observerTimer = null;

      const filesTable = getFilesTable();
      const readmeBlock = getReadmeBlock();

      if (!filesTable || !readmeBlock) {
        scheduleMoveWithRetry({ attempts: 5, delay: 150 });
        return;
      }

      scheduleMove();
    }, 100);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleNavigation, {
      once: true,
    });
  } else {
    handleNavigation();
  }
})();
