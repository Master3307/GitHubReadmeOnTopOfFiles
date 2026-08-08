// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      5.2.0
// @author       MrKoby07
// @description  Visually moves the rendered repository README above the file list on GitHub repo home pages (no DOM re-parenting)
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

  const READY_CLASS = "readme-order-fixed";
  let scheduled = false;

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
    for (let n = a; n; n = n.parentElement) ancestors.add(n);
    for (let n = b; n; n = n.parentElement) if (ancestors.has(n)) return n;
    return null;
  }

  function getDirectChildOf(parent, child) {
    let node = child;
    while (node?.parentElement && node.parentElement !== parent) {
      node = node.parentElement;
    }
    return node?.parentElement === parent ? node : null;
  }
  function applyOrder() {
    if (!isRepoHome()) return;

    const filesTable = getFilesTable();
    const readmeArticle = getReadmeArticle();
    if (!filesTable || !readmeArticle) return;

    const container = getLowestCommonAncestor(filesTable, readmeArticle);
    if (!container) return;

    const filesBlock = getDirectChildOf(container, filesTable);
    const readmeBlock = getDirectChildOf(container, readmeArticle);
    if (!filesBlock || !readmeBlock || filesBlock === readmeBlock) return;

    if (!container.classList.contains(READY_CLASS)) {
      container.classList.add(READY_CLASS);
      container.style.display = "flex";
      container.style.flexDirection = "column";
    }

    readmeBlock.style.order = "-1";
    filesBlock.style.order = "1";
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyOrder();
    });
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  document.addEventListener("turbo:render", scheduleApply);
  document.addEventListener("pjax:end", scheduleApply);
  window.addEventListener("pageshow", scheduleApply);

  scheduleApply();
})();
