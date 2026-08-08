// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      5.3.0
// @author       MrKoby07
// @description  Moves the entire rendered README block (several DOM levels up) above the entire file list block on GitHub repo home pages
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

  // Tune these two numbers if GitHub tweaks its markup depth.
  // They control how many parentElement hops we take from the
  // <article class="markdown-body"> and from the files <table>
  // before treating that ancestor as the "block" to move/anchor on.
  const README_LEVELS_UP = 4;
  const FILES_LEVELS_UP = 3;

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

  function climb(el, levels) {
    let node = el;
    for (let i = 0; i < levels && node?.parentElement; i++) {
      node = node.parentElement;
    }
    return node;
  }

  function moveReadme() {
    if (!isRepoHome()) return;

    const filesTable = getFilesTable();
    const readmeArticle = getReadmeArticle();
    if (!filesTable || !readmeArticle) return;

    const readmeBlock = climb(readmeArticle, README_LEVELS_UP);
    const filesBlock = climb(filesTable, FILES_LEVELS_UP);
    if (!readmeBlock || !filesBlock) return;
    if (readmeBlock === filesBlock) return;
    if (readmeBlock.contains(filesBlock) || filesBlock.contains(readmeBlock))
      return;

    const filesParent = filesBlock.parentElement;
    if (!filesParent) return;

    // Only reinsert if the README block isn't already immediately before
    // the files block, to avoid fighting React re-renders every tick.
    if (readmeBlock.nextElementSibling === filesBlock) return;

    filesParent.insertBefore(readmeBlock, filesBlock);
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
