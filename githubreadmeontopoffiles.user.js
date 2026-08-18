// ==UserScript==
// @name         GitHub README before files
// @namespace    https://github.com/
// @version      6.0.0
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

  const RETRY_ATTEMPTS = 50;
  const RETRY_DELAY_MS = 100;

  const FILES_CONTAINER_CLASS = "gh-readme-files-container";
  const COMMIT_BAR_CLASS = "gh-readme-commit-bar";
  const README_CLASS = "gh-readme-before-files";
  const FILE_TABLE_CLASS = "gh-readme-file-table";

  let retryTimer = null;
  let observerTimer = null;
  let navigationId = 0;
  let scheduled = false;
  const style = document.createElement("style");
  style.textContent = `
    /*
     * Visual order:
     *
     * repository toolbar
     * latest commit / commit count
     * README
     *
     * folders and files
     */
    .${FILES_CONTAINER_CLASS} {
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }

    .${FILES_CONTAINER_CLASS} > .${COMMIT_BAR_CLASS} {
      order: 1 !important;
    }

    .${FILES_CONTAINER_CLASS} > .${README_CLASS} {
      order: 2 !important;
    }

    .${FILES_CONTAINER_CLASS} > .${FILE_TABLE_CLASS} {
      order: 3 !important;
    }

    /*
     * The latest-commit bar visually joins the README card.
     * It keeps the upper card corners, while its lower edge is square.
     */
    .${COMMIT_BAR_CLASS} {
      margin: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    /*
     * README continues directly below the commit bar.
     * Its upper corners are removed so the two sections read as one card.
     */
    .${README_CLASS} {
      position: relative !important;
      z-index: 0 !important;
      isolation: auto !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
    }

    /*
     * GitHub's README is composed of several nested card wrappers.
     * Flatten their top corners to prevent double rounding below the commit bar.
     */
    .${README_CLASS} > [class*="OverviewRepoFiles-module__Box_2"],
    .${README_CLASS} > [class*="OverviewRepoFiles-module__Box_2"] > *,
    .${README_CLASS} [class*="OverviewRepoFiles-module__Box_3"] {
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
    }

    /*
     * The file browser begins a distinct card after the README.
     * Use GitHub's normal 16px spacing token, with a safe fallback.
     */
    .${FILE_TABLE_CLASS} {
      margin-top: var(--base-size-7, 7px) !important;
    }

    /*
     * Restore the file table's upper corners because it is no longer
     * visually connected to the README panel.
     */
    .${FILE_TABLE_CLASS} > table {
      margin-top: 0 !important;
      border-top-left-radius: var(--borderRadius-medium, 6px) !important;
      border-top-right-radius: var(--borderRadius-medium, 6px) !important;
    }

    /*
     * Preserve full rounding for the bottom of the file-browser card.
     */
    .${FILE_TABLE_CLASS} > table:last-of-type {
      border-bottom-left-radius: var(--borderRadius-medium, 6px) !important;
      border-bottom-right-radius: var(--borderRadius-medium, 6px) !important;
    }

    /*
     * Keep GitHub menus, dialogs, dropdowns, and popovers above the
     * repositioned README and file browser.
     */
    details[open] > details-menu,
    details[open] > details-dialog,
    details-menu,
    details-dialog,
    .Overlay,
    .Popover,
    [data-target="action-menu.menu"],
    [popover]:popover-open,
    [data-portal-root],
    [data-target="portal-root"] {
      z-index: 1000 !important;
    }
  `;
  (document.head || document.documentElement).append(style);

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

  function getReadmeBlock() {
    const candidates = [
      ...document.querySelectorAll('[class*="OverviewRepoFiles-module"]'),
    ].filter((element) => element.querySelector("article.markdown-body"));

    return (
      candidates.find(
        (element) =>
          !candidates.some(
            (other) => other !== element && other.contains(element),
          ),
      ) || null
    );
  }

  function getBrowserContainer(readme) {
    const heading = document.getElementById("folders-and-files");

    if (!heading || !readme?.parentElement) return null;

    let node = heading;

    while (node.parentElement && node.parentElement !== readme.parentElement) {
      node = node.parentElement;
    }

    return node.parentElement === readme.parentElement ? node : null;
  }

  function getCommitBar(browserContainer) {
    return (
      browserContainer.querySelector(
        '[class*="DirectoryContent-module__Box_3"]',
      ) ||
      browserContainer
        .querySelector('[data-testid="latest-commit"]')
        ?.closest("div[data-hpc] > div") ||
      null
    );
  }

  function getTableBlock(browserContainer) {
    const heading = browserContainer.querySelector("#folders-and-files");
    const table = browserContainer.querySelector(
      'table[aria-labelledby="folders-and-files"]',
    );

    if (!heading || !table) return null;

    let block = browserContainer.querySelector(`:scope > .${FILE_TABLE_CLASS}`);

    if (block) return block;

    block = document.createElement("div");
    block.className = FILE_TABLE_CLASS;

    browserContainer.insertBefore(block, heading);
    block.append(heading, table);

    const dropzone = browserContainer.querySelector(
      ":scope > document-dropzone",
    );

    if (dropzone) {
      block.append(dropzone);
    }

    return block;
  }

  function insertReadmeAsSibling(browserContainer, readme, tableBlock) {
    if (readme.parentElement === browserContainer) return true;

    browserContainer.insertBefore(readme, tableBlock);
    return true;
  }

  function applyLayout() {
    if (!isRepoHome()) return false;

    const readme = getReadmeBlock();
    const browserContainer = getBrowserContainer(readme);

    if (!readme || !browserContainer) return false;

    const commitBar = getCommitBar(browserContainer);
    const tableBlock = getTableBlock(browserContainer);

    if (!commitBar || !tableBlock) return false;

    insertReadmeAsSibling(browserContainer, readme, tableBlock);

    browserContainer.classList.add(FILES_CONTAINER_CLASS);
    commitBar.classList.add(COMMIT_BAR_CLASS);
    readme.classList.add(README_CLASS);
    tableBlock.classList.add(FILE_TABLE_CLASS);

    return true;
  }

  function scheduleLayout() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      applyLayout();
    });
  }

  function scheduleLayoutWithRetry({
    attempts = RETRY_ATTEMPTS,
    delay = RETRY_DELAY_MS,
  } = {}) {
    clearTimeout(retryTimer);

    const thisNavigation = ++navigationId;
    const expectedPath = getRepositoryPath();

    const attempt = (remaining) => {
      if (
        thisNavigation !== navigationId ||
        !isRepoHome() ||
        getRepositoryPath() !== expectedPath
      ) {
        return;
      }

      if (applyLayout()) return;

      if (remaining > 0) {
        retryTimer = setTimeout(() => {
          attempt(remaining - 1);
        }, delay);
      }
    };

    requestAnimationFrame(() => attempt(attempts));
  }

  function handleNavigation() {
    scheduleLayoutWithRetry();
  }

  document.addEventListener("turbo:load", handleNavigation);
  document.addEventListener("turbo:render", scheduleLayout);
  document.addEventListener("pjax:end", handleNavigation);
  window.addEventListener("pageshow", handleNavigation);

  const observer = new MutationObserver(() => {
    if (!isRepoHome() || observerTimer) return;

    observerTimer = setTimeout(() => {
      observerTimer = null;
      scheduleLayout();
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
