/*
 * Table (Trip Facts) Block
 * Renders label/value rows as a semantic description list.
 * Each row: cell 1 = label, cell 2 = value. No header row.
 */

function hasContent(el) {
  return !!el && (el.textContent.trim() !== '' || !!el.querySelector('picture, img'));
}

function moveContent(from, to) {
  // Unwrap a lone <p> so the value/label is inline text, keep richer markup as-is.
  const only = from.children.length === 1 ? from.firstElementChild : null;
  const source = only && only.tagName === 'P' && from.textContent.trim() === only.textContent.trim()
    ? only
    : from;
  while (source.firstChild) to.append(source.firstChild);
}

export default function decorate(block) {
  const list = document.createElement('dl');
  list.className = 'table-trip-facts-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter(hasContent);
    if (!cells.length) return; // skip empty rows

    const item = document.createElement('div');
    item.className = 'table-trip-facts-item';

    const dt = document.createElement('dt');
    dt.className = 'table-trip-facts-label';
    const dd = document.createElement('dd');
    dd.className = 'table-trip-facts-value';

    if (cells.length === 1) {
      // Author omitted the label (or the value): render the single cell as a value.
      moveContent(cells[0], dd);
      item.append(dd);
    } else {
      moveContent(cells[0], dt);
      // Extra cells beyond the second are folded into the value.
      cells.slice(1).forEach((cell, idx) => {
        if (idx > 0) dd.append(document.createTextNode(' '));
        moveContent(cell, dd);
      });
      item.append(dt, dd);
    }

    list.append(item);
  });

  block.replaceChildren(list);
}
