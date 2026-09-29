import { createOptimizedPicture } from '../../scripts/aem.js';

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

/**
 * Marks a plain-text paragraph that precedes the first heading as the eyebrow ("Why Winter").
 */
function markEyebrow(content) {
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  const first = content.firstElementChild;
  if (heading && first && first !== heading && first.tagName === 'P'
    && !first.querySelector('a, picture, img')) {
    first.classList.add('columns-intro-eyebrow');
  }
}

function decorateRow(row) {
  row.classList.add('columns-intro-row');
  const cells = [...row.children].filter((cell) => {
    if (hasContent(cell)) return true;
    cell.remove();
    return false;
  });

  const imageCell = cells.find((cell) => cell.querySelector('picture, img')
    && !cell.textContent.trim());
  const textCells = cells.filter((cell) => cell !== imageCell);

  const [panel, ...rest] = textCells;
  if (panel) {
    rest.forEach((cell) => {
      panel.append(...cell.childNodes);
      cell.remove();
    });
    panel.className = 'columns-intro-content';
    markEyebrow(panel);
    row.prepend(panel);
  }

  if (imageCell) {
    imageCell.className = 'columns-intro-image';
    imageCell.querySelectorAll('img').forEach((img) => {
      const optimized = createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 900px)', width: '1040' },
        { width: '750' },
      ]);
      (img.closest('picture') || img).replaceWith(optimized);
    });
    row.append(imageCell);
  } else {
    row.classList.add('columns-intro-no-image');
  }
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    if (!hasContent(row)) {
      row.remove();
      return;
    }
    decorateRow(row);
  });
}
