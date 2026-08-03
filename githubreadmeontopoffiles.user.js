// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      5.0.0
// @author       MrKoby07
// @description  Moves the rendered repository README above the file list on GitHub repo home pages
// @license      MIT
// @sandbox      DOM
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

(function () {
  "use strict";

  let scheduled = false;
  let lastUrl = location.href;

  function isRepoHome() {
    if (location.hostname !== "github.com") return false;
    const parts = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    return parts.length === 2;
  }

  function getFilesTable() {
    return document.querySelector('table[aria-labelledby="folders-and-files"]');
  }

  function getReadmeArticle() {
    return document.querySelector(
      ".OverviewRepoFiles-moduleBox1OXeac article.markdown-body, article.markdown-body",
    );
  }

  function getFilesBlock() {
    const table = getFilesTable();
    if (!table) return null;

    return (
      table.closest(".OverviewContent-moduleBox11F19kY") ||
      table.closest("[data-hpc]") ||
      table.closest("div")
    );
  }

  function getReadmeBlock() {
    const article = getReadmeArticle();
    if (!article) return null;

    return (
      article.closest(".OverviewRepoFiles-moduleBox1OXeac") ||
      article.closest('[class*="OverviewRepoFiles-module"]') ||
      article.closest("section") ||
      article.closest("div")
    );
  }

  function getCommonContainer(a, b) {
    if (!a || !b) return null;

    let current = a.parentElement;
    while (current) {
      if (current.contains(b)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function moveReadme() {
    if (!isRepoHome()) return;

    const filesTable = getFilesTable();
    const readmeArticle = getReadmeArticle();
    if (!filesTable || !readmeArticle) return;

    const filesBlock = getFilesBlock();
    const readmeBlock = getReadmeBlock();
    if (!filesBlock || !readmeBlock) return;
    if (filesBlock === readmeBlock) return;

    const commonContainer = getCommonContainer(filesBlock, readmeBlock);
    if (!commonContainer) return;

    const relation = filesBlock.compareDocumentPosition(readmeBlock);
    const readmeAlreadyBefore = Boolean(
      relation & Node.DOCUMENT_POSITION_PRECEDING,
    );
    if (readmeAlreadyBefore) return;

    commonContainer.insertBefore(readmeBlock, filesBlock);
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
  document.addEventListener("readystatechange", scheduleMove);
  scheduleMove();
})();
