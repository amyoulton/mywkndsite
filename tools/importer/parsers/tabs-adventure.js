/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-adventure. Base: tabs.
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html
 * Selector: main.cmp-layout-container--fixed .tabs.panelcontainer
 *
 * Output: one row per tab, 2 cells: tab label | rich panel content
 * (paragraphs, images, bold sub-labels, lists).
 *
 * Validated against source.html:
 *   <ol class="cmp-tabs__tablist">
 *     <li id="{id}-tab" class="cmp-tabs__tab">Overview</li> ...
 *   </ol>
 *   <div id="{id}-tabpanel" class="cmp-tabs__tabpanel">
 *     <div class="contentfragment"><article class="cmp-contentfragment">
 *       <h3 class="cmp-contentfragment__title">Bali Surf Camp</h3>        (excluded)
 *       <div class="cmp-contentfragment__elements">
 *         <div><div class="aem-Grid ..."></div></div>                      (empty wrappers, excluded)
 *         <div><p>..</p><div class="aem-Grid"><div class="image">..<img>..</div></div><p>..</p></div>
 *
 * Tabs and panels are paired by id ({id}-tab -> {id}-tabpanel), falling back to index,
 * because the panel wrappers can be mis-nested in captured markup.
 */
const CONTENT_SELECTOR = 'p, ul, ol, table, blockquote, h1, h2, h4, h5, h6, picture, img';

function collectPanelContent(panel) {
  if (!panel) return [];
  const root = panel.querySelector('.cmp-contentfragment__elements') || panel;
  return Array.from(root.querySelectorAll(CONTENT_SELECTOR))
    // Only content that belongs to this panel (guard against nested/mis-nested panels).
    .filter((el) => el.closest('.cmp-tabs__tabpanel') === panel || !panel.classList.contains('cmp-tabs__tabpanel'))
    // Keep outermost matches only (e.g. img inside p stays with the p).
    .filter((el) => {
      let parent = el.parentElement;
      while (parent && parent !== root) {
        if (parent.matches(CONTENT_SELECTOR)) return false;
        parent = parent.parentElement;
      }
      return true;
    })
    .filter((el) => el.matches('picture, img') || el.querySelector('img, picture') || el.textContent.replace(/ /g, ' ').trim());
}

export default function parse(element, { document }) {
  const tabs = Array.from(element.querySelectorAll('.cmp-tabs__tab, [role="tab"]'))
    .filter((el, idx, arr) => !arr.some((other) => other !== el && other.contains(el)));
  const panels = Array.from(element.querySelectorAll('.cmp-tabs__tabpanel, [role="tabpanel"]'));

  const cells = [];
  tabs.forEach((tab, idx) => {
    const label = tab.textContent.replace(/\s+/g, ' ').trim();
    let panel = null;
    const panelId = tab.getAttribute('aria-controls')
      || (tab.id && tab.id.replace(/-tab$/, '-tabpanel'));
    if (panelId) panel = panels.find((p) => p.id === panelId) || null;
    if (!panel) panel = panels[idx] || null;

    const content = collectPanelContent(panel);
    if (!label && !content.length) return;
    cells.push([label || `Tab ${idx + 1}`, content.length ? content : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-adventure', cells });
  element.replaceWith(block);
}
