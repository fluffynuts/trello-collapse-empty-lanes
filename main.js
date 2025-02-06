(function () {
  // rewritten to use the native lane collapsing
  function $$(sel, parent) {
    return Array.from(
      (parent || document).querySelectorAll(sel)
    );
  }

  function $el(testId, parent) {
    return $$(`[data-testid=${ testId }]`, parent);
  }

  function hide(list) {
    const cardList = findCardContainer(list);
    if (!cardList) {
      return;
    }
    if (!isHidden(cardList)) {
      clickCollapse(list);
    }
  }

  function show(list) {
    const cardList = findCardContainer(list);
    if (!cardList) {
      return;
    }
    if (isHidden(cardList)) {
      clickCollapse(list);
    }
  }

  function findCardContainer(list) {
    const result = $el("list-cards", list)[0];
    if (!result) {
      console.error("can't find card list container on list", list);
    }
    return result;
  }

  function clickCollapse(list) {
    console.log("toggling list", list);
    const btn = $el("list-collapse-button", list)[0];
    if (btn) {
      btn.click();
    } else {
      console.error("can't find collapse button on list", list);
    }
  }

  function isHidden(el) {
    return hasAttribute(el, "hidden");
  }

  function hasAttribute(el, attrib) {
    return el.getAttribute(attrib) !== null;
  }

  function autoCollapse() {
    const lists = Array.from($el("list"));
    console.log("inspect lists", lists);
    for (const list of lists) {
      const cards = $el("list-card", list)
      console.log({
        list, cards
      });
      if (cards.length === 0) {
        hide(list);
      } else {
        show(list);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setInterval(autoCollapse, 200);
  });
})();
