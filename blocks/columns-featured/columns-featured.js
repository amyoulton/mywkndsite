import { createOptimizedPicture } from '../../scripts/aem.js';

// No option classes yet; any extra classes authors add are left untouched.

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

/**
 * Marks a leading paragraph that precedes the first heading as the pretitle
 * ("Featured Article"). Only plain-text paragraphs qualify, so a CTA or image is never tagged.
 */
function markPretitle(content) {
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return;
  const first = content.firstElementChild;
  if (first && first !== heading && first.tagName === 'P' && !first.querySelector('a, picture, img')) {
    first.classList.add('columns-featured-pretitle');
  }
}

/**
 * Marks paragraphs that hold nothing but a single link as the CTA ("Full Article"),
 * so the block can style it as the WKND yellow button even when it is authored as a plain link.
 */
function markCta(content) {
  [...content.querySelectorAll(':scope > p')].forEach((p) => {
    const links = p.querySelectorAll('a');
    if (links.length !== 1) return;
    const link = links[0];
    if (link.textContent.trim() && link.textContent.trim() === p.textContent.trim()) {
      p.classList.add('columns-featured-cta');
    }
  });
}

function decorateRow(row) {
  row.classList.add('columns-featured-row');
  const cells = [...row.children].filter((cell) => {
    if (hasContent(cell)) return true;
    cell.remove();
    return false;
  });

  // Image cell: the first cell holding a picture (authors may swap the order).
  const imageCell = cells.find((cell) => cell.querySelector('picture, img'));
  const textCells = cells.filter((cell) => cell !== imageCell);

  if (imageCell) {
    const picture = imageCell.querySelector('picture') || imageCell.querySelector('img');
    // If the author put text next to the image in the same cell, keep that text in the panel.
    const strayText = [...imageCell.children].filter((el) => el !== picture
      && !el.contains(picture) && el.textContent.trim());
    imageCell.replaceChildren(picture);
    imageCell.className = 'columns-featured-image';
    if (strayText.length) {
      if (textCells.length) textCells[0].prepend(...strayText);
      else {
        const cell = document.createElement('div');
        cell.append(...strayText);
        row.append(cell);
        textCells.push(cell);
      }
    }
    // Keep the image first regardless of authored order; the layout places it on the left.
    row.prepend(imageCell);
  } else {
    row.classList.add('columns-featured-no-image');
  }

  // Merge any extra text cells into a single panel.
  const [panel, ...rest] = textCells;
  if (panel) {
    rest.forEach((cell) => {
      panel.append(...cell.childNodes);
      cell.remove();
    });
    panel.className = 'columns-featured-content';
    markPretitle(panel);
    markCta(panel);
  }

  row.querySelectorAll('img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '1200' },
      { width: '750' },
    ]);
    (img.closest('picture') || img).replaceWith(optimized);
  });
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
