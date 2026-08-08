// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      5.1.0
// @author       MrKoby07
// @description  Moves the rendered repository README above the complete files section on GitHub repo home pages
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

  const style = document.createElement("style");
  style.textContent = `
    .readme-on-top-files-block:has(
      button[aria-label="Add file"][aria-expanded="true"]
    ) {
      position: relative !important;
      z-index: 10 !important;
    }
  `;
  document.documentElement.append(style);

  function isRepoHome() {
    const parts = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    return location.hostname === "github.com" && parts.length === 2;
  }

  function getFilesTable() {
    return document.querySelector('table[aria-labelledby="folders-and-files"]');
  }

  function getReadmeArticle() {
    return document.querySelector("article.markdown-body");
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

  function getDirectChildOf(parent, child) {
    let node = child;

    while (node?.parentElement && node.parentElement !== parent) {
      node = node.parentElement;
    }

    return node?.parentElement === parent ? node : null;
  }

  function getBlocks() {
    const filesTable = getFilesTable();
    const readmeArticle = getReadmeArticle();

    if (!filesTable || !readmeArticle) return null;

    const container = getLowestCommonAncestor(filesTable, readmeArticle);
    if (!container) return null;

    const filesBlock = getDirectChildOf(container, filesTable);
    const readmeBlock = getDirectChildOf(container, readmeArticle);

    if (!filesBlock || !readmeBlock || filesBlock === readmeBlock) {
      return null;
    }

    return { container, filesBlock, readmeBlock };
  }

  function moveReadme() {
    if (!isRepoHome()) return;

    const blocks = getBlocks();
    if (!blocks) return;

    const { container, filesBlock, readmeBlock } = blocks;

    filesBlock.classList.add("readme-on-top-files-block");

    const readmeIsAlreadyBeforeFiles = Boolean(
      filesBlock.compareDocumentPosition(readmeBlock) &
      Node.DOCUMENT_POSITION_PRECEDING,
    );

    if (!readmeIsAlreadyBeforeFiles) {
      container.insertBefore(readmeBlock, filesBlock);
    }
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
