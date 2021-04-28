(function () {
  "use strict";
  const
    hiddenClass = "hide",
    cardListClass = "list-wrapper",
    cardListSelector = "div." + cardListClass;

  const styleTag = document.createElement("style");
  styleTag.type = "text/css";
  styleTag.id = "lane-collapse";
  const textNode = document.createTextNode([
    `${cardListSelector}.collapsed { width: 50px }`,
    `${cardListSelector}.collapsed .list-header-name-assist { display: block; transform: rotate(180deg); writing-mode: vertical-lr; font-size: small; white-space: nowrap; margin-top: 20px; }`,
    `${cardListSelector}.collapsed textarea { display: none; }`,
    `${cardListSelector}.collapsed .list-header-target { transform: rotate(90deg); }`,
    `${cardListSelector}.collapsed .list-header-name { transform: rotate(90deg) }`,
    ".collapsed .js-add-a-card, .collapsed .icon-add, .collapsed .js-add-another-card, .collapsed .list-header-extras-limit-badge { display: none }",
    "a.list-card.collapsed { display: none !important }",
    ".collapsed .list-header-num-cards { transform: rotate(270deg); font-size: smaller; white-space: nowrap }",
  ].join("\n"));

  // console.log("adding style tag with:", textNode.textContent);
  styleTag.appendChild(textNode);
  document.head.appendChild(styleTag);

  const handlers = {
    mouseout: collapseIfEmpty,
    dragover: unCollapse,
    dragleave: collapseIfEmpty,
    drop: collapseIfEmpty,
    dragend: collapseIfEmpty
  };

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
      Array.from(el.querySelectorAll("a.list-card.collapsed"))
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
      const cards = Array.from(el.querySelectorAll("a.list-card"));
      cards.forEach(card => {
        card.classList.add("collapsed");
      });
    }, 0);
  }

  function collapseIfEmpty(el) {
    if (!el) {
      return;
    }
    const visibleCards = Array.from(el.querySelectorAll("a.list-card"))
      .filter(el => !el.classList.contains(hiddenClass));
    const hasListCard = !!visibleCards.length;
    const composer = el.querySelector("div.card-composer");
    const composerOpen = !!composer && Array.from(composer.classList).indexOf(hiddenClass) === -1;
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

  const composerObserver = new MutationObserver((mutationList, observer) => {
    for (let mutation of mutationList) {
      if (!mutation.target || !mutation.target.classList) {
        continue;
      }
      if (mutation.attributeName !== "class") {
        continue;
      }
      const
        classList = new Set(Array.from(mutation.target.classList)),
        affectsLanes = classList.has("card-composer") ||
          classList.has("list-card") ||
          classList.has("card-composer-container");
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
        return;
      }
      handledThisTime++;
      autoCollapse(el);
      startupCollapsed.push(el);
    });
    if (handledThisTime === 0) {
      missed++;
    }
    if (missed * delay > quitAt * 1000) {
      return;
    }
    window.setTimeout(initialCollapse, delay);
  }, delay);
})();
