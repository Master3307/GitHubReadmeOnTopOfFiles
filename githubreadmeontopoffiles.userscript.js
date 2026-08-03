// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      4.0
// @description  Moves the rendered repository README above the file list on GitHub repo home pages
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

  let rafId = 0;
  let lastUrl = location.href;

  function isRepoHome() {
    if (location.hostname !== "github.com") return false;
    const parts = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    return parts.length === 2;
  }

  function getReadmeSection() {
    const readme = document.querySelector("#readme");
    if (!readme) return null;
    return readme.closest("section") || readme.parentElement;
  }

  function getFilesSection() {
    const heading = [...document.querySelectorAll("h2, h3")].find((el) =>
      /folders?\s+and\s+files/i.test(el.textContent || ""),
    );

    if (heading) {
      return heading.closest("section, div");
    }

    return (
      document
        .querySelector('[aria-labelledby="folders-and-files"]')
        ?.closest("section, div") ||
      document
        .querySelector('table[aria-labelledby="folders-and-files"]')
        ?.closest("section, div") ||
      document.querySelector('[role="tree"]')?.closest("section, div") ||
      null
    );
  }

  function moveReadme() {
    if (!isRepoHome()) return;

    const readmeSection = getReadmeSection();
    const filesSection = getFilesSection();

    if (!readmeSection || !filesSection) return;
    if (!readmeSection.parentElement || !filesSection.parentElement) return;
    if (readmeSection === filesSection) return;
    if (readmeSection.parentElement !== filesSection.parentElement) return;

    const relation = filesSection.compareDocumentPosition(readmeSection);
    const readmeAlreadyBefore = Boolean(
      relation & Node.DOCUMENT_POSITION_PRECEDING,
    );
    if (readmeAlreadyBefore) return;

    filesSection.parentElement.insertBefore(readmeSection, filesSection);
  }

  function scheduleMove() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
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
