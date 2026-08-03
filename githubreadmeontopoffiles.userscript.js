// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      3.0
// @description  Moves the repository README above the file list on GitHub repository home pages
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
// ==/UserScript==

(function () {
  "use strict";

  let scheduled = false;
  let lastUrl = location.href;

  function isRepoRootPath(pathname) {
    const clean = pathname.replace(/^\/+|\/+$/g, "");
    const parts = clean.split("/").filter(Boolean);
    return parts.length === 2;
  }

  function getMain() {
    return document.querySelector("main");
  }

  function getReadme(main) {
    return main?.querySelector("#readme") || null;
  }

  function getFiles(main) {
    return (
      main?.querySelector('[aria-labelledby="folders-and-files"]') ||
      main?.querySelector('table[aria-labelledby="folders-and-files"]') ||
      main?.querySelector('[aria-labelledby="files"]') ||
      main?.querySelector(".js-navigation-container") ||
      null
    );
  }

  function getMovableContainer(node) {
    return node?.closest("section, div[data-testid], div.Box, div") || null;
  }

  function isEligiblePage() {
    if (location.hostname !== "github.com") return false;
    if (!isRepoRootPath(location.pathname)) return false;

    const main = getMain();
    if (!main) return false;

    const readme = getReadme(main);
    const files = getFiles(main);

    return Boolean(readme && files);
  }

  function moveReadme() {
    if (!isEligiblePage()) return;

    const main = getMain();
    const readme = getReadme(main);
    const files = getFiles(main);

    if (!readme || !files) return;

    const readmeBox = getMovableContainer(readme);
    const filesBox = getMovableContainer(files);

    if (!readmeBox || !filesBox) return;
    if (!filesBox.parentElement) return;
    if (readmeBox === filesBox) return;
    if (readmeBox.parentElement !== filesBox.parentElement) return;

    const relation = filesBox.compareDocumentPosition(readmeBox);
    const alreadyBefore = Boolean(relation & Node.DOCUMENT_POSITION_PRECEDING);

    if (alreadyBefore) return;

    filesBox.parentElement.insertBefore(readmeBox, filesBox);
  }

  function scheduleMove() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      moveReadme();
    });
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
    }
    scheduleMove();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("load", scheduleMove, { once: true });
  document.addEventListener("DOMContentLoaded", scheduleMove, { once: true });
  scheduleMove();
})();
