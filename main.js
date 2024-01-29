(function () {
  function log(...args) {
    if (!document.body.getAttribute("debug")) {
      return;
    }
    if (typeof (args[0]) !== "string") {
      args[0] = JSON.stringify(args[0]);
    }
    args[0] = `[${ timestamp() }] ${ args[0] }`;
    console.log.apply(console, args);
  }


  "use strict";
  const
    cardListClass = "list-wrapper",
    composerSelector = "[data-testid=list-card-composer-textarea]",
    closeButtonSelector = "[data-testid=list-card-composer-cancel-button]",
    cardListSelector = `li[data-testid=${ cardListClass }]`;

  const styleTag = document.createElement("style");
  styleTag.type = "text/css";
  styleTag.id = "lane-collapse";
  const textNode = document.createTextNode([
    `${ cardListSelector }.collapsed { width: 50px }`,
    `${ cardListSelector }.collapsed [data-testid=list] { margin-top: 0px; top: 10px; display: block; transform: rotate(180deg); writing-mode: vertical-lr; font-size: small; white-space: nowrap; width: 50px; }`,
    `${ cardListSelector }.collapsed textarea { display: none; }`,
    `${ cardListSelector }.collapsed .list-header-target { transform: rotate(90deg); }`,
    `${ cardListSelector }.collapsed .list-header-name { transform: rotate(90deg) }`,
    `${ cardListSelector }.collapsed [data-testid=list-footer] { display: none; }`,
    `${ cardListSelector }.collapsed [data-testid=list-header] p { display: none; }`,
    `${ cardListSelector }.collapsed [data-testid=list-name] { pointer-events: none; }`, // prevent the header from disappearing when clicked
    ".collapsed button[data-testid=list-add-card-button], .collapsed .icon-add, .collapsed .js-add-another-card, .collapsed .list-header-extras-limit-badge { display: none }",
    "[data-testid=list-card].collapsed { display: none !important }",
    ".collapsed .list-header-num-cards { transform: rotate(270deg); font-size: smaller; white-space: nowrap }",
  ].join("\n"));

  log("adding style tag with:", textNode.textContent);
  styleTag.appendChild(textNode);
  document.head.appendChild(styleTag);

  const handlers = {
    mouseout: el => {
      collapseIfEmpty(el);
    },
    dragover: unCollapse,
    dragleave: collapseIfEmpty,
    drop: (el) => {
      collapseIfEmpty(el)
      Array.from(document.querySelectorAll("[data-testid=list-wrapper]"))
        .forEach(scheduleCollapseCheck);
    },
  };

  let lastFilterData = undefined;

  function handleFilters() {
    const k = findFilterKey();
    if (!k) {
      if (!!lastFilterData) {
        lastFilterData = undefined;
        log("filter removed, uncollapsing");
        applyLogicToAllLanes();
      }
      return window.setTimeout(handleFilters, 1000);
    }

    const
      stored = localStorage.getItem(k);
    log({
      lastFilterData,
      stored
    })
    if (stored !== lastFilterData) {
      log("filters changed, applying");
      lastFilterData = stored;
      applyLogicToAllLanes();
    }
    window.setTimeout(handleFilters, 1000);
  }

  function applyLogicToAllLanes() {
    const lanes = Array.from(document.querySelectorAll(cardListSelector));
    for (const lane of lanes) {
      collapseIfEmpty(lane);
    }
  }

  function findFilterKey() {
    for (let i = 0; i < localStorage.length; i++) {
      const test = localStorage.key(i);
      if (test.startsWith("boardCardFilterSettings")) {
        return test;
      }
    }
    return undefined;
  }

  function defineDataProp(el) {
    if (!el) {
      return;
    }
    if (el.data) {
      return;
    }
    Object.defineProperties(el, {
      data: {
        enumerable: true,
        get() {
          return JSON.parse(el.getAttribute("data-auto-collapse") || "{}");
        },
        set(val) {
          el.setAttribute("data-auto-collapse", JSON.stringify(val));
        }
      },
    });
  }

  function timestamp() {
    const now = new Date();
    return [
      now.getFullYear(),
      ".",
      zeroPad(now.getMonth() + 1),
      ".",
      zeroPad(now.getDate()),
      " ",
      zeroPad(now.getHours()),
      ":",
      zeroPad(now.getMinutes()),
      ":",
      zeroPad(now.getSeconds())
    ].join("");
  }

  function zeroPad(value) {
    let result = `${ value }`;
    while (result.length < 2) {
      result = `0${ result }`
    }
    return result;
  }

  function autoCollapse(el) {
    defineDataProp(el);
    if (el.data.initialized) {
      return; // already auto-collapsing
    }
    el.data.initialized = true;
    collapseIfEmpty(el);
    el.childNodes.forEach(cn => {
      Object.keys(handlers).forEach(evName => {
        cn.addEventListener(evName, () => {
          handlers[evName](el);
        });
      });
    });
  }

  function unCollapse(el) {
    if (!el) {
      return;
    }
    defineDataProp(el);
    el.classList.remove("collapsed");
    setTimeout(() => {
      Array.from(el.querySelectorAll("li[data-testid=list-card].collapsed"))
        .forEach(card => card.classList.remove("collapsed"));
    }, 0);
  }

  function collapse(el) {
    if (!el) {
      return;
    }
    if (el.classList.contains("js-add-list")) {
      return;
    }
    defineDataProp(el);
    el.classList.add("collapsed");
    setTimeout(() => {
      const cards = Array.from(el.querySelectorAll("li[data-testid=list-card]"));
      cards.forEach(card => {
        card.classList.add("collapsed");
      });
    }, 0);
  }

  function collapseIfEmpty(el) {
    if (!el) {
      return;
    }
    const visibleCards = Array.from(el.querySelectorAll("li[data-testid=list-card]"))
      .filter(el => el.getAttribute("hidden") === null);
    const hasListCard = !!visibleCards.length;
    const composer = el.querySelector(composerSelector);
    const composerOpen = !!composer;
    if (hasListCard || composerOpen) {
      unCollapse(el);
    } else {
      collapse(el);
    }
  }

  function isPlaceholder(node) {
    return node.tagName === "A" &&
      node.classList.contains("placeholder");
  }

  const observer = new MutationObserver((mutationList, observer) => {
    for (let mutation of mutationList) {
      const addedNodes = Array.from(mutation.addedNodes);
      addedNodes.forEach(node => {
        if (!node.querySelectorAll) {
          return;
        }
        Array.from(node.querySelectorAll(cardListSelector)).forEach(el => {
          autoCollapse(el);
        });
        if (isPlaceholder(node)) {
          // new placeholder -- ensure droppable surface is large enough
          scheduleCollapseCheckForClosestWrapper(node);
        }
        Array.from(node.querySelectorAll("a.list-card")).forEach(el => {
          scheduleCollapseCheckForClosestWrapper(node);
        });

        // add bindings for friendlier collapse/uncollapse when adding cards
        const addButtons = Array.from(node.querySelectorAll(".js-add-card"));
        for (const btn of addButtons) {
          if (btn.getAttribute("bound-by-me") !== null) {
            return;
          }
          btn.setAttribute("bound-by-me", "foo");
          btn.addEventListener("click", () => {
            applyLogicToAllLanesWhen(() => {
              const haveComposer = !!document.querySelector(composerSelector);
              const closeButton = document.querySelector(closeButtonSelector);
              if (closeButton) {
                if (closeButton.getAttribute("data-bound") === null) {
                  closeButton.setAttribute("data-bound", "yes");
                  closeButton.addEventListener("click", () =>
                    applyLogicToAllLanesWhen(
                      () => {
                        const composer = document.querySelector(composerSelector);
                        const button = document.querySelector(closeButtonSelector);
                        return !composer && !button
                      }
                    )
                  );
                }
              }
              return haveComposer && !!closeButton;
            });
            window.setTimeout(applyLogicToAllLanes, 1000);
          });
        }

      });
      const removedNodes = Array.from(mutation.removedNodes);
      removedNodes.forEach(node => {
        if (!node.querySelectorAll) {
          return;
        }
        if (isPlaceholder(node)) {
          Array.from(
            document.querySelectorAll(cardListSelector)
          ).forEach(scheduleCollapseCheck);
        }
      });
    }
  });
  observer.observe(document, { childList: true, subtree: true });

  function applyLogicToAllLanesWhen(
    test
  ) {
    if (test()) {
      applyLogicToAllLanes();
      return;
    }
    window.setTimeout(() => applyLogicToAllLanesWhen(test), 100);
  }

  const composerObserver = new MutationObserver((mutationList, observer) => {
    for (let mutation of mutationList) {
      if (!mutation.target || !mutation.target.classList) {
        continue;
      }
      if (mutation.attributeName !== "class") {
        continue;
      }
      const
        attributeNames = new Set(Array.from(mutation.target.getAttributeNames())),
        seek = new Set([ "card-composer", "list-card", "card-composer-container" ]),
        affectsLanes = attributeNames.has("data-testid") && seek.has(mutation.target.getAttribute("data-testid"));
      if (!affectsLanes) {
        continue;
      }
      scheduleCollapseCheckForClosestWrapper(mutation.target);
    }
  });
  composerObserver.observe(document, { childList: false, attributes: true, subtree: true });

  const scheduled = new Set();

  function scheduleCollapseCheckForClosestWrapper(subEl) {
    scheduleCollapseCheck(subEl.closest(cardListSelector));
  }

  function scheduleCollapseCheck(laneEl) {
    if (scheduled.has(laneEl)) {
      return;
    }
    scheduled.add(laneEl);
    setTimeout(() => {
      const toCheck = Array.from(scheduled);
      scheduled.clear();
      for (let el of toCheck) {
        setTimeout(() => {
          collapseIfEmpty(el);
        }, 0);
      }
    }, 100);
  }

  const
    startupCollapsed = [],
    delay = 50,
    quitAt = 10;
  let // quit initial collapse after 10 seconds
    missed = 0;
  window.setTimeout(function initialCollapse() {
    // catch the lanes which should be initially collapsed
    // - done in a delayed interval because I've seen some stragglers
    //   hang around; would have expected the mutation observer to
    //   notice them, but it doesn't, however dragging a card over
    //   that lane and back out again prompts a mutation-observer-initiated
    //   collapse ¯\_(ツ)_/¯
    let handledThisTime = 0;
    Array.from(document.querySelectorAll(cardListSelector)).forEach(el => {
      if (startupCollapsed.indexOf(el) > -1) {
        return handleFilters();
      }
      handledThisTime++;
      autoCollapse(el);
      startupCollapsed.push(el);
    });
    if (handledThisTime === 0) {
      missed++;
    }
    if (missed * delay > quitAt * 1000) {
      return handleFilters();
    }
    window.setTimeout(initialCollapse, delay);
  }, delay);
})();
