/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND section breaks + Section Metadata.
 * Driven by payload.template.sections from tools/importer/page-templates.json.
 *
 * adventures template:
 *  1 Breadcrumb        .breadcrumb.cmp-breadcrumb--fixed           (removed by wknd-cleanup)
 *  2 Hero image slider .carousel.panelcontainer.cmp-carousel--mini
 *  3 Adventure details main.cmp-layout-container--fixed            style: adventure-details
 *
 * home template (no styled sections -> breaks only, no Section Metadata):
 *  1 Hero carousel     .carousel.panelcontainer.cmp-carousel--hero  (first: no break)
 *  2 Featured article  .teaser.cmp-teaser--featured
 *  3 Recent Articles   .teaser.cmp-teaser--featured + .title.cmp-title--underline
 *  4 Next Adventures   .separator + .title.cmp-title--underline
 *
 * magazine template (no blocks; all default content):
 *  1 Article hero image  main.--fixed > .cmp-container > .aem-Grid > .image   (first: no break)
 *  2 Breadcrumb          main.--fixed > .cmp-container > .aem-Grid > .breadcrumb (removed by
 *                        wknd-cleanup; its break collapses via collapseEmptyBreaks())
 *  3 Article body        main.--fixed main.container > .cmp-container > .title  style: article
 *  4 Author bio          main.--fixed main.container .experiencefragment     style: author-bio
 *  5 Article sidebar     aside.cmp-layoutcontainer--sidebar                  style: article-sidebar
 *  Result: [hero img] --- [article] --- [bio] --- [sidebar]. The bio XF's own
 *  .separator and the sidebar's hidden .separator are removed by wknd-cleanup.
 *
 * Breaks are inserted in beforeTransform (before parsers replace section elements);
 * Section Metadata is inserted in afterTransform, anchored to a marker <hr>.
 * Run after wknd-cleanup so removeLeadingBreak() can drop the break left
 * behind by the removed breadcrumb section.
 *
 * Ordering note (home): section 4's selector depends on the AEM `.separator`
 * component. wknd-cleanup removes `.separator` only in afterTransform, so it is
 * still present when this transformer resolves selectors in beforeTransform
 * (cleanup's beforeTransform runs first but does not touch separators). The
 * inserted <hr> sits between the separator and the title, so removing the
 * separator later leaves exactly one break. Bare <hr> breaks are never removed
 * by cleanup (it targets `.separator` / `hr.cmp-separator__horizontal-rule`).
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors - first match wins.
function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// Remove an <hr> that has no authorable content before it (e.g. when the
// preceding Breadcrumb section was stripped by the cleanup transformer),
// so the page does not start with an empty section.
function removeLeadingBreak(root) {
  const firstHr = root.querySelector('hr');
  if (!firstHr) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 1 | 4); // elements + text
  let node = walker.nextNode();
  while (node && node !== firstHr) {
    if (node.nodeType === 3) {
      if (node.textContent.replace(/ /g, ' ').trim() !== '') return;
    } else if (/^(IMG|PICTURE|VIDEO|TABLE|IFRAME)$/.test(node.tagName)) {
      return;
    }
    node = walker.nextNode();
  }
  if (!firstHr.hasAttribute(SECTION_MARKER_ATTR)) firstHr.remove();
}

function isSectionBreak(hr) {
  // AEM separator rules are not section breaks (and are removed by wknd-cleanup).
  return !hr.classList.contains('cmp-separator__horizontal-rule');
}

function hasContentBetween(root, start, end) {
  const walker = root.ownerDocument.createTreeWalker(root, 1 | 4); // elements + text
  walker.currentNode = start;
  let node = walker.nextNode();
  while (node && node !== end) {
    if (node.nodeType === 3) {
      if (node.textContent.replace(/ /g, ' ').trim() !== '') return true;
    } else if (/^(IMG|PICTURE|VIDEO|TABLE|IFRAME)$/.test(node.tagName)) {
      return true;
    }
    node = walker.nextNode();
  }
  return false;
}

// Collapse two section breaks with nothing authorable between them (e.g. the
// magazine Breadcrumb section's break, left directly before the Article body
// break once wknd-cleanup has removed the breadcrumb). Keeps the marked break
// so the styled section's Section Metadata still has its anchor.
// No-op on adventures/home: every pair of breaks there has block/default content between.
function collapseEmptyBreaks(root) {
  const breaks = [...root.querySelectorAll('hr')].filter(isSectionBreak);
  let prev = null;
  breaks.forEach((hr) => {
    if (!prev) { prev = hr; return; }
    if (hasContentBetween(root, prev, hr)) { prev = hr; return; }
    if (!prev.hasAttribute(SECTION_MARKER_ATTR)) {
      prev.remove();
      prev = hr;
    } else if (!hr.hasAttribute(SECTION_MARKER_ATTR)) {
      hr.remove();
    } else {
      prev = hr;
    }
  });
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;

  if (hookName === 'beforeTransform') {
    // Reverse order keeps not-yet-processed sections in place.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue;
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue;

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Must run before Section Metadata tables are inserted (they count as content).
    collapseEmptyBreaks(element);

    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }

    removeLeadingBreak(element);
  }
}
