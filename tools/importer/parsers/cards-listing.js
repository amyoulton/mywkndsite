/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-listing. Base: cards.
 *
 * Variant A — plain listing (2 columns, library Cards convention). Block: `cards-listing`.
 *   Source: https://wknd.site/us/en.html (Recent Articles + Next Adventures lists),
 *           https://wknd.site/us/en/magazine.html
 *   Selector: .image-list.list
 *   cell 1 = image (.cmp-image-list__item-image img)
 *   cell 2 = <p><strong><a href>title</a></strong></p> + <p>description</p>
 *
 * Variant B — filter listing. Block: `Cards Listing (filter)` -> class `cards-listing filter`.
 *   Source: https://wknd.site/us/en/adventures.html
 *   Selector: main.cmp-layout-container--fixed .tabs.panelcontainer
 *   One row per card of the "All" tab panel, in source order (the other panels repeat those cards).
 *   cell 1 = image, cell 2 = same text cell as variant A (Cards convention), plus a project-specific
 *   cell 3 = comma-separated labels of the non-"All" tabs whose panel holds a card with the same href
 *            (empty when none). blocks/cards-listing/cards-listing.js (.filter option) detaches the
 *            last cell of 3+-cell rows into data-categories and builds the filter bar from it.
 *
 * blocks/cards-listing/cards-listing.js uses the first heading-or-<p> as title, undoes the
 * bold-link button decoration, and re-links the image with the first body link.
 *
 * Validated against source.html (home + adventures tabs):
 *   ul.cmp-image-list > li.cmp-image-list__item > article.cmp-image-list__item-content
 *     > a.cmp-image-list__item-image-link > .cmp-image-list__item-image img.cmp-image__image
 *     > a.cmp-image-list__item-title-link > span.cmp-image-list__item-title
 *     > span.cmp-image-list__item-description
 *   .cmp-tabs > ol.cmp-tabs__tablist > li.cmp-tabs__tab#{id}-tab
 *             > div.cmp-tabs__tabpanel#{id}-tabpanel > .image-list.list > ul.cmp-image-list
 * Iteration is keyed on the block-level <li>/<article> wrappers, never on the sibling anchors
 * (adjacent same-href anchors can be merged by html2md preprocessing).
 */

function getItems(root) {
  let items = Array.from(root.querySelectorAll('li.cmp-image-list__item'));
  if (!items.length) items = Array.from(root.querySelectorAll('article.cmp-image-list__item-content'));
  if (!items.length) items = Array.from(root.querySelectorAll(':scope ul > li, :scope ol > li'));
  return items;
}

function itemHref(item) {
  const link = item.querySelector('a.cmp-image-list__item-title-link') || item.querySelector('a[href]');
  return link ? link.getAttribute('href') || '' : '';
}

// Compare links independent of origin, query and hash.
function normalizeHref(href) {
  return (href || '').trim().replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '').replace(/\/$/, '');
}

function buildRow(item, document) {
  const img = item.querySelector('.cmp-image-list__item-image img, .cmp-image img, img');
  const titleLink = item.querySelector('a.cmp-image-list__item-title-link');
  const titleEl = item.querySelector('.cmp-image-list__item-title');
  const descEl = item.querySelector('.cmp-image-list__item-description');
  const href = itemHref(item);
  const title = (titleEl || titleLink || { textContent: '' }).textContent.trim();

  const text = [];
  if (title) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    if (href) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = title;
      strong.append(a);
    } else {
      strong.textContent = title;
    }
    p.append(strong);
    text.push(p);
  }
  if (descEl && descEl.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = descEl.textContent.trim();
    text.push(p);
  }

  if (!img && !text.length) return null;
  return [img || '', text.length ? text : ''];
}

/**
 * Tabs container: pair each tab with its panel (id "{x}-tab" -> "{x}-tabpanel", then
 * aria-controls, then document order), take cards from the "All" panel and categories
 * from the other panels.
 */
function parseTabs(element, document) {
  const tabs = Array.from(element.querySelectorAll('.cmp-tabs__tab'));
  const panels = Array.from(element.querySelectorAll('.cmp-tabs__tabpanel'));
  if (!panels.length) return null;

  const pairs = tabs.map((tab, i) => {
    let panel = null;
    const id = tab.getAttribute('id') || '';
    if (id.endsWith('-tab')) panel = panels.find((p) => p.getAttribute('id') === `${id}panel`) || null;
    const controls = tab.getAttribute('aria-controls');
    if (!panel && controls) panel = panels.find((p) => p.getAttribute('id') === controls) || null;
    if (!panel) panel = panels[i] || null;
    return { label: tab.textContent.trim(), panel };
  });

  let allIndex = pairs.findIndex((p) => p.label.toLowerCase() === 'all');
  if (allIndex < 0) allIndex = 0;
  const allPanel = (pairs[allIndex] && pairs[allIndex].panel) || panels[0];

  // href -> [category labels], in tab order.
  const categories = new Map();
  pairs.forEach(({ label, panel }, i) => {
    if (i === allIndex || !panel || !label || panel === allPanel) return;
    getItems(panel).forEach((item) => {
      const key = normalizeHref(itemHref(item));
      if (!key) return;
      if (!categories.has(key)) categories.set(key, []);
      const list = categories.get(key);
      if (!list.includes(label)) list.push(label);
    });
  });

  const cells = [];
  getItems(allPanel).forEach((item) => {
    const row = buildRow(item, document);
    if (!row) return;
    const labels = categories.get(normalizeHref(itemHref(item))) || [];
    row.push(labels.join(', '));
    cells.push(row);
  });
  return cells;
}

export default function parse(element, { document }) {
  const isTabs = element.matches('.tabs.panelcontainer, .cmp-tabs') || !!element.querySelector('.cmp-tabs');

  let cells;
  let variants = [];
  if (isTabs) {
    cells = parseTabs(element, document) || [];
    variants = ['filter'];
  } else {
    cells = getItems(element).map((item) => buildRow(item, document)).filter(Boolean);
  }

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-listing', variants, cells });
  element.replaceWith(block);
}
