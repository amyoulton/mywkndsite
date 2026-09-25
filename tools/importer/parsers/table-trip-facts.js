/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-trip-facts. Base: table (no header).
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html
 * Selector: main.cmp-layout-container--fixed .contentfragment.cmp-contentfragment--elements
 *
 * Output: one row per fact, 2 cells: label | value. No header row.
 *
 * Validated against source.html:
 *   <article class="cmp-contentfragment">
 *     <h3 class="cmp-contentfragment__title">Bali Surf Camp</h3>   (not authored; dropped)
 *     <dl class="cmp-contentfragment__elements">
 *       <div class="cmp-contentfragment__element cmp-contentfragment__element--activity">
 *         <dt class="cmp-contentfragment__element-title">Activity</dt>
 *         <dd class="cmp-contentfragment__element-value">Surfing</dd>
 *       </div> ... x6
 */
function cellContent(document, el) {
  if (!el) return '';
  // Keep rich markup (links, images) when present; otherwise a clean trimmed string.
  if (el.querySelector('a, img, picture, strong, b, em, i')) {
    const wrapper = document.createElement('div');
    wrapper.append(...Array.from(el.childNodes));
    return wrapper;
  }
  return el.textContent.replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  // Iterate the per-fact wrapper; fall back to pairing dt/dd directly.
  let facts = Array.from(element.querySelectorAll('.cmp-contentfragment__element')).map((item) => ({
    label: item.querySelector('.cmp-contentfragment__element-title, dt'),
    value: item.querySelector('.cmp-contentfragment__element-value, dd'),
  }));
  if (!facts.length) {
    facts = Array.from(element.querySelectorAll('dt')).map((dt) => {
      let dd = dt.nextElementSibling;
      while (dd && dd.tagName !== 'DD') dd = dd.nextElementSibling;
      return { label: dt, value: dd };
    });
  }

  const cells = [];
  facts.forEach(({ label, value }) => {
    const labelCell = cellContent(document, label);
    const valueCell = cellContent(document, value);
    if (!labelCell && !valueCell) return;
    cells.push([labelCell || '', valueCell || '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-trip-facts', cells });
  element.replaceWith(block);
}
